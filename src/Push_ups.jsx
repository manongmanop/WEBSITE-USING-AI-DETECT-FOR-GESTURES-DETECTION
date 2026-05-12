import { useEffect, useRef, useState } from 'react';
import * as Pose from '@mediapipe/pose';
import * as cam from '@mediapipe/camera_utils';

export const usePushUpCamera = ({
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
  // 1. เพิ่ม state และ ref ใหม่
  const [totalCounter, setTotalCounter] = useState(0);
  const totalCounterRef = useRef(0);  // ใช้ใน pose callback (ไม่ stale closure)

  // Database refs - for storing angle data
  const angleDataRight = useRef([]);
  const angleDataLeft = useRef([]);

  // Camera and Pose refs
  const cameraRef = useRef(null);
  const poseRef = useRef(null);

  // TTS and AI refs
  // const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const ttsQueue = useRef([]);
  const isProcessingTTS = useRef(false);
  const lastTTSTriggerTotal = useRef(0);
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
    } else if (angle >= 60 && angle <= 80) {
      return '#00ff00ff'; // Green
    } else if ((angle > 60 && angle < 160) || angle < 80) {
      return '#FFFF00'; // Yellow
    }
    return '#ffffffff'; // White
  };

  const getColorForAngleknee = (angle) => {
    if (angle < 160) {
      return '#ff0000ff'; // Red
    } else if (angle >= 161 && angle <= 180) {
      return '#00ff00ff'; // Green
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

  // OpenAI Chat Completions API call (replaces Gemini)
  const callOpenAIAPI = async (angle) => {
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

  // Process angle with OpenAI and TTS
  const processGeminiAndTTS = async (angle) => {
    try {
      const responseText = await callOpenAIAPI(angle);
      if (responseText) {
        ttsQueue.current.push({ text: responseText });
        processTTSQueue();
      }
    } catch (error) {
      console.error('Error in OpenAI or TTS:', error);
    }
  };

  // Start rest period
  const startRestPeriod = () => {
    setResting(true);
    setRestTimeRemaining(setRestTime);
    restEndTime.current = Date.now() + (setRestTime * 1000);
    setCounterLeft(0);
    setCounterRight(0);
    setTotalCounter(0);              // ← reset state
    totalCounterRef.current = 0;    // ← reset ref ด้วย (สำคัญ!)
    lastTTSTriggerTotal.current = 0;  // ← reset ด้วย
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
    if (totalCounter / 1.81 >= targetReps && !workoutComplete) {
      console.log('Set complete! Total reps:', totalCounter);
      console.log('counterLeft:', counterLeft, 'counterRight:', counterRight);
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
  }, [totalCounter, targetReps, sets, targetSets, workoutComplete]);
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
    // Left leg
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

                // Left arm processing
                const shoulderLeft = landmarks[11];
                const elbowLeft = landmarks[13];
                const wristLeft = landmarks[15];

                const hipLeft = landmarks[23];
                const kneeLeft = landmarks[25];
                const ankleLeft = landmarks[27];

                if (shoulderLeft && elbowLeft && wristLeft) {
                  const angleLeft = calculateAngle(shoulderLeft, elbowLeft, wristLeft);
                  const hipkneeankleLeft = calculateAngle(hipLeft, kneeLeft, ankleLeft);

                  const colorLeft = getColorForAngle(angleLeft);
                  const hipkneeankleLeftcolorLeft = getColorForAngleknee(hipkneeankleLeft);
                  drawArmConnections(canvasCtx, [shoulderLeft, elbowLeft, wristLeft], {
                    color: colorLeft,
                    lineWidth: 4
                  });

                  drawSpecificLandmarks(canvasCtx, [shoulderLeft, elbowLeft, wristLeft], {
                    color: colorLeft,
                    radius: 8
                  });

                  drawArmConnections(canvasCtx, [hipLeft, kneeLeft, ankleLeft], {
                    color: hipkneeankleLeftcolorLeft,
                    lineWidth: 4
                  });

                  drawSpecificLandmarks(canvasCtx, [hipLeft, kneeLeft, ankleLeft], {
                    color: hipkneeankleLeftcolorLeft,
                    radius: 8
                  });

                  // กลับด้านเฉพาะ text
                  canvasCtx.scale(-1, 1);

                  canvasCtx.fillStyle = '#FFFFFF';
                  canvasCtx.font = '20px Arial';

                  canvasCtx.fillText(
                    `LEFT: ${hipkneeankleLeft.toFixed(2)}°`,
                    -(kneeLeft.x * canvasRef.current.width - 50),
                    kneeLeft.y * canvasRef.current.height - 10
                  );

                  canvasCtx.fillStyle = '#FFFFFF';
                  canvasCtx.font = '20px Arial';

                  canvasCtx.fillText(
                    `LEFT: ${angleLeft.toFixed(2)}°`,
                    -(elbowLeft.x * canvasRef.current.width - 50),
                    elbowLeft.y * canvasRef.current.height - 10
                  );

                  // Left arm curl logic with hold timer
                  if (angleLeft > 160 && hipkneeankleLeft < 160) {
                    stageLeft.current = "up";
                    isTimingLeft.current = false;
                    holdTimeLeft.current = 0;
                  } else if (angleLeft >= 60 && angleLeft <= 80 && hipkneeankleLeft >= 161 && hipkneeankleLeft <= 180 && stageLeft.current === "up") {
                    if (!isTimingLeft.current) {
                      timerStartLeft.current = Date.now();
                      isTimingLeft.current = true;
                    }

                    const currentHoldTime = (Date.now() - timerStartLeft.current) / 1000;
                    const totalHoldTime = holdTimeLeft.current + currentHoldTime;

                    // 2. Left arm — เปลี่ยน counter block
                    if (totalHoldTime >= holdTimeRequiredLeft.current) {
                      stageLeft.current = "down";
                      totalCounterRef.current += 1;          // ← เพิ่ม total
                      const total = totalCounterRef.current;

                      setCounterLeft(prev => {
                        const newCounter = prev + 1;
                        angleDataLeft.current.push({
                          counter_left: newCounter,
                          angle: Math.round(angleLeft * 100) / 100,
                          timestamp: new Date().toISOString()
                        });
                        if (onRepComplete) onRepComplete('left', newCounter);
                        return newCounter;
                      });

                      setTotalCounter(total);               // ← sync state

                      if (total % 3 === 0 && total !== lastTTSTriggerTotal.current) {
                        lastTTSTriggerTotal.current = total;
                        processGeminiAndTTS(Math.round(angle));
                      }

                      isTimingLeft.current = false;
                      holdTimeLeft.current = 0;
                    }
                  } else if ((angleLeft > 60 && angleLeft < 160) || angleLeft < 80) {
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

                const hipRight = landmarks[24];
                const kneeRight = landmarks[26];
                const ankleRight = landmarks[28];

                if (shoulderRight && elbowRight && wristRight) {
                  const angleRight = calculateAngle(shoulderRight, elbowRight, wristRight);
                  const hipkneeankleRight = calculateAngle(hipRight, kneeRight, ankleRight);

                  const colorRight = getColorForAngle(angleRight);
                  const hipkneeanklecolorRight = getColorForAngleknee(hipkneeankleRight);

                  drawArmConnections(canvasCtx, [shoulderRight, elbowRight, wristRight], {
                    color: colorRight,
                    lineWidth: 4
                  });

                  drawSpecificLandmarks(canvasCtx, [shoulderRight, elbowRight, wristRight], {
                    color: colorRight,
                    radius: 8
                  });

                  drawArmConnections(canvasCtx, [hipRight, kneeRight, ankleRight], {
                    color: hipkneeanklecolorRight,
                    lineWidth: 4
                  });

                  drawSpecificLandmarks(canvasCtx, [hipRight, kneeRight, ankleRight], {
                    color: hipkneeanklecolorRight,
                    radius: 8
                  });


                  // Right arm curl logic
                  if (angleRight > 160 && hipkneeankleRight < 160) {
                    stageRight.current = "up";
                    isTimingRight.current = false;
                    holdTimeRight.current = 0;
                  } else if (angleRight >= 60 && angleRight <= 80 && hipkneeankleRight >= 161 && hipkneeankleRight <= 180 && stageRight.current === "up") {
                    if (!isTimingRight.current) {
                      timerStartRight.current = Date.now();
                      isTimingRight.current = true;
                    }

                    const currentHoldTime = (Date.now() - timerStartRight.current) / 1000;
                    const totalHoldTime = holdTimeRight.current + currentHoldTime;

                    // 3. Right arm — เพิ่ม total และ TTS (ที่ตอนนี้ comment ออกไว้)
                    if (totalHoldTime >= holdTimeRequiredRight.current) {
                      stageRight.current = "down";
                      totalCounterRef.current += 1;          // ← เพิ่ม total
                      const total = totalCounterRef.current;

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

                      setTotalCounter(total);               // ← sync state

                      if (total % 3 === 0 && total !== lastTTSTriggerTotal.current) {
                        lastTTSTriggerTotal.current = total;
                        processGeminiAndTTS(Math.round(angle));
                      }

                      isTimingRight.current = false;
                      holdTimeRight.current = 0;
                    }
                  } else if ((angleRight > 60 && angleRight < 160) || angleRight < 80) {
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
    totalCounter,   // ← เพิ่ม
    sets,
    isSpeaking,
    workoutComplete,
    saveStatus,
    angleDataLeft: angleDataLeft.current,
    angleDataRight: angleDataRight.current,

  };
};

export default usePushUpCamera;