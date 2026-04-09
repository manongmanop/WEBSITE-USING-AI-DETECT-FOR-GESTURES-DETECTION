import { useEffect, useRef, useState } from 'react';
import * as Pose from '@mediapipe/pose';
import * as cam from '@mediapipe/camera_utils';
const SOUND_MAP = {
  // Posture tilt
  'Leaning Left': '/sounds/Leaning_Right.mp3',
  'Leaning Right': '/sounds/Leaning_Left.mp3',
  // 'Straight': '/sounds/Straight.mp3',
  // Arm position
  'ArmWide': '/sounds/Wide.mp3',
  'ArmNarrow': '/sounds/Narrow.mp3',
  // 'ArmNeutral': '/sounds/Neutral.mp3',
  // Knee / stance position
  'StanceWide': '/sounds/Stance_Wide.mp3',
  'StanceNarrow': '/sounds/Stance_Narrow.mp3',
  // 'StanceNormal': '/sounds/Stance_Normal.mp3',
  // Landmarks
  'NoLandmarks': '/sounds/NoLandmarks.mp3',
  'Landmarks': '/sounds/Landmarks.mp3',
};

const createSoundPlayer = () => {
  const cache = {};
  const cooldowns = {};
  const COOLDOWN_MS = 9000;

  const play = (key) => {
    const now = Date.now();
    if (cooldowns[key] && now - cooldowns[key] < COOLDOWN_MS) return;
    cooldowns[key] = now;
    const src = SOUND_MAP[key];
    if (!src) return;
    if (!cache[key]) cache[key] = new Audio(src);
    const a = cache[key];
    a.currentTime = 0;
    a.play().catch(() => { });
  };

  return { play };
};
export const useDumbbellCamera = ({
  videoRef,
  canvasRef,
  isActive,
  targetReps = null,
  targetSets = null,
  setRestTime = null,
  onRepComplete,
  onSetComplete,
  onWorkoutComplete
}) => {
  // State variables
  const [counterLeft, setCounterLeft] = useState(0);
  const [counterRight, setCounterRight] = useState(0);
  const [sets, setSets] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [workoutComplete, setWorkoutComplete] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [postureTilt, setPostureTilt] = useState('Straight');
  const [leftArmPosition, setLeftArmPosition] = useState('Neutral');
  const [rightArmPosition, setRightArmPosition] = useState('Neutral');
  const [landmarksValid, setLandmarksValid] = useState(false);
  const [legStance, setLegStance] = useState('Normal');
  const [ankleDistance, setAnkleDistance] = useState(0);
  const [kneeDistance, setKneeDistance] = useState(0);
  const soundPlayer = useRef(createSoundPlayer());
  // Previous state refs for change-based sound triggers
  const prevTilt = useRef('Straight');
  const prevLeftPos = useRef('Neutral');
  const prevRightPos = useRef('Neutral');
  const prevStance = useRef('Normal');
  const prevLandmarks = useRef(false);

  // Refs for tracking state
  const stageLeft = useRef(null);
  const stageRight = useRef(null);
  const isTimingLeft = useRef(false);
  const isTimingRight = useRef(false);
  const holdTimeLeft = useRef(0);
  const holdTimeRight = useRef(0);
  const timerStartLeft = useRef(0);
  const timerStartRight = useRef(0);
  const holdTimeRequiredLeft = useRef(0.1);
  const holdTimeRequiredRight = useRef(0.1);
  const restEndTime = useRef(0);
  const restInterval = useRef(null);

  // Database refs - for storing angle data
  const angleDataRight = useRef([]);
  const angleDataLeft = useRef([]);

  // Camera and Pose refs
  const cameraRef = useRef(null);
  const poseRef = useRef(null);

  // TTS and AI refs
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const ttsQueue = useRef([]);
  const isProcessingTTS = useRef(false);
  const instructions = "Voice: High-energy, upbeat, and encouraging, projecting enthusiasm and motivation.\n\nPunctuation: Short, punchy sentences with strategic pauses to maintain excitement and clarity.\n\nDelivery: Fast-paced and dynamic, with rising intonation to build momentum and keep engagement high.\n\nPhrasing: Action-oriented and direct, using motivational cues to push participants forward.\n\nTone: Positive, energetic, and empowering, creating an atmosphere of encouragement and achievement.";
  const chatHistory = useRef([
    {
      role: "user",
      parts: [{ text: "ค่ามุมองศาอยู่ที่ 160 มุมองศา หากค่ามากกว่าหรือน้อยกว่าให้ส่งข้อความบอกให้เพิ่มหรือลดตามจำนวนที่ขาดหรือเกิน" }]
    },
    {
      role: "model",
      parts: [{ text: "มุม 160 องศา! ดีมาก! ถ้าต้องการปรับค่า, ทำตามนี้เลย: * **ค่าเกิน:** ลดลง [จำนวนที่เกิน] องศา * **ค่าขาด:** เพิ่มขึ้น [จำนวนที่ขาด] องศา คุณทำได้! ลุย!" }]
    },
    {
      role: "user",
      parts: [{ text: "150" }]
    },
    {
      role: "model",
      parts: [{ text: "เหลืออีก 10 องศา! เพิ่มอีกหน่อยนะ!" }]
    },
    {
      role: "user",
      parts: [{ text: "147" }]
    },
    {
      role: "model",
      parts: [{ text: "เก่งมาก! เกินมา 3 องศา! ลดลงอีกหน่อย แล้วคุณจะไปถึงเป้าหมาย!" }]
    },
    {
      role: "user",
      parts: [{ text: "130" }]
    },
    {
      role: "model",
      parts: [{ text: "โอ้โห! เกินมาเยอะเลย! ลดลง 70 องศานะ! สู้ๆ!" }]
    },
    {
      role: "user",
      parts: [{ text: "159" }]
    },
    {
      role: "model",
      parts: [{ text: "ยอดเยี่ยม! อีกนิดเดียว! เพิ่มอีก 1 องศา คุณก็ถึงเป้าหมายแล้ว!" }]
    }
  ]);
  // ── Position guide overlay (shown when landmarks invalid) ──────────────
  const drawPositionGuide = (ctx) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    ctx.fillRect(0, 0, w, h);

    // Pulsing border
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
    ctx.strokeStyle = `rgba(255,200,0,${0.55 + 0.45 * pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 6]);
    ctx.strokeRect(w * 0.08, h * 0.03, w * 0.84, h * 0.94);
    ctx.setLineDash([]);

    // ── Stick figure: squat stance ──────────────────────────────────────
    const cx = w / 2;
    const top = h * 0.05;
    ctx.strokeStyle = 'rgba(255,220,60,0.88)';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255,200,0,0.5)';
    ctx.shadowBlur = 12;

    // Head
    ctx.beginPath();
    ctx.arc(cx, top + h * 0.055, h * 0.048, 0, Math.PI * 2);
    ctx.stroke();

    // Torso
    ctx.beginPath();
    ctx.moveTo(cx, top + h * 0.105);
    ctx.lineTo(cx, top + h * 0.35);
    ctx.stroke();

    // Arms (spread wide for squat)
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.06, top + h * 0.115);
    ctx.lineTo(cx - w * 0.22, top + h * 0.18);
    ctx.lineTo(cx - w * 0.26, top + h * 0.30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.06, top + h * 0.115);
    ctx.lineTo(cx + w * 0.22, top + h * 0.18);
    ctx.lineTo(cx + w * 0.26, top + h * 0.30);
    ctx.stroke();

    // Squat legs (bent at ~130° hip-knee angle)
    // // Left leg
    // ctx.beginPath();
    // ctx.moveTo(cx, top + h * 0.35);            // hip center
    // ctx.lineTo(cx - w * 0.12, top + h * 0.55); // left hip
    // ctx.lineTo(cx - w * 0.14, top + h * 0.74); // left knee (bent outward)
    // ctx.lineTo(cx - w * 0.12, top + h * 0.90); // left ankle
    // ctx.stroke();
    // // Right leg
    // ctx.beginPath();
    // ctx.moveTo(cx, top + h * 0.35);
    // ctx.lineTo(cx + w * 0.12, top + h * 0.55);
    // ctx.lineTo(cx + w * 0.14, top + h * 0.74);
    // ctx.lineTo(cx + w * 0.12, top + h * 0.90);
    // ctx.stroke();

    // Target zone arc hint at knee
    // ctx.strokeStyle = 'rgba(0,255,136,0.6)';
    // ctx.lineWidth = 2;
    // ctx.beginPath();
    // ctx.arc(cx - w * 0.14, top + h * 0.74, h * 0.05, -0.5, 1.5);
    // ctx.stroke();
    // ctx.beginPath();
    // ctx.arc(cx + w * 0.14, top + h * 0.74, h * 0.05, 1.6, 3.7);
    // ctx.stroke();

    // Labels
    ctx.shadowBlur = 0;

    // ✅ reset transform ก่อนวาด text
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = 'rgba(255,220,60,0.95)';
    ctx.font = `bold ${Math.round(w * 0.038)}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';

    // ❗ ใช้ w/2 แทน cx
    ctx.fillText('อยู่ในกรอบให้เห็นครึ่งตัว', w / 2, h * 0.93);

    ctx.font = `${Math.round(w * 0.026)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillText(
      '',
      w / 2,
      h * 0.965
    );

    ctx.restore(); // กลับไปใช้ transform เดิม

    ctx.restore(); // ของเดิมคุณ
  };
  const calculateAngle = (a, b, c) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  };

  const getColorForAngle = (angle) => {
    if (angle > 160) {
      return '#ff0000ff'; // Red
    } else if (angle >= 20 && angle <= 40) {
      return '#00ff00ff'; // Green
    } else if ((angle > 40 && angle < 160) || angle < 20) {
      return '#FFFF00'; // Yellow
    }
    return '#ffffffff'; // White
  };

  // ฟังก์ชันตรวจสอบตำแหน่งแขน (Wide / Narrow / Neutral)
  const getArmPositionLeft = (dist) => {
    if (dist > 0.25) {
      return "Wide";
    } else if (dist < 0.08) {
      return "Narrow";
    } else {
      return "Neutral";
    }
  };

  // ฟังก์ชันตรวจสอบตำแหน่งแขน (Wide / Narrow / Neutral)
  const getArmPositionRight = (dist) => {
    if (dist > 0.25) {
      return "Wide";
    } else if (dist < 0.08) {
      return "Narrow";
    } else {
      return "Neutral";
    }
  };


  // Save session data to database
  const saveSessionData = async (sessionData) => {
    try {
      setSaveStatus('Saving...');
      const response = await fetch('http://127.0.0.1:8000/api/save-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });

      if (response.ok) {
        setSaveStatus('✓ Data saved successfully!');
        setTimeout(() => setSaveStatus(''), 3000);
        return true;
      } else {
        setSaveStatus('✗ Failed to save data');
        setTimeout(() => setSaveStatus(''), 3000);
        return false;
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setSaveStatus('✗ Error: ' + error.message);
      setTimeout(() => setSaveStatus(''), 3000);
      return false;
    }
  };

  // Gemini API call gemini-2.5-flash ใช้ตัวนี้แทนตอนนำเสนอ
  const callGeminiAPI = async (angle) => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            ...chatHistory.current,
            { role: "user", parts: [{ text: Math.round(angle).toString() }] }
          ],
          generationConfig: {
            temperature: 0.8,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 8192,
          }
        })
      });

      if (!response.ok) throw new Error('Gemini API request failed');

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;
      console.log("Gemini response text:", responseText)
      chatHistory.current.push(
        { role: "user", parts: [{ text: Math.round(angle).toString() }] },
        { role: "model", parts: [{ text: responseText }] }
      );

      return responseText;
    } catch (error) {
      console.error('Gemini API Error:', error);
      return null;
    }
  };

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
  // Process TTS queue
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

  // Process angle with Gemini and TTS
  const processGeminiAndTTS = async (angle) => {
    try {
      const responseText = await callGeminiAPI(angle);
      if (responseText) {
        ttsQueue.current.push({ text: responseText });
        processTTSQueue();
      }
    } catch (error) {
      console.error('Error in Gemini or TTS:', error);
    }
  };

  // Start rest period
  const startRestPeriod = () => {
    setResting(true);
    setRestTimeRemaining(setRestTime);
    restEndTime.current = Date.now() + (setRestTime * 1000);
    setCounterLeft(0);
    setCounterRight(0);
    restInterval.current = setInterval(() => {
      const timeLeft = Math.max(0, Math.ceil((restEndTime.current - Date.now()) / 1000));
      setRestTimeRemaining(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(restInterval.current);
        setResting(false);
      }
    }, 1000);
  };

  // Check if set is complete
  useEffect(() => {
    if (counterLeft >= targetReps && !workoutComplete) {
      setSets(prev => {
        const newSets = prev + 1;
        if (newSets >= targetSets) {
          setWorkoutComplete(true);

          // Prepare and save session data
          const sessionData = {
            timestamp: new Date().toLocaleString('th-TH', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            set: {
              target_reps: targetReps,
              target_sets: targetSets,
              completed_sets: newSets,
              arm: {
                data_right: angleDataRight.current,
                data_left: angleDataLeft.current
              }
            }
          };

          // Auto save to database
          saveSessionData(sessionData);

          if (onWorkoutComplete) {
            onWorkoutComplete(sessionData);
          }
        } else {
          startRestPeriod();
          if (onSetComplete) {
            onSetComplete(newSets);
          }
        }
        return newSets;
      });
    }
  }, [counterLeft, counterRight, targetReps, sets, targetSets, workoutComplete]);

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current || workoutComplete) {
      return;
    }

    const drawArmConnections = (ctx, points, style) => {
      if (!points || points.length < 2) return;

      ctx.save();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.lineWidth || 4;

      ctx.beginPath();
      ctx.moveTo(points[0].x * ctx.canvas.width, points[0].y * ctx.canvas.height);
      ctx.lineTo(points[1].x * ctx.canvas.width, points[1].y * ctx.canvas.height);
      ctx.lineTo(points[2].x * ctx.canvas.width, points[2].y * ctx.canvas.height);
      ctx.stroke();
      ctx.restore();
    };

    const drawSpecificLandmarks = (ctx, landmarks, style) => {
      if (!landmarks) return;

      ctx.save();
      ctx.fillStyle = style.color;

      for (const landmark of landmarks) {
        if (landmark) {
          ctx.beginPath();
          ctx.arc(
            landmark.x * ctx.canvas.width,
            landmark.y * ctx.canvas.height,
            style.radius || 5,
            0,
            2 * Math.PI
          );
          ctx.fill();
        }
      }
      ctx.restore();
    };

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.style.display = 'block';

          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            const pose = new Pose.Pose({
              locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
              }
            });

            poseRef.current = pose;

            pose.setOptions({
              modelComplexity: 1,
              smoothLandmarks: false,
              minDetectionConfidence: 0.7,
              minTrackingConfidence: 0.7
            });

            const onResults = (results) => {
              if (!canvasRef.current) return;

              const canvasCtx = canvasRef.current.getContext('2d');
              canvasCtx.save();
              canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

              canvasCtx.translate(canvasRef.current.width, 0);
              canvasCtx.scale(-1, 1);

              canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

              if (results.poseLandmarks) {
                const landmarks = results.poseLandmarks;

                // ตรวจสอบความพร้อมของจุดสำคัญ 4 จุด
                const requiredLandmarks = [
                  11, // LEFT_SHOULDER
                  12, // RIGHT_SHOULDER
                  13, // LEFT_ELBOW
                  14, // RIGHT_ELBOW
                ];

                // ตรวจสอบว่าแต่ละจุดมี visibility สูงพอ (> 0.8)
                const valid = requiredLandmarks.every(
                  idx => landmarks[idx] && landmarks[idx].visibility > 0.8
                );
                setLandmarksValid(valid);

                // ถ้า landmarks ไม่ valid ให้ข้ามการประมวลผล
                if (!valid) {
                  drawPositionGuide(canvasCtx);
                  canvasCtx.restore();
                  return;
                }

                // Get coordinates
                const leftShoulder = landmarks[11];
                const rightShoulder = landmarks[12];
                const leftElbow = landmarks[13];
                const rightElbow = landmarks[14];
                const leftWrist = landmarks[15];
                const rightWrist = landmarks[16];

                // Get lower body landmark positions
                const leftAnkle = landmarks[27];  // LEFT_ANKLE
                const rightAnkle = landmarks[28]; // RIGHT_ANKLE
                const leftHip = landmarks[23];    // LEFT_HIP
                const rightHip = landmarks[24];   // RIGHT_HIP
                const leftKnee = landmarks[25];   // LEFT_KNEE
                const rightKnee = landmarks[26];  // RIGHT_KNEE

                // คำนวณระยะทาง (normalized coordinates)
                const shoulderWristDistanceLeft = Math.abs(leftShoulder.x - leftWrist.x);
                const shoulderWristDistanceRight = Math.abs(rightShoulder.x - rightWrist.x);
                const elbowDistanceLR = Math.abs(leftElbow.x - rightElbow.x);
                const wristDistanceLR = Math.abs(leftWrist.x - rightWrist.x);
                const leftHandDist = Math.abs(leftWrist.x - leftShoulder.x);
                const rightHandDist = Math.abs(rightWrist.x - rightShoulder.x);

                // คำนวณตัวเลขแบบ normalized สำหรับส่วนล่าง
                const ankleDistanceNorm = Math.abs(leftAnkle.x - rightAnkle.x);
                const kneeDistanceNorm = Math.abs(leftKnee.x - rightKnee.x);
                const hipAnkleDistanceLeft = Math.abs(leftHip.x - leftAnkle.x);
                const hipAnkleDistanceRight = Math.abs(rightHip.x - rightAnkle.x);

                // บันทึกค่าระยะห่าง
                setAnkleDistance(ankleDistanceNorm);
                setKneeDistance(kneeDistanceNorm);

                // ตัดสินว่า stance แบบไหน (ข้อเท้า)
                let stance = "Normal";
                if (ankleDistanceNorm > 0.10) {
                  stance = "Wide";
                } else if (ankleDistanceNorm < 0.04) {
                  stance = "Narrow";
                }
                setLegStance(stance);

                // คำนวณความต่างของแกน y ระหว่างไหล่
                const shoulderDiffY = leftShoulder.y - rightShoulder.y;
                const threshold = 0.03;

                // ตัดสินว่าตัวเอียงด้านไหน
                let tilt = "Straight";
                if (shoulderDiffY > threshold) {
                  tilt = "Leaning Right";
                } else if (shoulderDiffY < -threshold) {
                  tilt = "Leaning Left";
                }
                setPostureTilt(tilt);
                if (tilt !== prevTilt.current) {
                  soundPlayer.current.play(tilt);
                  prevTilt.current = tilt;
                }
                // กำหนดสถานะตำแหน่งแขน
                const leftPosition = getArmPositionLeft(leftHandDist);
                const rightPosition = getArmPositionRight(rightHandDist);
                setLeftArmPosition(leftPosition);
                setRightArmPosition(rightPosition);

                // Left arm processing
                const shoulderLeft = landmarks[11];
                const elbowLeft = landmarks[13];
                const wristLeft = landmarks[15];

                if (shoulderLeft && elbowLeft && wristLeft) {
                  const angleLeft = calculateAngle(shoulderLeft, elbowLeft, wristLeft);
                  const colorLeft = getColorForAngle(angleLeft);

                  drawArmConnections(canvasCtx, [shoulderLeft, elbowLeft, wristLeft], {
                    color: colorLeft,
                    lineWidth: 4
                  });

                  drawSpecificLandmarks(canvasCtx, [shoulderLeft, elbowLeft, wristLeft], {
                    color: colorLeft,
                    radius: 8
                  });

                  // Left arm curl logic with hold timer
                  if (angleLeft > 160) {
                    stageLeft.current = "down";
                    isTimingLeft.current = false;
                    holdTimeLeft.current = 0;
                  } else if (angleLeft >= 20 && angleLeft <= 40 && stageLeft.current === "down") {
                    if (!isTimingLeft.current) {
                      timerStartLeft.current = Date.now();
                      isTimingLeft.current = true;
                    }

                    const currentHoldTime = (Date.now() - timerStartLeft.current) / 1000;
                    const totalHoldTime = holdTimeLeft.current + currentHoldTime;

                    if (totalHoldTime >= holdTimeRequiredLeft.current) {
                      stageLeft.current = "up";
                      setCounterLeft(prev => {
                        const newCounter = prev + 1;
                        angleDataLeft.current.push({
                          counter_left: newCounter,
                          angle: Math.round(angleLeft * 100) / 100,
                          timestamp: new Date().toISOString()
                        });

                        if (onRepComplete) onRepComplete('left', newCounter);
                        if (newCounter % 3 === 0) {
                          processGeminiAndTTS(Math.round(angleLeft));
                        }
                        return newCounter;
                      });
                      isTimingLeft.current = false;
                      holdTimeLeft.current = 0;

                    }
                  } else if ((angleLeft > 40 && angleLeft < 160) || angleLeft < 20) {
                    if (isTimingLeft.current) {
                      holdTimeLeft.current += (Date.now() - timerStartLeft.current) / 1000;
                      isTimingLeft.current = false;
                    }
                  }
                }

                // Right arm processing
                const shoulderRight = landmarks[12];
                const elbowRight = landmarks[14];
                const wristRight = landmarks[16];

                if (shoulderRight && elbowRight && wristRight) {
                  const angleRight = calculateAngle(shoulderRight, elbowRight, wristRight);
                  const colorRight = getColorForAngle(angleRight);

                  drawArmConnections(canvasCtx, [shoulderRight, elbowRight, wristRight], {
                    color: colorRight,
                    lineWidth: 4
                  });

                  drawSpecificLandmarks(canvasCtx, [shoulderRight, elbowRight, wristRight], {
                    color: colorRight,
                    radius: 8
                  });

                  // Right arm curl logic
                  if (angleRight > 160) {
                    stageRight.current = "down";
                    isTimingRight.current = false;
                    holdTimeRight.current = 0;
                  } else if (angleRight >= 20 && angleRight <= 40 && stageRight.current === "down") {
                    if (!isTimingRight.current) {
                      timerStartRight.current = Date.now();
                      isTimingRight.current = true;
                    }

                    const currentHoldTime = (Date.now() - timerStartRight.current) / 1000;
                    const totalHoldTime = holdTimeRight.current + currentHoldTime;

                    if (totalHoldTime >= holdTimeRequiredRight.current) {
                      stageRight.current = "up";
                      setCounterRight(prev => {
                        const newCounter = prev + 1;
                        angleDataRight.current.push({
                          counter_right: newCounter,
                          angle_right: Math.round(angleRight * 100) / 100,
                          timestamp: new Date().toISOString()
                        });

                        if (onRepComplete) onRepComplete('right', newCounter);

                        return newCounter;
                      });
                      isTimingRight.current = false;
                      holdTimeRight.current = 0;

                      // processGeminiAndTTS(Math.round(angleRight));
                    }
                  } else if ((angleRight > 40 && angleRight < 160) || angleRight < 20) {
                    if (isTimingRight.current) {
                      holdTimeRight.current += (Date.now() - timerStartRight.current) / 1000;
                      isTimingRight.current = false;
                    }
                  }
                }
              }
              canvasCtx.restore();
            };

            pose.onResults(onResults);

            if (videoRef.current) {
              const camera = new cam.Camera(videoRef.current, {
                onFrame: async () => {
                  await pose.send({ image: videoRef.current });
                },
                width: 640,
                height: 480
              });

              cameraRef.current = camera;
              camera.start();
            }
          };
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        // alert removed to use custom popup in WorkoutPlayer
      }
    };

    initCamera();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up camera...');

      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
          cameraRef.current = null;
        } catch (error) {
          console.error('Error stopping camera:', error);
        }
      }

      if (poseRef.current) {
        try {
          poseRef.current.close();
          poseRef.current = null;
        } catch (error) {
          console.error('Error closing pose:', error);
        }
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log('✅ Stopped track:', track.kind);
        });
        videoRef.current.srcObject = null;
      }

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      if (restInterval.current) {
        clearInterval(restInterval.current);
      }
    };
  }, [isActive, targetReps, workoutComplete]);

  return {
    counterLeft,
    counterRight,
    sets,
    isSpeaking,
    workoutComplete,
    saveStatus,
    angleDataLeft: angleDataLeft.current,
    angleDataRight: angleDataRight.current,
    postureTilt,
    leftArmPosition,
    rightArmPosition,
    landmarksValid,
    legStance,
    ankleDistance,
    kneeDistance
  };
};

export default useDumbbellCamera;