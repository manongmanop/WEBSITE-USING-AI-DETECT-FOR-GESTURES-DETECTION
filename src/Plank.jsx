import { useEffect, useRef, useState } from 'react';
import * as Pose from '@mediapipe/pose';
import * as cam from '@mediapipe/camera_utils';

export const usePlankCamera = ({
  videoRef,
  canvasRef,
  isActive,
  targetTime = 1,       // Target hold time per set (seconds)
  onSetComplete,
  onWorkoutComplete,
  onAIStatusUpdate,
}) => {
  // ── State ────────────────────────────────────────────────────────────────────
  const [plankState, setPlankState] = useState('not_in_position'); // 'in_position' | 'not_in_position'
  const [elapsedTime, setElapsedTime] = useState(0);   // total accumulated correct-position time (sec)
  const [workoutComplete, setWorkoutComplete] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [landmarksValid, setLandmarksValid] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [connectionColor, setConnectionColor] = useState('#ffffff');

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const plankStartTimeRef = useRef(null);   // timestamp when current in_position started
  const plankElapsedRef = useRef(0);      // accumulated time before current in_position stint

  // Gemini / TTS
  // const openaiApiKey        = import.meta.env.VITE_OPENAI_API_KEY;
  const ttsQueue = useRef([]);
  const isProcessingTTS = useRef(false);
  const lastGeminiTime = useRef(Date.now());
  const geminiInterval = 24_000; // ms

  // DB angle log
  const angleDataRef = useRef([]);
  const lastSaveTimeRef = useRef(Date.now());
  const saveInterval = 6_000; // ms

  // Camera / Pose
  const cameraRef = useRef(null);
  const poseRef = useRef(null);

  const instructions =
    "Voice: Calm, steady, and encouraging. Speak slowly and clearly to help the user stay focused during a plank hold.";

  const chatHistory = useRef([
    {
      role: 'user',
      parts: [{ text: 'ค่ามุมองศา shoulder-hip-ankle ที่ดีสำหรับ plank อยู่ที่ประมาณ 150-170 องศา หากค่าอยู่นอกช่วงนี้ให้แนะนำให้ผู้ใช้ปรับท่า นอกจากนี้ระบบยังตรวจสอบว่าร่างกายยกขึ้นจากพื้นจริงหรือไม่ และตัวต้องอยู่ในแนวนอน ถ้า isElevated=false แปลว่านอนราบหรือโกงท่า ถ้า isHorizontal=false แปลว่ายืนเอียง' }],
    },
    {
      role: 'model',
      parts: [{ text: 'เข้าใจแล้ว! ช่วง 150-170 องศาคือ plank ที่ดี ถ้าเกิน 170 แปลว่าสะโพกยกสูงเกินไป ถ้าต่ำกว่า 150 แปลว่าสะโพกห้อยต่ำไป และถ้า isElevated=false แสดงว่าผู้ใช้นอนราบกับพื้นหรือไม่ได้ยกตัวขึ้น ฉันจะให้คำแนะนำทันที!' }],
    },
  ]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const calculateAngle = (a, b, c) => {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  };

  // ── Anti-cheat thresholds (normalized 0-1 coords, y increases downward) ───────
  // Shoulder must be at least this far *above* the ankle in Y to confirm elevation.
  // Lying flat → ankle.y ≈ shoulder.y → elevation ≈ 0 → fails immediately.
  const MIN_SHOULDER_ELEVATION = 0.08; // 8% of frame height (~38 px at 480 p)
  const MIN_HIP_ELEVATION      = 0.05; // 5% of frame height
  // |shoulderY - hipY| must stay small: body should be horizontal, not standing/tilted.
  const MAX_BODY_TILT = 0.18; // 18% of frame height

  // Returns { isElevated, isHorizontal } for anti-cheat checks
  const getBodyValidation = (shoulder, hip, ankle) => {
    const shoulderElevation = ankle.y - shoulder.y; // >0 → shoulder above ankle
    const hipElevation      = ankle.y - hip.y;      // >0 → hip above ankle
    const bodyTilt          = Math.abs(shoulder.y - hip.y); // small → body is horizontal
    return {
      isElevated:   shoulderElevation > MIN_SHOULDER_ELEVATION && hipElevation > MIN_HIP_ELEVATION,
      isHorizontal: bodyTilt < MAX_BODY_TILT,
    };
  };

  const getConnectionColor = (angle, isElevated, isHorizontal) => {
    if (!isElevated || !isHorizontal) return '#ff0000';  // 🔴 Lying flat / cheating
    if (angle > 150 && angle < 170)   return '#00ff00';  // ✅ Green – correct
    if ((angle >= 170 && angle <= 180) || (angle >= 140 && angle <= 150)) return '#FFFF00'; // 🟡 Borderline
    return '#ff0000'; // 🔴 Red – bad angle
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ── Save session ─────────────────────────────────────────────────────────────
  const saveSessionData = async (sessionData) => {
    try {
      setSaveStatus('Saving...');
      const res = await fetch('http://127.0.0.1:8000/api/save-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });
      if (res.ok) {
        setSaveStatus('✓ Data saved successfully!');
      } else {
        setSaveStatus('✗ Failed to save data');
      }
    } catch (err) {
      console.error('Error saving data:', err);
      setSaveStatus('✗ Error: ' + err.message);
    } finally {
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // ── Gemini API ───────────────────────────────────────────────────────────────
  const callGeminiAPI = async (angle) => {
    try {
      const userMessage = { role: "user", content: Math.round(angle).toString() };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.8,
          max_tokens: 256,
          messages: [
            { role: "system", content: instructions },
            ...chatHistory.current,
            userMessage
          ]
        })
      });

      if (!response.ok) throw new Error(`OpenAI API request failed: ${response.status}`);

      const data = await response.json();
      const responseText = data.choices[0].message.content;

      // อัปเดต chatHistory ใน OpenAI format (role: "user" / "assistant")
      chatHistory.current.push(
        userMessage,
        { role: "assistant", content: responseText }
      );

      return responseText;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return null;
    }
  };

  // ── TTS API ──────────────────────────────────────────────────────────────────
  // OpenAI TTS API call — uses Web Audio API to avoid CSP blob: media-src block
  const callTTSAPI = async (text) => {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          voice: 'ballad',
          input: text,
          instructions,
          speed: 1.5,
          response_format: 'mp3'
        })
      });

      if (!response.ok) throw new Error('OpenAI TTS API request failed');

      const arrayBuffer = await response.arrayBuffer();

      // Use Web Audio API — not subject to media-src CSP
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      return new Promise((resolve) => {
        const source = audioCtx.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(audioCtx.destination);
        source.onended = () => {
          audioCtx.close();
          resolve();
        };
        source.start(0);
      });
    } catch (error) {
      console.error('TTS API Error:', error);
    }
  };

  const processTTSQueue = async () => {
    if (isProcessingTTS.current || ttsQueue.current.length === 0) return;
    isProcessingTTS.current = true;
    setIsSpeaking(true);
    while (ttsQueue.current.length > 0) {
      const { text } = ttsQueue.current.shift();
      await callTTSAPI(text);
    }
    isProcessingTTS.current = false;
    setIsSpeaking(false);
  };

  const processGeminiAndTTS = async (angle) => {
    try {
      const text = await callGeminiAPI(angle);
      if (text) {
        ttsQueue.current.push({ text });
        processTTSQueue();
      }
    } catch (err) {
      console.error('Gemini/TTS error:', err);
    }
  };

  // ── Draw helpers ─────────────────────────────────────────────────────────────
  const drawBodyConnections = (ctx, points, color) => {
    if (!points || points.length < 3) return;
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(points[0].x * W, points[0].y * H);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * W, points[i].y * H);
    }
    ctx.stroke();
    ctx.restore();
  };

  const drawLandmarkDots = (ctx, points, color, radius = 8) => {
    if (!points) return;
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    ctx.save();
    ctx.fillStyle = color;
    for (const p of points) {
      if (p) {
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  const drawStatusBox = (ctx, elapsed, total, state, progress, color) => {
    const W = ctx.canvas.width;

    // Background box
    ctx.save();
    ctx.fillStyle = 'rgba(50,50,50,0.8)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillRect(10, 10, 300, 120);
    ctx.strokeRect(10, 10, 300, 120);

    // Time text
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText(`TIME: ${formatTime(elapsed)} / ${formatTime(total)}`, 20, 60);

    // State text
    ctx.fillStyle = color;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(state, 20, 90);

    // Progress bar
    const barW = 280;
    const filled = Math.min(progress, 1) * barW;
    ctx.fillStyle = 'rgba(50,50,50,0.9)';
    ctx.fillRect(10, 140, barW, 20);
    ctx.fillStyle = color;
    ctx.fillRect(10, 140, filled, 20);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(10, 140, barW, 20);
    ctx.restore();
  };

  // ── Main camera + pose effect ─────────────────────────────────────────────────
  useEffect(() => {
    console.log('targetTime received:', targetTime);
    if (!isActive || !videoRef.current || !canvasRef.current || workoutComplete) return;

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();

          const pose = new Pose.Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
          });
          poseRef.current = pose;
          pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7,
          });

          const onResults = (results) => {
            if (!canvasRef.current) return;
            const ctx = canvasRef.current.getContext('2d');
            ctx.save();
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Mirror image
            ctx.translate(canvasRef.current.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.restore();

            if (!results.poseLandmarks) {
              setLandmarksValid(false);
              return;
            }

            const lm = results.poseLandmarks;

            // // Required landmark indices for plank
            // const required = [11, 12, 23, 24, 27, 28, 25, 26]; // shoulders, hips, ankles, knees
            // const valid = required.every((i) => lm[i] && lm[i].visibility > 0.5);
            // setLandmarksValid(valid);
            // if (!valid) return;

            // Landmark aliases (mediapipe is mirrored, so LEFT in code = right side visually)
            const leftShoulder = lm[11];
            const rightShoulder = lm[12];
            const leftHip = lm[23];
            const rightHip = lm[24];
            const leftKnee = lm[25];
            const rightKnee = lm[26];
            const leftAnkle = lm[27];
            const rightAnkle = lm[28];

            // Calculate shoulder-hip-ankle angle (both sides, then average)
            const angleRight = calculateAngle(rightShoulder, rightHip, rightAnkle);
            const angleLeft = calculateAngle(leftShoulder, leftHip, leftAnkle);
            const angleAvg = (angleRight + angleLeft) / 2;
            setCurrentAngle(Math.round(angleAvg));

            // ── Anti-cheat: hip-knee-ankle angle check ────────────
            const hipkneeankleLeft = calculateAngle(leftHip, leftKnee, leftAnkle);
            const hipkneeankleRight = calculateAngle(rightHip, rightKnee, rightAnkle);
            const kneeColor =
              hipkneeankleLeft >= 161 && hipkneeankleLeft <= 180 &&
              hipkneeankleRight >= 161 && hipkneeankleRight <= 180
                ? '#00ff00'
                : '#ff0000';

            // ── Anti-cheat: body elevation + orientation check ────────────
            // Average both sides so partial-visibility frames still work
            const avgShoulder = {
              x: (rightShoulder.x + leftShoulder.x) / 2,
              y: (rightShoulder.y + leftShoulder.y) / 2,
            };
            const avgHip = {
              x: (rightHip.x + leftHip.x) / 2,
              y: (rightHip.y + leftHip.y) / 2,
            };
            const avgAnkle = {
              x: (rightAnkle.x + leftAnkle.x) / 2,
              y: (rightAnkle.y + leftAnkle.y) / 2,
            };
            const { isElevated, isHorizontal } = getBodyValidation(avgShoulder, avgHip, avgAnkle);

            const color = getConnectionColor(angleAvg, isElevated, isHorizontal);
            setConnectionColor(color);

            // ── Draw skeleton (body lines only, no face) ─────────────────
            ctx.save();
            ctx.translate(canvasRef.current.width, 0);
            ctx.scale(-1, 1);

            drawBodyConnections(ctx, [rightShoulder, rightHip, rightKnee, rightAnkle], color);
            drawBodyConnections(ctx, [leftShoulder, leftHip, leftKnee, leftAnkle], color);
            drawLandmarkDots(ctx,
              [rightShoulder, rightHip, rightKnee, rightAnkle,
                leftShoulder, leftHip, leftKnee, leftAnkle],
              color
            );
            // Hip → Knee → Ankle (knee angle color: green/red only)
            drawBodyConnections(ctx, [rightHip, rightKnee, rightAnkle], kneeColor);
            drawBodyConnections(ctx, [leftHip, leftKnee, leftAnkle], kneeColor);
            drawLandmarkDots(ctx, [rightKnee, rightAnkle, leftKnee, leftAnkle], kneeColor);

            // Angle label near hips midpoint
            const midX = ((rightHip.x + leftHip.x) / 2) * canvasRef.current.width;
            const midY = ((rightHip.y + leftHip.y) / 2) * canvasRef.current.height - 10;
            ctx.fillStyle = color;
            ctx.font = 'bold 18px monospace';
            ctx.fillText(`${Math.round(angleAvg)}°`, midX, midY);

            ctx.restore();

            // ── Plank state machine ──────────────────────────────────────
            const now = Date.now();
            // All three gates must pass: angle range + body elevated + body horizontal
            const isCorrect = angleAvg > 150 && angleAvg < 170 && isElevated && isHorizontal  && hipkneeankleLeft >= 161 && hipkneeankleLeft <= 180 && hipkneeankleRight >= 161 && hipkneeankleRight <= 180;

            let currentElapsed = plankElapsedRef.current;
            if (plankStartTimeRef.current !== null) {
              currentElapsed += (now - plankStartTimeRef.current) / 1000;
            }

            if (isCorrect) {
              if (plankStartTimeRef.current === null) {
                plankStartTimeRef.current = now;
              }
            } else {
              if (plankStartTimeRef.current !== null) {
                plankElapsedRef.current += (now - plankStartTimeRef.current) / 1000;
                plankStartTimeRef.current = null;
              }
            }

            const totalElapsed = plankElapsedRef.current +
              (plankStartTimeRef.current ? (now - plankStartTimeRef.current) / 1000 : 0);

            setElapsedTime(totalElapsed);
            setPlankState(isCorrect ? 'in_position' : 'not_in_position');

            // ✅ แจ้งสถานะท่าทางกลับไปยังตัวแม่เพื่อคุมเวลา
            if (onAIStatusUpdate) {
              onAIStatusUpdate(isCorrect);
            }

            // ── Draw status box ──────────────────────────────────────────
            ctx.save();
            let stateLabel;
            if (isCorrect) {
              stateLabel = 'CORRECT POSITION';
            } else if (!isElevated) {
              stateLabel = 'LIFT YOUR BODY OFF FLOOR';
            } else if (!isHorizontal) {
              stateLabel = 'KEEP BODY HORIZONTAL';
            } else {
              stateLabel = 'INCORRECT ANGLE';
            }
            const boxColor = isCorrect ? '#00ff00' : '#ff0000';
            drawStatusBox(ctx, totalElapsed, targetTime, stateLabel, totalElapsed / targetTime, boxColor);
            ctx.restore();

            // ── Periodic DB save ─────────────────────────────────────────
            if (now - lastSaveTimeRef.current >= saveInterval) {
              const minutes = Math.floor(totalElapsed / 60);
              const seconds = Math.floor(totalElapsed % 60);
              angleDataRef.current.push({
                total_time: totalElapsed,
                human_readable_time: `${minutes}:${String(seconds).padStart(2, '0')}`,
                angle: Math.round(angleAvg * 100) / 100,
              });
              lastSaveTimeRef.current = now;
            }

            // ── Periodic Gemini + TTS ────────────────────────────────────
            if (now - lastGeminiTime.current >= geminiInterval) {
              lastGeminiTime.current = now;
              processGeminiAndTTS(Math.round(angleAvg));
            }

            // ── Set complete ─────────────────────────────────────────────
            if (targetTime != null && totalElapsed >= targetTime && !workoutComplete) {
              setWorkoutComplete(true);
              plankElapsedRef.current = 0;
              plankStartTimeRef.current = null;

              const sessionData = {
                timestamp: new Date().toLocaleString('th-TH', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                }),
                set: {
                  reps: targetTime,
                  arm: { data_avg: angleDataRef.current },
                },
              };
              saveSessionData(sessionData);
              if (onWorkoutComplete) onWorkoutComplete(sessionData);
            }
          };

          pose.onResults(onResults);

          const camera = new cam.Camera(videoRef.current, {
            onFrame: async () => { await pose.send({ image: videoRef.current }); },
            width: 640,
            height: 480,
          });
          cameraRef.current = camera;
          camera.start();
        };
      } catch (err) {
        console.error('Camera error:', err);
        // alert removed to use custom popup in WorkoutPlayer
      }
    };

    initCamera();

    return () => {
      console.log('🧹 Cleaning up plank camera...');

      if (cameraRef.current) {
        try { cameraRef.current.stop(); } catch (_) { }
        cameraRef.current = null;
      }
      if (poseRef.current) {
        try { poseRef.current.close(); } catch (_) { }
        poseRef.current = null;
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
  }, [isActive, targetTime, workoutComplete]);

  // ── Public API ────────────────────────────────────────────────────────────────
  return {
    plankState,
    elapsedTime,
    workoutComplete,
    saveStatus,
    isSpeaking,
    landmarksValid,
    currentAngle,
    connectionColor,
    angleData: angleDataRef.current,
    formatTime,
  };
};

export default usePlankCamera;