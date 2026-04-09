import { useEffect, useRef, useState } from 'react';
import * as Pose from '@mediapipe/pose';
import * as cam from '@mediapipe/camera_utils';

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

  // ✅ NEW: Invalid rep counters (นับจากท่าที่ผิด)
  const [invalidRepsLeft, setInvalidRepsLeft] = useState(0);
  const [invalidRepsRight, setInvalidRepsRight] = useState(0);

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

  // ✅ NEW: Baseline shoulder Y (บันทึกตอนท่า "down" เพื่อตรวจการยกไหล่)
  const baselineShoulderLeftY = useRef(null);
  const baselineShoulderRightY = useRef(null);

  // ✅ NEW: Current form violation messages (สำหรับ draw บน canvas)
  const formViolationsLeft = useRef([]);
  const formViolationsRight = useRef([]);

  // Database refs - for storing angle data
  const angleDataRight = useRef([]);
  const angleDataLeft = useRef([]);

  // Camera and Pose refs
  const cameraRef = useRef(null);
  const poseRef = useRef(null);

  // TTS and AI refs
  // const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  // const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const ttsQueue = useRef([]);
  const isProcessingTTS = useRef(false);
  const instructions = "Voice: High-energy, upbeat, and encouraging, projecting enthusiasm and motivation.\n\nPunctuation: Short, punchy sentences with strategic pauses to maintain excitement and clarity.\n\nDelivery: Fast-paced and dynamic, with rising intonation to build momentum and keep engagement high.\n\nPhrasing: Action-oriented and direct, using motivational cues to push participants forward.\n\nTone: Positive, energetic, and empowering, creating an atmosphere of encouragement and achievement.";
  const chatHistory = useRef([]);

  // ─────────────────────────────────────────────
  // calculateAngle — elbow angle (ไม่เปลี่ยน)
  // ─────────────────────────────────────────────
  const calculateAngle = (a, b, c) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  };

  // ─────────────────────────────────────────────
  // ✅ NEW: validateArmForm — ตรวจสอบ 4 เงื่อนไขท่าที่ถูกต้อง
  //
  // Return: { isValid: boolean, violations: string[] }
  // ─────────────────────────────────────────────
  const validateArmForm = (shoulder, elbow, wrist, hip, baselineShoulderY) => {
    const violations = [];

    // ── 1. UPPER ARM VERTICAL CHECK ──────────────────────────────────────
    // แขนท่อนบน (shoulder→elbow) ต้องห้อยลงตรงๆ ไม่แกว่งออกข้าง
    // คำนวณมุมของ upper arm จาก vertical (0° = ห้อยตรง, > 30° = แกว่งออก)
    const upperArmDx = elbow.x - shoulder.x;
    const upperArmDy = elbow.y - shoulder.y; // y เพิ่มขึ้นตามความสูง ใน image coords
    const upperArmAngleFromVertical = Math.abs(
      Math.atan2(upperArmDx, Math.abs(upperArmDy)) * 180 / Math.PI
    );
    if (upperArmAngleFromVertical > 30) {
      violations.push('⚠ Elbow flaring out');
    }

    // ── 2. ELBOW FORWARD SWING CHECK (Z-axis) ────────────────────────────
    // MediaPipe z: ค่า negative = ใกล้กล้อง
    // ถ้า elbow.z < shoulder.z อย่างมีนัย = ข้อศอกแกว่งไปข้างหน้า
    if (elbow.z !== undefined && shoulder.z !== undefined) {
      const elbowForwardDelta = shoulder.z - elbow.z; // บวก = ข้อศอกใกล้กล้องกว่าไหล่
      if (elbowForwardDelta > 0.40) {
        violations.push('Elbow swinging forward');
      }
    }

    // ── 3. SHOULDER ELEVATION CHECK ──────────────────────────────────────
    // ไหล่ต้องไม่ยกขึ้นช่วยยก — เทียบกับ baseline Y ที่บันทึกตอน stage "down"
    // y ลดลง = สูงขึ้นใน image space (normalized coords)
    if (baselineShoulderY !== null) {
      const shoulderRise = baselineShoulderY - shoulder.y; // บวก = ไหล่ยกขึ้น
      if (shoulderRise > 0.060) { // ~4.5% ของความสูงเฟรม
        violations.push('Shoulder shrugging');
      }
    }

    // ── 4. WRIST LATERAL DEVIATION CHECK ─────────────────────────────────
    // ข้อมือต้องตรงกับข้อศอก ไม่บิดออกข้าง
    // คำนวณ forearm direction แล้วดู wrist deviation จาก elbow-X
    const forearmLength = Math.sqrt(
      Math.pow(wrist.x - elbow.x, 2) + Math.pow(wrist.y - elbow.y, 2)
    );
    const wristLateralOffset = Math.abs(wrist.x - elbow.x);
    // ถ้า wrist ออกข้างมากกว่า 40% ของความยาว forearm = บิดข้อมือ
    if (forearmLength > 0.01 && wristLateralOffset / forearmLength > 0.50) {
      violations.push('⚠ Wrist bending sideways');
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  };

  const getColorForAngle = (angle) => {
    if (angle > 160) return '#ff0000ff';       // Red   = ท่า down
    if (angle >= 20 && angle <= 40) return '#00ff00ff'; // Green = ท่า up
    if ((angle > 40 && angle < 160) || angle < 20) return '#FFFF00'; // Yellow = กลางทาง
    return '#ffffffff';
  };

  // ✅ NEW: Draw form violation warnings บน canvas
  const drawFormWarnings = (ctx, violations, anchorX, anchorY) => {
    if (!violations || violations.length === 0) return;
    ctx.save();
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    violations.forEach((msg, i) => {
      const y = anchorY + i * 20;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(anchorX - 4, y - 14, ctx.measureText(msg).width + 8, 18);
      ctx.fillStyle = '#FF4444';
      ctx.fillText(msg, anchorX, y);
    });
    ctx.restore();
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

  // Gemini API call
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
          generationConfig: { temperature: 0.8, topP: 0.8, topK: 40, maxOutputTokens: 8192 }
        })
      });

      if (!response.ok) throw new Error('Gemini API request failed');

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;
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

  // OpenAI TTS API call
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

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return new Promise((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve(); };
        audio.play();
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

          const sessionData = {
            timestamp: new Date().toLocaleString('th-TH', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit'
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

          saveSessionData(sessionData);
          if (onWorkoutComplete) onWorkoutComplete(sessionData);
        } else {
          startRestPeriod();
          if (onSetComplete) onSetComplete(newSets);
        }
        return newSets;
      });
    }
  }, [counterLeft, counterRight, targetReps, sets, targetSets, workoutComplete]);

  // ─────────────────────────────────────────────
  // Main camera + pose effect
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current || workoutComplete) return;

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
            style.radius || 5, 0, 2 * Math.PI
          );
          ctx.fill();
        }
      }
      ctx.restore();
    };

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.style.display = 'block';

          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();

            const pose = new Pose.Pose({
              locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
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

                // ── LEFT ARM ──────────────────────────────────────────────
                const shoulderLeft = landmarks[11];
                const elbowLeft    = landmarks[13];
                const wristLeft    = landmarks[15];
                const hipLeft      = landmarks[23]; // ✅ NEW: ใช้ตรวจการยกไหล่

                if (shoulderLeft && elbowLeft && wristLeft) {
                  const angleLeft  = calculateAngle(shoulderLeft, elbowLeft, wristLeft);
                  const colorLeft  = getColorForAngle(angleLeft);

                  drawArmConnections(canvasCtx, [shoulderLeft, elbowLeft, wristLeft], { color: colorLeft, lineWidth: 4 });
                  drawSpecificLandmarks(canvasCtx, [shoulderLeft, elbowLeft, wristLeft], { color: colorLeft, radius: 8 });

                  // ── STAGE: DOWN ─────────────────────────────────────────
                  if (angleLeft > 160) {
                    stageLeft.current = "down";
                    isTimingLeft.current = false;
                    holdTimeLeft.current = 0;
                    // ✅ บันทึก baseline ไหล่ตอนแขนตรง (ท่าเริ่มต้น)
                    baselineShoulderLeftY.current = shoulderLeft.y;
                    formViolationsLeft.current = [];

                  // ── STAGE: UP (ตรวจ form ก่อนนับ) ──────────────────────
                  } else if (angleLeft >= 20 && angleLeft <= 40 && stageLeft.current === "down") {

                    // ✅ ตรวจสอบ form ทุก frame ขณะอยู่ในท่า up
                    const formResult = validateArmForm(
                      shoulderLeft, elbowLeft, wristLeft, hipLeft,
                      baselineShoulderLeftY.current
                    );
                    formViolationsLeft.current = formResult.violations;

                    if (!isTimingLeft.current) {
                      timerStartLeft.current = Date.now();
                      isTimingLeft.current = true;
                    }

                    const currentHoldTime = (Date.now() - timerStartLeft.current) / 1000;
                    const totalHoldTime   = holdTimeLeft.current + currentHoldTime;

                    if (totalHoldTime >= holdTimeRequiredLeft.current) {
                      stageLeft.current = "up";
                      isTimingLeft.current = false;
                      holdTimeLeft.current = 0;

                      if (formResult.isValid) {
                        // ✅ ท่าถูก → นับปกติ
                        setCounterLeft(prev => {
                          const newCounter = prev + 1;
                          angleDataLeft.current.push({
                            counter_left: newCounter,
                            angle: Math.round(angleLeft * 100) / 100,
                            timestamp: new Date().toISOString(),
                            form: 'valid'  // ✅ NEW
                          });
                          if (onRepComplete) onRepComplete('left', newCounter);
                          processGeminiAndTTS(Math.round(angleLeft));
                          return newCounter;
                        });
                      } else {
                        // ✅ ท่าผิด → นับ invalid rep แยกต่างหาก
                        setInvalidRepsLeft(prev => {
                          const newCounter = prev + 1;
                          angleDataLeft.current.push({
                            counter_left_invalid: newCounter,
                            angle: Math.round(angleLeft * 100) / 100,
                            timestamp: new Date().toISOString(),
                            form: 'invalid',
                            violations: formResult.violations
                          });
                          return newCounter;
                        });
                        console.warn('[LEFT] Invalid rep:', formResult.violations);
                      }
                    }

                  } else if ((angleLeft > 40 && angleLeft < 160) || angleLeft < 20) {
                    if (isTimingLeft.current) {
                      holdTimeLeft.current += (Date.now() - timerStartLeft.current) / 1000;
                      isTimingLeft.current = false;
                    }
                  }

                  // ✅ Draw form warnings บน canvas
                  drawFormWarnings(
                    canvasCtx,
                    formViolationsLeft.current,
                    shoulderLeft.x * canvasRef.current.width + 12,
                    shoulderLeft.y * canvasRef.current.height - 10
                  );
                }

                // ── RIGHT ARM ─────────────────────────────────────────────
                const shoulderRight = landmarks[12];
                const elbowRight    = landmarks[14];
                const wristRight    = landmarks[16];
                const hipRight      = landmarks[24]; // ✅ NEW

                if (shoulderRight && elbowRight && wristRight) {
                  const angleRight  = calculateAngle(shoulderRight, elbowRight, wristRight);
                  const colorRight  = getColorForAngle(angleRight);

                  drawArmConnections(canvasCtx, [shoulderRight, elbowRight, wristRight], { color: colorRight, lineWidth: 4 });
                  drawSpecificLandmarks(canvasCtx, [shoulderRight, elbowRight, wristRight], { color: colorRight, radius: 8 });

                  // ── STAGE: DOWN ─────────────────────────────────────────
                  if (angleRight > 160) {
                    stageRight.current = "down";
                    isTimingRight.current = false;
                    holdTimeRight.current = 0;
                    // ✅ บันทึก baseline ไหล่
                    baselineShoulderRightY.current = shoulderRight.y;
                    formViolationsRight.current = [];

                  // ── STAGE: UP (ตรวจ form ก่อนนับ) ──────────────────────
                  } else if (angleRight >= 20 && angleRight <= 40 && stageRight.current === "down") {

                    const formResult = validateArmForm(
                      shoulderRight, elbowRight, wristRight, hipRight,
                      baselineShoulderRightY.current
                    );
                    formViolationsRight.current = formResult.violations;

                    if (!isTimingRight.current) {
                      timerStartRight.current = Date.now();
                      isTimingRight.current = true;
                    }

                    const currentHoldTime = (Date.now() - timerStartRight.current) / 1000;
                    const totalHoldTime   = holdTimeRight.current + currentHoldTime;

                    if (totalHoldTime >= holdTimeRequiredRight.current) {
                      stageRight.current = "up";
                      isTimingRight.current = false;
                      holdTimeRight.current = 0;

                      if (formResult.isValid) {
                        // ✅ ท่าถูก → นับปกติ
                        setCounterRight(prev => {
                          const newCounter = prev + 1;
                          angleDataRight.current.push({
                            counter_right: newCounter,
                            angle_right: Math.round(angleRight * 100) / 100,
                            timestamp: new Date().toISOString(),
                            form: 'valid'  // ✅ NEW
                          });
                          if (onRepComplete) onRepComplete('right', newCounter);
                          return newCounter;
                        });
                      } else {
                        // ✅ ท่าผิด → นับ invalid rep แยก
                        setInvalidRepsRight(prev => {
                          const newCounter = prev + 1;
                          angleDataRight.current.push({
                            counter_right_invalid: newCounter,
                            angle_right: Math.round(angleRight * 100) / 100,
                            timestamp: new Date().toISOString(),
                            form: 'invalid',
                            violations: formResult.violations
                          });
                          return newCounter;
                        });
                        console.warn('[RIGHT] Invalid rep:', formResult.violations);
                      }
                    }

                  } else if ((angleRight > 40 && angleRight < 160) || angleRight < 20) {
                    if (isTimingRight.current) {
                      holdTimeRight.current += (Date.now() - timerStartRight.current) / 1000;
                      isTimingRight.current = false;
                    }
                  }

                  // ✅ Draw form warnings
                  drawFormWarnings(
                    canvasCtx,
                    formViolationsRight.current,
                    shoulderRight.x * canvasRef.current.width + 12,
                    shoulderRight.y * canvasRef.current.height - 10
                  );
                }
              }
              canvasCtx.restore();
            };

            pose.onResults(onResults);

            if (videoRef.current) {
              const camera = new cam.Camera(videoRef.current, {
                onFrame: async () => { await pose.send({ image: videoRef.current }); },
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

    return () => {
      console.log('🧹 Cleaning up camera...');

      if (cameraRef.current) {
        try { cameraRef.current.stop(); cameraRef.current = null; }
        catch (error) { console.error('Error stopping camera:', error); }
      }

      if (poseRef.current) {
        try { poseRef.current.close(); poseRef.current = null; }
        catch (error) { console.error('Error closing pose:', error); }
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => { track.stop(); });
        videoRef.current.srcObject = null;
      }

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      if (restInterval.current) clearInterval(restInterval.current);
    };
  }, [isActive, targetReps, workoutComplete]);

  return {
    counterLeft,
    counterRight,
    sets,
    isSpeaking,
    workoutComplete,
    saveStatus,
    // ✅ NEW: expose invalid rep counts
    invalidRepsLeft,
    invalidRepsRight,
    angleDataLeft: angleDataLeft.current,
    angleDataRight: angleDataRight.current
  };
};

export default useDumbbellCamera;