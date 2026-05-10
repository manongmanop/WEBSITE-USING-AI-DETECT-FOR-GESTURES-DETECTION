import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { Smile, Meh, Frown } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, limit, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase';
import "./WorkoutPlayer.css";
// Removed asset imports, relying on public folder
import { useUserAuth } from "../../context/UserAuthContext.jsx";
const API_BASE = import.meta.env?.VITE_API_URL || "";
import { ExerciseCameraManager } from '../../ExerciseCameraManager.jsx';
/* =========================================
   SECTION 1: Helpers & Utilities
   ========================================= */
function normalizeUrl(p) {
  if (!p) return "";
  let s = String(p).replace(/\\/g, "/");
  s = s.replace(/^(undefined|null)\//, "");
  s = s.replace(/^https?:\/\/(localhost|127\.0\.0\.1|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?\//, "/");
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/uploads/") || s.startsWith("/stream/")) {
    return API_BASE ? `${API_BASE}${s}` : s;
  }
  if (s.startsWith("uploads/")) {
    return API_BASE ? `${API_BASE}/${s}` : `/${s}`;
  }
  return API_BASE ? `${API_BASE}/uploads/${s}` : `/uploads/${s}`;
}

function parseDurationMs(ex) {
  if (ex.duration && ex.duration > 0) return ex.duration * 1000;
  if (ex.type === 'time' && ex.value > 0) return ex.value * 1000;
  return 0;
}

/* =========================================
   SECTION 2: UI Sub-Components
   ========================================= */
const ProgressRing = ({ progress, size = 80, strokeWidth = 6 }) => {
  const center = size / 2, radius = center - strokeWidth, C = 2 * Math.PI * radius;
  const dashoffset = C - (progress / 100) * C;
  return (
    <svg width={size} height={size} className="progress-ring-svg">
      <circle className="progress-ring-background" cx={center} cy={center} r={radius} strokeWidth={strokeWidth} />
      <circle
        className="progress-ring-progress"
        cx={center}
        cy={center}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={`${C} ${C}`}
        strokeDashoffset={dashoffset}
      />
    </svg>
  );
};

function CountdownWheel({ timeRemaining, totalDuration }) {
  const size = 110;
  const r = size * 0.38;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const ratio = totalDuration > 0 ? timeRemaining / totalDuration : 0;
  const offset = circ * (1 - ratio);

  const color = ratio > 0.5 ? "#1D9E75" : ratio > 0.25 ? "#EF9F27" : "#E24B4A";

  return (
    <svg width={size} height={size} style={{ display: "block", margin: "8px auto" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={size * 0.09} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={size * 0.09} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.5s" }}
      />
      <text x={cx} y={cy + size * 0.07} textAnchor="middle"
        fontSize={size * 0.22} fontWeight="500" fill={color}>
        {timeRemaining}
      </text>
      <text x={cx} y={cy + size * 0.25} textAnchor="middle"
        fontSize={size * 0.11} fill="#888">
        วินาที
      </text>
    </svg>
  );
}

function CameraGuide({ mode = "gate", images = [], onAccept, onClose }) {
  const safeImages = (images || []).filter(Boolean);
  const hasMany = safeImages.length > 1;
  const [idx, setIdx] = useState(0);
  const [preview, setPreview] = useState(null);

  const go = useCallback((d) => {
    setIdx((i) => {
      const n = safeImages.length || 1;
      return ((i + d) % n + n) % n;
    });
  }, [safeImages.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (preview != null) {
        if (e.key === "Escape") setPreview(null);
        if (e.key === "ArrowRight") setPreview((p) => (p + 1) % safeImages.length);
        if (e.key === "ArrowLeft") setPreview((p) => (p - 1 + safeImages.length) % safeImages.length);
        return;
      }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, preview, safeImages.length]);

  return (
    <>
      <div className="guide-overlay" role="dialog" aria-modal="true">
        <div className="guide-card">
          <div className="guide-header">
            <h2 className="guide-title">คำแนะนำในการตั้งกล้อง</h2>
            <p className="guide-subtitle">เพื่อให้ AI ตรวจจับได้ครบทุกท่ายืนและท่านอน</p>
            {mode === "peek" && <button type="button" className="guide-close-btn" onClick={onClose}>×</button>}
          </div>
          <div className="guide-body">
            {safeImages.length > 0 && (
              <div className="guide-gallery">
                <div className="guide-main">
                  <img className="guide-image" src={safeImages[idx]} alt={`Guide ${idx + 1}`} onClick={() => setPreview(idx)} onError={(e) => e.currentTarget.style.display = "none"} />
                  {hasMany && <><button className="guide-nav guide-nav--left" onClick={() => go(-1)}>‹</button><button className="guide-nav guide-nav--right" onClick={() => go(1)}>›</button></>}
                </div>
                {hasMany && <div className="guide-thumbs">{safeImages.map((src, i) => (<button key={i} className={`guide-thumb ${i === idx ? "is-active" : ""}`} onClick={() => setIdx(i)}><img src={src} alt="" /></button>))}</div>}
              </div>
            )}
            <div className="guide-checklist">
              <div className="guide-item">
                <div className="guide-icon">📏</div>
                <div>
                  <div className="guide-text"><b>ระยะห่าง 2 เมตร & ความสูงระดับเอว</b></div>
                  <div className="guide-sub">ถอยหลังให้เห็นเต็มตัว และวางกล้องระดับเอว (ประมาณ 1 เมตรจากพื้น)</div>
                </div>
              </div>
              <div className="guide-item">
                <div className="guide-icon">📐</div>
                <div>
                  <div className="guide-text"><b>หันด้านข้าง หรือ เฉียง 45 องศา</b></div>
                  <div className="guide-sub">หันด้านข้างเข้าหากล้องเสมอ เพื่อให้ AI เห็นการพับของข้อต่อชัดเจนที่สุด</div>
                </div>
              </div>
              <div className="guide-item">
                <div className="guide-icon">💡</div>
                <div>
                  <div className="guide-text"><b>แสงสว่าง & พื้นที่โล่ง</b></div>
                  <div className="guide-sub">หลีกเลี่ยงการย้อนแสง และสวมใส่เสื้อผ้าที่สีตัดกับฉากหลัง</div>
                </div>
              </div>
            </div>
          </div>
          {mode === "gate" && <div className="guide-actions"><button type="button" className="guide-accept-btn" onClick={onAccept}>ฉันจัดมุมกล้องตามนี้แล้ว เริ่มเลย!</button></div>}
        </div>
      </div>
      {preview != null && (
        <div className="lightbox" onClick={() => setPreview(null)}>
          <img src={safeImages[preview]} alt="" className="lightbox-img" />
        </div>
      )}
    </>
  );
}
export function submitProgramFeedback(programId, level, uid) {
  const payload = { level, uid };
  // ลองเพิ่ม console.log เพื่อเช็คว่าถูกเรียกจริงไหม
  console.log(`Sending Feedback: Program=${programId}, Level=${level}, User=${uid}`);
  return axios.patch(`/api/workout_programs/${programId}/feedback`, payload);
}
/* =========================================
   SECTION 3: Main Component
   ========================================= */
export default function WorkoutPlayer() {
  const { programId } = useParams();
  // Callback เมื่อทำครบ Rep
  const handleRepComplete = (side, count) => {
    console.log(`✅ ${side} arm completed rep ${count}`);
  };

  // Callback เมื่อทำครบ Set
  const handleSetComplete = () => {
    console.log('🎉 Set complete!');
    onWorkoutEnded(); // เรียกฟังก์ชันเดิม
  };
  // --- Constants ---
  const REST_BASE_SEC = 20;
  const REST_MAX_SEC = 150;
  const navigate = useNavigate();
  // --- State: Data & Status ---
  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);



  // --- State: Guide & Flow ---
  const [showGuide, setShowGuide] = useState(true);
  const [guideMode, setGuideMode] = useState("gate");
  const pausedPhaseRef = useRef(null);
  const overlayResumeArmedRef = useRef(false);
  const [weight, setWeight] = useState(""); // State สำหรับน้ำหนัก
  const [shouldAskWeight, setShouldAskWeight] = useState(false); // เช็คว่าควรถามน้ำหนักไหม

  // --- State: TTS Voices ---
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => localStorage.getItem('ttsVoiceURI') || "");

  useEffect(() => {
    const loadVoices = () => {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const thaiVoices = voices.filter(v => v.lang.includes('th'));
        setAvailableVoices(thaiVoices.length > 0 ? thaiVoices : voices);
        if (!localStorage.getItem('ttsVoiceURI') && thaiVoices.length > 0) {
          setSelectedVoiceURI(thaiVoices[0].voiceURI);
          localStorage.setItem('ttsVoiceURI', thaiVoices[0].voiceURI);
        }
      }
    };
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleVoiceChange = (e) => {
    const uri = e.target.value;
    setSelectedVoiceURI(uri);
    localStorage.setItem('ttsVoiceURI', uri);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("ทดสอบเสียง");
    utterance.lang = "th-TH";
    const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === uri);
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  // --- State: Workout Progress ---
  const [currentExercise, setCurrentExercise] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Phase Flags
  const [isCounting, setIsCounting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isResting, setIsResting] = useState(false);

  const [countdownAction, setCountdownAction] = useState("startNew");
  // --- State: Timers (Progress & Countdown) ---
  const [countdown, setCountdown] = useState(3);
  const [exerciseProgress, setExerciseProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [restProgress, setRestProgress] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);

  // --- State: Camera ---
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraError, setCameraError] = useState("");

  // --- State: Custom Popup ---
  const [popupInfo, setPopupInfo] = useState(null);

  // --- Refs ---
  const progressIntervalRef = useRef(null);
  const autoNextTimerRef = useRef(null);
  const currentDurationMsRef = useRef(0);
  const remainingMsRef = useRef(0);
  const lastStartTsRef = useRef(0);
  const totalPauseMsForExerciseRef = useRef(0); // ✅ เก็บรวมเวลาที่หยุดพักในท่านี้

  const restIntervalRef = useRef(null);
  const restTimerRef = useRef(null);
  const restTotalMsRef = useRef(0);
  const restRemainingMsRef = useRef(0);
  const restLastStartTsRef = useRef(0);
  const nextIndexRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const sessionIdRef = useRef(null);
  const exerciseVideoRef = useRef(null);
  const pauseStartTimeRef = useRef(null); // ✅ เก็บเวลาที่กดหยุดสิพักไว้

  // --- Auth ---
  const { user } = useUserAuth();
  const uid = user?.uid;

  // ตรวจสอบวันที่อัปเดตน้ำหนักล่าสุด
  useEffect(() => {
    const checkLastWeightUpdate = async () => {
      if (!uid) {
        console.log("checkLastWeightUpdate: No UID yet");
        return;
      }
      try {
        console.log("checkLastWeightUpdate: Querying bodyMetrics for UID:", uid);
        const metricsRef = collection(db, 'bodyMetrics');
        // เอา orderBy ออกเพื่อป้องกันปัญหา Error เรื่อง Firebase Index ที่ไม่ได้สร้างไว้
        const q = query(
          metricsRef,
          where('userId', '==', uid)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.log("checkLastWeightUpdate: No bodyMetrics found -> shouldAskWeight: true");
          setShouldAskWeight(true); // ไม่มีประวัติเลย ให้ถาม
        } else {
          // ดึงข้อมูลทั้งหมดมาเรียงลำดับฝั่ง Client แทน เพื่อเลี่ยง Index Error
          const allDocs = snapshot.docs.map(doc => doc.data());
          allDocs.sort((a, b) => {
            const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
            const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            return dateB - dateA; // Descending (ใหม่สุดขึ้นก่อน)
          });

          const lastData = allDocs[0];
          const lastDate = lastData.date?.toDate ? lastData.date.toDate() : new Date(lastData.date);
          const now = new Date();
          const diffTime = Math.abs(now - lastDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          console.log("checkLastWeightUpdate: Last weight update was", diffDays, "days ago. Data:", lastData);

          if (diffDays >= 7) { // เปลี่ยนกลับเป็น >= 7 เมื่อทดสอบเสร็จ
            console.log("checkLastWeightUpdate: diffDays >= 7 -> shouldAskWeight: true");
            setShouldAskWeight(true); // เกิน 7 วันแล้ว ให้ถามใหม่
          } else {
            console.log("checkLastWeightUpdate: diffDays < 7 -> shouldAskWeight: false");
            setShouldAskWeight(false);
          }
        }
      } catch (err) {
        console.error("Error checking last weight update:", err);
        // ถ้า query พัง (เช่น ขาดสิทธิ์ ขาด index) ให้ถามน้ำหนักกันเหนียวไว้
        setShouldAskWeight(true);
      }
    };

    checkLastWeightUpdate();
  }, [uid]);

  const activeExerciseIndexRef = useRef(-1);
  const activeSetRef = useRef(-1);
  useEffect(() => {
    // ถ้าหน้าจอยังเป็นกล้องไกด์อยู่ หรือ index/set ยังไม่เปลี่ยน หรือไม่มีข้อมูลท่า -> ไม่ต้องทำอะไร
    if (showGuide || (activeExerciseIndexRef.current === currentExercise && activeSetRef.current === currentSet) || !exercises[currentExercise]) {
      return;
    }

    // จำไว้ว่าทำท่านี่แล้ว
    activeExerciseIndexRef.current = currentExercise;
    activeSetRef.current = currentSet;

    // 1. ตั้งค่าเวลาเริ่ม (จุดสำคัญ: ทำครั้งเดียว ไม่มีการรีเซ็ตอีกจนกว่าจะเปลี่ยนท่า)
    exerciseStartTimeRef.current = Date.now();

    // 2. ตั้งค่า Duration ตามประเภท
    const cur = exercises[currentExercise];
    const isDuration = cur?.duration > 0 || cur?.type === 'time';
    let duration = 0;
    if (isDuration) {
      if (cur.duration && cur.duration > 0) duration = cur.duration * 1000;
      else if (cur.type === 'time' && cur.value > 0) duration = cur.value * 1000;
    }

    currentDurationMsRef.current = duration;
    remainingMsRef.current = duration;

    console.log(`🎬 Init Exercise ${currentExercise}: StartTime Fixed at ${exerciseStartTimeRef.current}`);

    // 3. เริ่มนับถอยหลัง (ถ้าไม่ได้อยู่ในช่วงพัก หรือเตรียมนับ 3 2 1)
    if (!isResting && !isCounting) {
      setIsPlaying(true);
      if (duration > 0) {
        resumeWorkoutTimers();
      } else {
        setExerciseProgress(0);
        setTimeRemaining(0);
      }
    }

  }, [currentExercise, isResting, isCounting, exercises, showGuide]);

  useEffect(() => {
    console.log("Current User UID:", uid);
  }, [uid]);
  const overallProgress = useMemo(() => {
    if (!exercises.length) return 0;

    let totalSetsAll = 0;
    let completedSetsBefore = 0;

    for (let i = 0; i < exercises.length; i++) {
      const s = exercises[i].sets || 1;
      totalSetsAll += s;
      if (i < currentExercise) {
        completedSetsBefore += s;
      }
    }

    const currentAbsoluteSet = completedSetsBefore + (currentSet - 1);

    return ((currentAbsoluteSet + exerciseProgress / 100) / totalSetsAll) * 100;
  }, [currentExercise, currentSet, exerciseProgress, exercises]);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const recordMockHistory = (level) => {
    const key = "mock:workoutHistory";
    const entry = {
      programId,
      programName: program?.name || "โปรแกรมไม่มีชื่อ",
      totalExercises: exercises.length,
      level,
      time: 0,
      calories: 0,
      finishedAt: new Date().toISOString(),
    };
    try {
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.unshift(entry);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
    } catch (e) {
      console.warn("บันทึก history mock ไม่สำเร็จ", e);
    }
  };
  const sendingOnceRef = useRef(false);
  const handlePickFeedback = async (level) => {
    if (!programId || !uid) return;

    if (sendingOnceRef.current) return;      // ✅ กันคลิก/ยิงซ้ำ
    sendingOnceRef.current = true;

    setSendingFeedback(true);
    try {
      // 1. ✅ จบ session (เพื่อให้ได้ finishedAt)
      const finishedSessionResult = await finishSession();

      // ✅ ถ้า Session ถูกยกเลิกเพราะเวลาสั้นเกินไป (<60s)
      if (finishedSessionResult?.aborted) {
        Swal.fire({
          icon: 'info',
          title: 'เซสชันสั้นเกินไป',
          text: 'การออกกำลังกายน้อยกว่า 60 วินาที จะไม่ถูกบันทึกลงในสถิติถาวรครับ',
          confirmButtonText: 'รับทราบ/กลับหน้าหลัก'
        }).then(() => {
          navigate('/home');
        });
        return;
      }

      const finishedSessionId = finishedSessionResult?.sessionId || null;
      console.log("🏁 finishedSessionId returned:", finishedSessionId);

      // 2. ✅ ส่ง feedback และน้ำหนักไปที่ History API (MongoDB)
      if (finishedSessionId) {
        try {
          await axios.patch(`/api/histories/${finishedSessionId}/feedback`, {
            feedback: level,
            weight: weight ? parseFloat(weight) : undefined
          });
        } catch (histErr) {
          console.error("Failed to update history feedback:", histErr);
        }
      }

      /* ... (Firebase sync logic remains same) ... */
      if (shouldAskWeight && weight && parseFloat(weight) > 0) {
        const parsedWeight = parseFloat(weight);
        try {
          const userRef = doc(db, 'users', uid);
          await setDoc(userRef, { weight: parsedWeight, updatedAt: new Date() }, { merge: true });
          const metricsRef = collection(db, 'bodyMetrics');
          await setDoc(doc(metricsRef), { userId: uid, date: new Date(), weight: parsedWeight, fatPercentage: 20, muscleMass: 30 });
        } catch (fbErr) { console.error("Firebase update failed:", fbErr); }
      }

      // 4. ✅ ส่ง feedback โปรแกรม (ข้าม Error ได้ถ้าล้มเหลว)
      try {
        await submitProgramFeedback(programId, level, uid);
      } catch (progErr) {
        console.warn("Skip program feedback error:", progErr.message);
      }

      setShowFeedbackModal(false);
      navigate(`/summary/program/${uid}`);
    } catch (e) {
      console.error("Critical Feedback Error:", e);
      // Fallback navigate
      navigate(`/summary/program/${uid}`);
    } finally {
      setSendingFeedback(false);
    }
  };

  /* =========================================
     SECTION 4: Effects (Data, Camera, Resume)
     ========================================= */
  // Load Program Data
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setIsLoading(true); setLoadError(null);
        let resData = null;

        if (programId === "dailyplan") {
          // โหลด Daily Plan
          if (!user?.uid) return;
          const res = await axios.get(`/api/daily-plan/${user.uid}`);
          if (ignore) return;
          resData = {
            name: "ภารกิจวันนี้ของคุณ",
            workoutList: res.data.exercises.map(ex => ({
              exercise: ex.exerciseId,
              reps: ex.reps, // Reps and Time mapping for performance tracking
              duration: ex.time
            }))
          };
        } else {
          // โหลด Program ปกติ
          const res = await axios.get(`/api/workout_programs/${programId}`);
          if (ignore) return;
          resData = res.data;
        }

        setProgram(resData);
        const list = Array.isArray(resData?.workoutList) ? resData.workoutList : [];
        setExercises(list.map((it) => {
          const exObj = it?.exercise && typeof it.exercise === "object" ? it.exercise : it;
          return {
            ...it,
            imageUrl: normalizeUrl(exObj?.media?.imageUrl || exObj?.imageUrl || exObj?.image || it?.imageUrl || it?.image),
            video: normalizeUrl(exObj?.media?.videoUrl || exObj?.videoUrl || exObj?.video || it?.videoUrl || it?.video),
            met: it?.met || exObj?.met || { base: 5.0 }
          };
        }));
        // Initial Reset
        setCurrentExercise(0);
        setCurrentSet(1);
        setAccumulatedSeconds(0);
        stopCamera();
        resetAllTimers();
        setIsPaused(false); setIsResting(false); setIsPlaying(false); setIsCounting(false);
        // --- Do NOT start rest phase or session here ---
        // Wait for user to click "ฉันเข้าใจแล้ว เริ่มเลย"
      } catch (e) {
        if (ignore) return;
        setLoadError({ where: "program", message: e?.message || "Failed to load" });
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();
    return () => {
      ignore = true;
      stopCamera();
      resetAllTimers();
    };
  }, [programId]);

  // Prevent accidental resume on overlay click
  useEffect(() => {
    if (isPaused && isResting && !showGuide) {
      overlayResumeArmedRef.current = false;
      const t = setTimeout(() => { overlayResumeArmedRef.current = true; }, 180);
      return () => clearTimeout(t);
    }
  }, [isPaused, isResting, showGuide]);

  // Audio Tips during Rest phase: plays next exercise's tips while user previews
  useEffect(() => {
    // Only run during rest, not paused
    if (!isResting || isPaused) {
      window.speechSynthesis.cancel();
      return;
    }

    // Get the NEXT exercise data (the one being previewed during rest)
    const nextIdx = nextIndexRef.current;
    const nextEx = nextIdx != null ? exercises[nextIdx] : null;
    const exData = nextEx?.exercise && typeof nextEx.exercise === "object" ? nextEx.exercise : nextEx;

    if (!exData) return;

    // Small delay so the rest screen has time to render before audio starts
    const startDelay = setTimeout(() => {
      // ---- 1. Try Pre-recorded audio first ----
      const audioUrl = exData?.media?.audioUrl || exData?.audioUrl || null;
      if (audioUrl) {
        const API = import.meta.env?.VITE_API_URL || "";
        const fullUrl = audioUrl.startsWith("http") ? audioUrl : API + audioUrl;
        const audio = new Audio(fullUrl);
        audio.play().catch(e => console.warn("[Audio] Pre-recorded play error:", e));
        // Store reference for cleanup
        window.__restAudio = audio;
        return;
      }

      // ---- 2. Fallback: TTS ----
      const currentTips = exData?.tips || null;
      let tipsArray = [];
      if (Array.isArray(currentTips)) {
        tipsArray = currentTips.flatMap(t => t.split("\n"));
      } else if (typeof currentTips === 'string') {
        tipsArray = currentTips.split("\n");
      }
      tipsArray = tipsArray
        .flatMap(t => t.split(","))
        .map(t => t.trim())
        .filter(Boolean);

      if (tipsArray.length === 0) return;

      let currentIndex = 0;
      let timeoutId = null;
      let isActive = true;
      window.__ttsUtterances = window.__ttsUtterances || [];

      const speakNext = () => {
        if (!isActive) return;
        if (currentIndex >= tipsArray.length) {
          window.__ttsUtterances = [];
          return;
        }

        const utterance = new SpeechSynthesisUtterance(tipsArray[currentIndex]);
        utterance.lang = "th-TH";
        utterance.rate = 1.0;

        if (selectedVoiceURI) {
          const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === selectedVoiceURI);
          if (voice) utterance.voice = voice;
        }

        window.__ttsUtterances.push(utterance);

        utterance.onend = () => {
          currentIndex++;
          if (currentIndex < tipsArray.length && isActive) {
            timeoutId = setTimeout(speakNext, 1500);
          }
        };
        utterance.onerror = (e) => {
          console.warn("TTS Error:", e);
          currentIndex++;
          if (currentIndex < tipsArray.length && isActive) {
            timeoutId = setTimeout(speakNext, 1500);
          }
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNext();
      window.__restTtsCleanup = () => {
        isActive = false;
        if (timeoutId) clearTimeout(timeoutId);
        window.speechSynthesis.cancel();
        window.__ttsUtterances = [];
      };
    }, 800); // 800ms delay after rest starts

    return () => {
      clearTimeout(startDelay);
      // Stop pre-recorded audio
      if (window.__restAudio) {
        window.__restAudio.pause();
        window.__restAudio.src = "";
        window.__restAudio = null;
      }
      // Stop TTS
      if (window.__restTtsCleanup) {
        window.__restTtsCleanup();
        window.__restTtsCleanup = null;
      }
      window.speechSynthesis.cancel();
    };
  }, [isResting, isPaused, exercises, selectedVoiceURI]);

  // Camera Management
  useEffect(() => {
    let mounted = true;
    const openCamera = async () => {
      try {
        setCameraStatus("loading"); setCameraError("");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (!mounted) return;
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        startDrawLoop(); setCameraStatus("active");
      } catch (err) {
        if (mounted) {
          setCameraStatus("error");
          setCameraError(err?.message || "Camera failed");
          setPopupInfo({
            title: "เกิดข้อผิดพลาดในการเปิดกล้อง",
            text: "ไม่สามารถเข้าถึงกล้องได้ โปรดกดอนุญาตในการเข้าถึงกล้องบนเครื่องของคุณ",
            showCancel: false,
            onConfirm: () => setPopupInfo(null)
          });
        }
      }
    };

    if (isPlaying && !isPaused) openCamera();
    else stopCamera();

    return () => { mounted = false; };
  }, [isPlaying, isPaused]);


  // Countdown Logic
  useEffect(() => {
    if (!isCounting) return;

    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    } else {
      // countdown = 0
      setIsCounting(false);
      setIsPaused(false);

      if (countdownAction === "startNew") {
        setIsPlaying(true);
        startWorkoutTimersForCurrent();
      } else if (countdownAction === "resumeWorkout") {
        setIsPlaying(true);
        resumeWorkoutTimers();
      } else if (countdownAction === "resumeRest") {
        setIsResting(true);
        resumeRestTimers();
      }
    }
  }, [isCounting, countdown, countdownAction]);


  useEffect(() => {
    const videoEl = exerciseVideoRef.current;
    if (!videoEl) return;

    if (isPaused) {
      videoEl.pause(); // สั่งหยุด
    } else {
      // สั่งเล่นต่อ (ใช้ catch เพื่อกัน Error กรณีเปลี่ยนท่าเร็วๆ)
      videoEl.play().catch(() => { });
    }
  }, [isPaused]);
  useEffect(() => {
    return () => {
      finishSession().catch(() => { });
    };
  }, []);

  useEffect(() => {
    exerciseStartTimeRef.current = Date.now();
    console.log(`⏱️ New Exercise Started: ${currentExercise} Set: ${currentSet} at ${exerciseStartTimeRef.current}`);
  }, [currentExercise, currentSet]); // ทำงานเมื่อเลขข้อเปลี่ยนหรือเซตเปลี่ยน

  /* =========================================
     SECTION 5: Logic & Timers
     ========================================= */

  const resetAllTimers = () => {
    resetWorkoutTimers();
    resetRestTimers();
  };

  // --- Session & API ---
  function buildSnapshotFromExercises(list) {
    return (list || [])
      .map((it, i) => {
        // บางทีมันเป็น { exercise: {...}, ... } หรือเป็น {...} ตรงๆ
        const ex = it?.exercise && typeof it.exercise === "object" ? it.exercise : it;

        const exerciseId = ex?._id || it?._id || it?.exercise?._id;

        // type ต้องเป็น "reps" หรือ "time"
        const type = ex?.type;

        // value ต้องเป็น number
        const rawValue = ex?.value ?? ex?.time ?? ex?.duration ?? 0;
        const value = Number(rawValue);

        return {
          exerciseId,
          name: ex?.name || it?.name || "",
          target: { type, value },
          order: i,
        };
      })
      .filter((x) => x.exerciseId && (x.target?.type === "reps" || x.target?.type === "time") && Number.isFinite(x.target.value));
  }
  const isStartingSessionRef = useRef(false);

  //  แก้ไขฟังก์ชันนี้
  async function startSessionIfNeeded() {
    // ถ้ามี Session ID แล้ว ให้ใช้เลย ไม่ต้องสร้างใหม่
    if (sessionIdRef.current) return sessionIdRef.current;

    // 🔥 FIX: ถ้ากำลังสร้างอยู่ (Loading) ให้รอจนกว่าจะเสร็จ (ป้องกันการเรียกซ้ำ)
    if (isStartingSessionRef.current) {
      // รอจนกว่า sessionIdRef.current จะมีค่า (Polling แบบง่าย)
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (sessionIdRef.current) {
            clearInterval(check);
            resolve(sessionIdRef.current);
          }
        }, 100);
      });
    }

    isStartingSessionRef.current = true; // 🔒 ล็อคทันที

    try {
      const snapshotExercises = buildSnapshotFromExercises(exercises);

      if (!uid || !programId || snapshotExercises.length === 0) {
        throw new Error("เริ่ม session ไม่ได้: uid/programId/exercises ไม่พร้อม");
      }

      const body = {
        uid,
        origin: { kind: "program", programId },
        snapshot: {
          programName: program?.name || null,
          exercises: snapshotExercises,
        },
      };

      console.log("🚀 START SESSION (Once Only) =", body);
      const res = await axios.post(`/api/workout_sessions/start`, body);

      sessionIdRef.current = res.data?._id;
      return sessionIdRef.current;

    } catch (e) {
      console.error("Start Session Failed:", e);
      throw e;
    } finally {
      isStartingSessionRef.current = false; // 🔓 ปลดล็อค (เผื่อจะลองใหม่ถ้า Error)
    }
  }


  async function logExerciseResult({ order, exerciseDoc, performedSeconds = 0, status = "completed" }) {
    const sessionId = await startSessionIfNeeded();

    const ex = exerciseDoc?.exercise && typeof exerciseDoc.exercise === "object"
      ? exerciseDoc.exercise
      : exerciseDoc;

    const exerciseId = ex?._id || exerciseDoc?._id;

    const type = ex?.type;
    const rawValue = ex?.value ?? ex?.reps ?? ex?.time ?? ex?.duration ?? 0;
    const value = Number(rawValue);

    if (!exerciseId || (type !== "reps" && type !== "time") || !Number.isFinite(value)) {
      throw new Error("logExerciseResult: ข้อมูลท่าออกกำลังกายไม่ครบ (exerciseId/type/value)");
    }

    // ✅ คำนวณแคลอรี่โดยใช้ ACSM Formula (ตรงกับ utils/calculateCalories.js บน server)
    // สูตร: (MET × 3.5 × weight) / 200 × durationMin
    // - MET        : ค่าจริงของท่าออกกำลังกาย (default 5.0)
    // - weightInKg : น้ำหนักผู้ใช้จาก state หรือ default 70 kg
    // - durationSec: ดอวินาทีที่ออกกำลังจริง
    // [Production Guard] ถ้าออกกำลังกายน้อยกว่า 120 วินาที (2 นาที) → calories = 0 (ไม่นับ)
    const MET = exerciseDoc?.met || ex?.met?.base || 5.0;
    const weightInKg = parseFloat(weight) || 70;
    const durationSec = Number(performedSeconds);
    let calories = 0;
    if (durationSec > 0) {
      const calPerMin = (MET * 3.5 * weightInKg) / 200;
      const durationMin = durationSec / 60;             // วินาที → นาที
      calories = Number((calPerMin * durationMin).toFixed(2));
    }

    const payload = {
      order,
      exerciseId,
      name: ex?.name || "",
      target: { type, value },
      performed: {
        reps: type === "reps" ? value : 0,
        seconds: Number(performedSeconds) || 0,
      },
      status,
      calories: calories, // ✅ ส่งค่าที่คำนวณและปัดเศษแล้วไป
      startedAt: null,
      endedAt: null,
    };

    console.log(`🔥 Logged Calories: ${calories} kcal (from ${performedSeconds}s)`);

    await axios.post(`/api/workout_sessions/${sessionId}/log-exercise`, payload);
  }

  const finishedOnceRef = useRef(false);
  const finishSessionResultRef = useRef(null);

  async function finishSession() {
    if (!sessionIdRef.current) return null;
    if (finishedOnceRef.current) return finishSessionResultRef.current;

    finishedOnceRef.current = true;
    try {
      const res = await axios.patch(`/api/workout_sessions/${sessionIdRef.current}/finish`, {});
      finishSessionResultRef.current = res.data;
      return res.data;
    } catch (e) {
      console.error("Failed to finish session:", e);
      return null;
    }
  }

  // --- Workout Logic ---
  const resetWorkoutTimers = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    progressIntervalRef.current = null; autoNextTimerRef.current = null;
    currentDurationMsRef.current = 0; remainingMsRef.current = 0;
    setExerciseProgress(0); setTimeRemaining(0);
  };

  const startWorkoutTimersForCurrent = () => {
    const cur = exercises[currentExercise]; if (!cur) return;

    const isDuration = cur?.duration > 0 || cur?.type === 'time';
    let durationMs = 0;
    if (isDuration) {
      if (cur.duration && cur.duration > 0) durationMs = cur.duration * 1000;
      else if (cur.type === 'time' && cur.value > 0) durationMs = cur.value * 1000;
    }

    currentDurationMsRef.current = durationMs;
    remainingMsRef.current = durationMs;

    if (durationMs > 0) {
      resumeWorkoutTimers();
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      setExerciseProgress(0);
      setTimeRemaining(0);
    }
  };

  const pauseWorkoutTimers = () => {
    // 1. หยุด Loop การนับเวลา
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    progressIntervalRef.current = null; autoNextTimerRef.current = null;

    // if (lastStartTsRef.current) {
    //   const elapsed = Date.now() - lastStartTsRef.current;
    //   remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
    //   updateWorkoutUI(remainingMsRef.current);
    // }
    pauseStartTimeRef.current = Date.now(); // ✅ บันทึกเวลาที่เริ่ม Pause
    stopCamera();
  };

  const resumeWorkoutTimers = () => {
    if (remainingMsRef.current <= 0) return;

    // ✅ ปรับจูนเวลาเริ่มออกกำลังกาย (exerciseStartTimeRef) โดยหักลบเวลาที่ Pause ออกไป
    if (pauseStartTimeRef.current) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      exerciseStartTimeRef.current += pauseDuration;
      pauseStartTimeRef.current = null;
    }

    lastStartTsRef.current = Date.now();
    const resumeFromMs = remainingMsRef.current;

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastStartTsRef.current;
      const rem = Math.max(0, resumeFromMs - elapsed);
      remainingMsRef.current = rem;
      updateWorkoutUI(rem);
      if (rem <= 0) { clearInterval(progressIntervalRef.current); onWorkoutEnded(); }
    }, 100);

    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    autoNextTimerRef.current = setTimeout(() => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      remainingMsRef.current = 0;
      onWorkoutEnded();
    }, resumeFromMs);
  };

  const updateWorkoutUI = (ms) => {
    setExerciseProgress(100 - (ms / currentDurationMsRef.current) * 100);
    setTimeRemaining(Math.ceil(ms / 1000));
  };
  const exerciseStartTimeRef = useRef(Date.now());
  const endingRef = useRef(false);
  const onWorkoutEnded = async () => {
    if (endingRef.current) return;
    endingRef.current = true;

    const cur = exercises[currentExercise];
    const targetSets = cur?.sets || 1;
    let newAccumulated = accumulatedSeconds;

    try {
      const now = Date.now();
      let startTime = exerciseStartTimeRef.current;

      // ✅ ถ้ายังอยู่ในสถานะ Pause ขณะที่จบ (เช่น กดข้ามท่าขณะหยุด) ให้หักเวลา Pause ปัจจุบันออกด้วย
      if (pauseStartTimeRef.current) {
        startTime += (now - pauseStartTimeRef.current);
      }

      const elapsedMs = now - startTime;
      let performedSeconds = Math.round(elapsedMs / 1000);

      // ถ้าเวลาน้อยกว่า 1 ให้เป็น 1 (กันเหนียว)
      if (performedSeconds < 1) performedSeconds = 1;

      newAccumulated += performedSeconds;

      console.log(`✅ Log Order ${currentExercise} Set ${currentSet}: ${performedSeconds}s (Total so far: ${newAccumulated}s)`);

      if (currentSet === targetSets) {
        await logExerciseResult({
          order: currentExercise,
          exerciseDoc: cur,
          performedSeconds: newAccumulated,
          status: "completed",
        });
      }

    } catch (e) {
      console.warn("Log failed:", e);
    } finally {
      endingRef.current = false;
    }

    resetWorkoutTimers();
    stopCamera();
    setIsPlaying(false);
    setIsPaused(false);

    if (currentSet < targetSets) {
      setAccumulatedSeconds(newAccumulated);
      setCurrentSet(prev => prev + 1);
      const currentRest = cur?.rest > 0 ? cur.rest : REST_BASE_SEC;
      startRest(currentExercise, currentRest);
    } else {
      setAccumulatedSeconds(0);
      setCurrentSet(1);
      if (currentExercise < exercises.length - 1) {
        const currentRest = cur?.rest > 0 ? cur.rest : REST_BASE_SEC;
        startRest(currentExercise + 1, currentRest);
      } else {
        setIsCounting(false);
        try {
          const result = await finishSession();
          if (result && result.aborted) {
            setPopupInfo({
              title: "เซสชันสั้นเกินไป",
              text: "คุณใช้เวลาออกกำลังกายน้อยกว่า 60 วินาที ระบบจะไม่บันทึกประวัติและเซสชันนี้นะครับ",
              showCancel: false,
              onConfirm: () => {
                setPopupInfo(null);
                navigate("/home");
              }
            });
            return;
          }
        } catch (e) { }
        setShowFeedbackModal(true);
      }
    }
  };

  // --- Rest Logic ---
  const resetRestTimers = () => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    if (restTimerRef.current) clearTimeout(restTimerRef.current);
    restIntervalRef.current = null; restTimerRef.current = null;
    restTotalMsRef.current = 0; restRemainingMsRef.current = 0;
    setRestProgress(0); setRestRemaining(0);
  };

  const startRest = (nextIndex, baseSec = REST_BASE_SEC) => {
    setIsResting(true); setIsCounting(false); setIsPlaying(false); setIsPaused(false);
    nextIndexRef.current = nextIndex;
    const initialMs = Math.min(Math.max(1, baseSec), REST_MAX_SEC) * 1000;
    restTotalMsRef.current = initialMs;
    restRemainingMsRef.current = initialMs;
    resumeRestTimers();
  };

  const pauseRestTimers = () => {
    // 1. หยุด Loop การนับเวลา
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    if (restTimerRef.current) clearTimeout(restTimerRef.current);
    restIntervalRef.current = null; restTimerRef.current = null;

    // if (restLastStartTsRef.current) {
    //   const elapsed = Date.now() - restLastStartTsRef.current;
    //   restRemainingMsRef.current = Math.max(0, restRemainingMsRef.current - elapsed);
    //   updateRestUI(restRemainingMsRef.current);
    // }
    stopCamera();
  };

  const resumeRestTimers = () => {
    if (restRemainingMsRef.current <= 0) return;
    if (restRemainingMsRef.current < 2000) {
      restRemainingMsRef.current = 2000;
      setRestRemaining(2);
    }

    restLastStartTsRef.current = Date.now();
    const resumeFromMs = restRemainingMsRef.current;

    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    restIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - restLastStartTsRef.current;
      const rem = Math.max(0, resumeFromMs - elapsed);
      restRemainingMsRef.current = rem;
      updateRestUI(rem);
      if (rem <= 0) { clearInterval(restIntervalRef.current); endRest(); }
    }, 100);

    if (restTimerRef.current) clearTimeout(restTimerRef.current);
    restTimerRef.current = setTimeout(() => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
      endRest();
    }, resumeFromMs);
  };

  const updateRestUI = (ms) => {
    setRestProgress(100 - (ms / restTotalMsRef.current) * 100);
    setRestRemaining(Math.ceil(ms / 1000));
  };

  const addRestSeconds = (sec = 10) => {
    const REST_MAX_MS = REST_MAX_SEC * 1000;
    const deltaMs = Math.max(0, sec) * 1000;

    const nextRemaining = Math.min(REST_MAX_MS, Math.max(0, restRemainingMsRef.current) + deltaMs);
    const nextTotal = Math.min(REST_MAX_MS, Math.max(nextRemaining, Math.max(0, restTotalMsRef.current) + deltaMs));
    restRemainingMsRef.current = nextRemaining;
    restTotalMsRef.current = nextTotal;

    // Re-arm timers to reflect the new duration
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    if (restTimerRef.current) clearTimeout(restTimerRef.current);
    restIntervalRef.current = null; restTimerRef.current = null;

    updateRestUI(restRemainingMsRef.current);
    if (!isPaused && isResting) {
      resumeRestTimers();
    }
  };

  const endRest = () => {
    // ✅ คำนวณเวลาพักที่ใช้จริงเพื่อนำไปคิดแคลอรี่
    const performedRestMs = restTotalMsRef.current - restRemainingMsRef.current;
    const performedRestSec = Math.floor(performedRestMs / 1000);
    
    if (performedRestSec > 0) {
      setAccumulatedSeconds(prev => prev + performedRestSec);
      console.log(`⏱️ Added Rest Time: ${performedRestSec}s to accumulated duration`);
    }

    resetRestTimers();
    setIsResting(false);
    setIsPaused(false);
    const nextIdx = nextIndexRef.current;
    if (nextIdx != null && nextIdx < exercises.length) {
      setCurrentExercise(nextIdx);
      setCountdownAction("startNew");   // ✅ เริ่มท่าใหม่
      setIsCounting(true);
      setCountdown(3);
    } else {
      onWorkoutEnded();
    }
  };

  // --- Interaction Handlers ---
  const togglePause = () => {
    if (isResting) {
      // ช่วงพัก: pause / resume ตามปกติ (ไม่ต้องขึ้น 3-2-1 ก็ได้)
      if (isPaused) {
        resumeRestTimers();
        setIsPaused(false);
      } else {
        pauseRestTimers();
        setIsPaused(true);
      }
    } else if (isPlaying) {
      if (isPaused) {
        // ✅ RESUME จาก pause ระหว่างเล่นท่า
        // แทนที่จะ resume ทันที → ขึ้น 3-2-1 ก่อน
        setCountdown(3);
        setCountdownAction("resumeWorkout");
        setIsCounting(true);
      } else {
        // กดหยุด
        pauseWorkoutTimers();
        setIsPaused(true);
      }
    }
  };


  const safeResumeFromOverlay = () => {
    if (overlayResumeArmedRef.current) togglePause();
  };
  const isLoggingRef = useRef(false);
  const handleNext = () => {
    if (isResting) {
      endRest();
      return;
    }

    if (isCounting) {
      // กำลัง 3-2-1 อยู่ แล้วผู้ใช้กด "เริ่มเลย"
      setIsCounting(false);
      setIsPaused(false);

      if (countdownAction === "startNew") {
        setIsPlaying(true);
        startWorkoutTimersForCurrent();
      } else if (countdownAction === "resumeWorkout") {
        setIsPlaying(true);
        resumeWorkoutTimers();
      } else if (countdownAction === "resumeRest") {
        setIsResting(true);
        resumeRestTimers();
      }
      return;
    }

    if (isPlaying) {
      const cur = exercises[currentExercise];
      const isDuration = cur?.duration > 0 || cur?.type === 'time';
      if (isDuration && remainingMsRef.current > 0) {
        setPopupInfo({
          title: "ยืนยันการข้าม",
          text: "เวลาของท่านี้ยังไม่หมด คุณแน่ใจหรือไม่ที่จะข้ามไปยังท่าถัดไป?",
          showCancel: true,
          confirmText: "แน่ใจ, ข้ามเลย",
          onConfirm: () => {
            setPopupInfo(null);
            onWorkoutEnded();
          },
          onCancel: () => setPopupInfo(null)
        });
        return;
      }
      onWorkoutEnded();
      return;
    }
  };


  const handlePrev = () => {
    stopCamera();
    resetAllTimers();
    const prev = Math.max(0, currentExercise - 1);
    setCurrentExercise(prev);
    setCurrentSet(1);
    setAccumulatedSeconds(0);
    setIsPaused(false);
    setIsResting(false);
    setIsPlaying(false);
    setIsCounting(false);

    if (prev === 0) {
      setIsResting(true);
      const firstRest = exercises[0]?.rest > 0 ? exercises[0].rest : REST_BASE_SEC;
      startRest(0, firstRest);
    } else {
      setCountdownAction("startNew");   // ✅ เริ่มท่าใหม่
      setIsCounting(true);
      setCountdown(3);
    }
  };

  const handleAcceptGuide = async () => {
    const key = `hasSeenGuide:${programId}`;
    localStorage.setItem(key, "true");
    setShowGuide(false); setGuideMode("peek");
    // try { await startSessionIfNeeded("program"); } catch (e) { }
    // Start initial rest phase ONLY after user confirms
    if (exercises.length > 0) {
      setCurrentExercise(0);
      setIsResting(true);
      setIsPlaying(false);
      setIsCounting(false);
      setIsPaused(false);
      const firstRest = exercises[0]?.rest > 0 ? exercises[0].rest : REST_BASE_SEC;
      startRest(0, firstRest);
    }
  };

  const handleCloseGuide = () => {
    setShowGuide(false);
    if (guideMode !== "peek") return;
    const phase = pausedPhaseRef.current;
    pausedPhaseRef.current = null;
    setIsPaused(false);
    if (phase === "rest") resumeRestTimers();
    if (phase === "play") resumeWorkoutTimers();
    if (phase === "countdown") setIsCounting(true);
  };

  const openGuidePeek = () => {
    setShowGuide(true); setGuideMode("peek"); pausedPhaseRef.current = null;
    if (isResting && !isPaused) { pauseRestTimers(); setIsPaused(true); pausedPhaseRef.current = "rest"; }
    else if (isPlaying && !isPaused) { pauseWorkoutTimers(); setIsPaused(true); pausedPhaseRef.current = "play"; }
    else if (isCounting) { setIsCounting(false); pausedPhaseRef.current = "countdown"; }
  };

  const startDrawLoop = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return; // Note: Canvas ref is unused in render currently but kept for future logic
    // ... logic for drawing ...
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("idle");
  };

  /* =========================================
     SECTION 6: Render Components (In-file)
     ========================================= */

  if (isLoading) return <LoadingScreen />;
  if (!program || exercises.length === 0) return <ErrorScreen error={loadError} />;

  const current = exercises[currentExercise];
  const nextEx = currentExercise < exercises.length - 1 ? exercises[currentExercise + 1] : null;

  // -- Render Helpers --
  const renderOverlay = () => (
    isPaused && isResting && !showGuide && (
      <div
        className="wp-overlay wp-overlay--dark"
        role="button"
        tabIndex={0}
        onClick={safeResumeFromOverlay} // คลิกพื้นที่ว่างก็เล่นต่อได้
      >
        <div className="wp-overlay-card" onClick={(e) => e.stopPropagation()}>
          {/* ^ e.stopPropagation() เพื่อไม่ให้คลิกที่การ์ดแล้วไปซ้อนกับคลิกพื้นหลัง */}
          <div className="wp-overlay-name">หยุดชั่วคราว</div>
          <button
            className="wp-overlay-play-btn"
            onClick={togglePause}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="wp-overlay-play-icon">
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
            </svg>
          </button>
          <div className="wp-overlay-hint">กดปุ่มเพื่อเล่นต่อ</div>
        </div>
      </div>
    )
  );

  return (
    <div className="wp-container">
      {showGuide && <CameraGuide mode={guideMode} images={["/images/infographic.webp", "/images/infographic2.webp"]} onAccept={handleAcceptGuide} onClose={handleCloseGuide} />}

      <Header
        title={program.name}
        current={currentExercise + 1}
        total={exercises.length}
        progress={overallProgress}
        onBack={() => window.history.back()}
        onGuide={openGuidePeek}
        availableVoices={availableVoices}
        selectedVoiceURI={selectedVoiceURI}
        onVoiceChange={handleVoiceChange}
      />

      {isCounting && (
        <div className="wp-countdown-overlay">
          <div className="wp-countdown-content">
            <h2 className="wp-exercise-name">{current?.name}</h2>
            <div className="wp-countdown-circle"><div key={countdown} className="wp-countdown-number">{countdown}</div></div>
            <p className="wp-countdown-text">เตรียมพร้อม...</p>
          </div>
        </div>
      )}

      {isPlaying && (
        <main className="wp-main">
          {/* ส่วน Header บอกชื่อท่าและเวลา คงเดิมไว้ */}
          <div className="wp-exercise-header">
            <h2 className="wp-current-exercise-name" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span>{current?.name} <span style={{ fontSize: '0.8em', color: '#ffb703', marginLeft: '8px' }}>(เซต {currentSet}/{current?.sets || 1})</span></span>
              {current?.sets || current?.reps || current?.duration || current?.rest ? (
                <div style={{ fontSize: "0.6em", fontWeight: "normal", opacity: 0.8, marginTop: "4px" }}>
                  {[
                    current?.sets ? `${current.sets} เซ็ต` : null,
                    current?.reps ? `${current.reps} ครั้ง` : null,
                    current?.duration ? (current.duration < 60 ? `${current.duration} วินาที` : `${Math.floor(current.duration / 60)} นาที ${current.duration % 60 !== 0 ? (current.duration % 60) + ' วินาที' : ''}`.trim()) : null,
                    current?.rest ? `พัก ${current.rest} วิ` : null
                  ].filter(Boolean).join(" | ")}
                </div>
              ) : null}
            </h2>
            <div className="wp-exercise-stats">
              {(current?.duration > 0 || current?.type === 'time') && currentDurationMsRef.current > 0 && (
                <CountdownWheel
                  timeRemaining={timeRemaining}
                  totalDuration={current?.duration || Math.ceil(currentDurationMsRef.current / 1000)}
                />
              )}
            </div>

          </div>

          {/* ✅ เปลี่ยนส่วนแสดงผลวิดีโอตรงนี้ เป็น Layout ใหม่ */}
          <div className="media-content">

            {/* 1. วิดีโอท่าออกกำลังกาย */}
            <div className="video-wrapper exercise-video">
              {current?.video || current?.imageUrl ? (
                <video
                  className="video-player"
                  src={current?.video}
                  poster={current?.imageUrl}
                  autoPlay
                  muted
                  playsInline
                  loop
                />
              ) : (
                <div className="wp-placeholder-video"><span>ไม่มีวิดีโอ</span></div>
              )}
              <div className="video-label">ท่าตัวอย่าง</div>
            </div>

            {/* 2. กล้องผู้ใช้ + AI Overlay */}
            <div className="video-wrapper camera-video-wrapper">

              {/* Layer 1: วิดีโอกล้องจริง (อยู่ล่างสุด) */}


              {/* Layer 2: AI Logic Overlay (ทับอยู่ข้างบน) */}
              {/* ต้องมี pointer-events-none เพื่อให้คลิกทะลุได้ (ถ้าจำเป็น) */}
              <div className="ai-overlay" style={{ pointerEvents: 'none' }}>
                <ExerciseCameraManager
                  exerciseName={current?.name}
                  isActive={isPlaying && !isPaused}
                  targetReps={current?.reps || current?.value || 10}
                  onRepComplete={handleRepComplete}
                  onSetComplete={handleSetComplete}
                  //อันนี้พึ่งเพิ่ม
                  targetTimePerSet={current.duration}
                  onWorkoutComplete={onWorkoutEnded}
                />
              </div>

              {/* Layer 3: UI Label (อยู่บนสุด) */}
              <div className="video-label">กล้องของคุณ</div>

              {/* Loading / Error States */}
              {cameraStatus === "loading" && (
                <div className="wp-overlay wp-overlay--muted">
                  <div className="wp-overlay-card">กำลังเตรียมกล้อง...</div>
                </div>
              )}
              {cameraStatus === "error" && (
                <div className="wp-overlay wp-overlay--error">
                  <div className="wp-overlay-card">เปิดกล้องไม่สำเร็จ</div>
                </div>
              )}
            </div>

          </div>
        </main>
      )}

      {isResting && exercises[nextIndexRef.current ?? 0] && (
        <main className="wp-main">
          <div className="wp-scroll-area">
            <div className="wp-exercise-header">
              <h2 className="wp-current-exercise-name">
                {exercises[nextIndexRef.current]?.name}
                <span style={{ fontSize: '0.8em', color: '#ffb703', marginLeft: '8px' }}>(เซต {currentSet}/{exercises[nextIndexRef.current]?.sets || 1})</span>
                {exercises[nextIndexRef.current]?.sets || exercises[nextIndexRef.current]?.reps || exercises[nextIndexRef.current]?.duration || exercises[nextIndexRef.current]?.rest ? (
                  <div style={{ fontSize: "0.6em", fontWeight: "normal", opacity: 0.8, marginTop: "4px" }}>
                    {[
                      exercises[nextIndexRef.current]?.sets ? `${exercises[nextIndexRef.current].sets} เซ็ต` : null,
                      exercises[nextIndexRef.current]?.reps ? `${exercises[nextIndexRef.current].reps} ครั้ง` : null,
                      exercises[nextIndexRef.current]?.duration ? (exercises[nextIndexRef.current].duration < 60 ? `${exercises[nextIndexRef.current].duration} วินาที` : `${Math.floor(exercises[nextIndexRef.current].duration / 60)} นาที ${exercises[nextIndexRef.current].duration % 60 !== 0 ? (exercises[nextIndexRef.current].duration % 60) + ' วินาที' : ''}`.trim()) : null,
                      exercises[nextIndexRef.current]?.rest ? `พัก ${exercises[nextIndexRef.current].rest} วิ` : null
                    ].filter(Boolean).join(" | ")}
                  </div>
                ) : null}
              </h2>
              <div className="wp-exercise-stats">
                <div className="wp-rest-timer-row">
                  <div className="wp-time-remaining">
                    <span className="wp-time-number">{restRemaining}</span>
                    <span className="wp-time-unit">วินาที</span>
                  </div>
                  <button className="wp-btn wp-btn-primary" onClick={() => addRestSeconds(10)}>
                    {currentExercise === 0 ? "เพิ่มเวลาเตรียมตัว 10 วินาที" : "เพิ่มเวลาพัก 10 วินาที"}
                  </button>
                </div>
                <ProgressRing progress={restProgress} />
              </div>
            </div>

            <div className="wp-media-container">
              <video
                className="wp-media"
                src={exercises[nextIndexRef.current]?.video}
                poster={exercises[nextIndexRef.current]?.imageUrl}
                autoPlay muted playsInline loop
              />
            </div>
            {/* {isPaused && !showGuide && (
              <div className="wp-overlay wp-overlay--dark"
                role="button"
                tabIndex={0}
                onClick={safeResumeFromOverlay}
              >
                <div className="wp-overlay-card" onClick={(e) => e.stopPropagation()}>
                  <div className="wp-overlay-name">วินาทีวินาที</div>
                  <button
                    className="wp-overlay-play-btn"
                    onClick={togglePause}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                    </svg>
                    <span>วินาที?</span>
                  </button>

                </div>
              </div>
            )} */}
          </div>
        </main>
      )}

      {/* Controls: แสดงเฉพาะเมื่อไม่ได้โชว์ feedback modal */}
      {!showFeedbackModal && (
        <Controls
          onPrev={handlePrev}
          onNext={handleNext}
          onTogglePause={togglePause}
          isPaused={isPaused}
          canPrev={currentExercise > 0}
          mainButtonLabel={isResting ? "ข้ามพัก" : isCounting ? "เริ่มเลย" : isPlaying ? "จบท่านนี้" : "ถัดไป"}
          showPlayPause={isResting || isPlaying}
        />
      )}
      {showFeedbackModal && (
        <div className="wp-overlay wp-overlay--dark" role="dialog" aria-modal="true">
          <div className="wp-feedback-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="wp-feedback-title">บันทึกผลการฝึก</h2>

            <h3 className="wp-feedback-subtitle" style={{ fontSize: '1rem', color: '#aaa', marginBottom: '15px' }}>
              ความยากของโปรแกรมนี้
            </h3>
            <div className="wp-feedback-actions">
              <button
                className="wp-feedback-btn wp-feedback-btn--easy"
                disabled={sendingFeedback}
                onClick={() => handlePickFeedback("easy")}
              >
                <div className="sentiment-icon happy">
                  <Smile size={22} />
                </div>
                ง่ายมาก
              </button>
              <button
                className="wp-feedback-btn wp-feedback-btn--medium"
                disabled={sendingFeedback}
                onClick={() => handlePickFeedback("medium")}
              >
                <div className="sentiment-icon neutral">
                  <Meh size={22} />
                </div>
                ปานกลาง
              </button>
              <button
                className="wp-feedback-btn wp-feedback-btn--hard"
                disabled={sendingFeedback}
                onClick={() => handlePickFeedback("hard")}
              >
                <div className="sentiment-icon sad">
                  <Frown size={22} />
                </div>
                ยากมาก
              </button>
            </div>
            {sendingFeedback && <div className="wp-feedback-loading">กำลังบันทึก...</div>}
          </div>
        </div>
      )}

      {popupInfo && (
        <div className="wp-overlay wp-overlay--dark" role="dialog" aria-modal="true" style={{ zIndex: 9999 }}>
          <div className="wp-overlay-card" style={{ maxWidth: '600px', padding: '2rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#000000' }}>{popupInfo.title}</h3>
            <p style={{ marginTop: '25px', color: '#000000' }}>{popupInfo.text}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {popupInfo.showCancel && (
                <button
                  className="wp-btn"
                  style={{ background: '#D0312D', color: '#fff', padding: '8px 16px', borderRadius: '8px' }}
                  onClick={popupInfo.onCancel}
                >
                  {popupInfo.cancelText || "ยกเลิก"}
                </button>
              )}
              <button
                className="wp-btn"
                style={{ background: '#6366f1', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold' }}
                onClick={popupInfo.onConfirm}
              >
                {popupInfo.confirmText || "ตกลง"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Render Helper Components ---
const LoadingScreen = () => (
  <div className="wp-loading-screen">
    <div className="wp-loading-content">
      <div className="wp-spinner"><div className="wp-spinner-ring"></div><div className="wp-spinner-ring"></div><div className="wp-spinner-ring"></div></div>
      <div className="wp-loading-title">กำลังโหลดโปรแกรม...</div>
    </div>
  </div>
);

const ErrorScreen = ({ error }) => (
  <div className="wp-error-screen">
    <div className="wp-error-content">
      <div className="wp-error-icon">⚠️</div>
      <h2>ไม่พบข้อมูลโปรแกรม</h2>
      {error && <p>{error.message}</p>}
    </div>
  </div>
);

const Header = ({ title, current, total, progress, onBack, onGuide, availableVoices, selectedVoiceURI, onVoiceChange }) => (
  <header className="wp-header">
    <div className="wp-header-content">
      <button className="wp-back-btn" onClick={onBack}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      <div className="wp-header-info">
        <h1 className="wp-program-title">{title}</h1>
        <div className="wp-progress-info">
          <span className="wp-exercise-counter">{current}/{total}</span>
          <div className="wp-overall-progress">
            <div className="wp-overall-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {availableVoices && availableVoices.length > 0 && (
        <select
          value={selectedVoiceURI}
          onChange={onVoiceChange}
          className="wp-voice-select"
          title="เลือกเสียงพูด"
          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', marginRight: '10px', fontSize: '0.85rem', maxWidth: '150px', background: '#1f2937', color: 'white' }}
        >
          {availableVoices.map(v => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name.replace(/Google |Microsoft /g, '')}
            </option>
          ))}
        </select>
      )}

      <button className="wp-sound-btn" onClick={onGuide} title="วิธีฝึก">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.236c-.9.41-1.5 1.08-1.5 1.764V14" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="17" r="1" fill="currentColor" /></svg>
      </button>
    </div>
  </header>
);

const Controls = ({
  onPrev,
  onNext,
  onTogglePause,
  isPaused,
  canPrev,
  mainButtonLabel,
  showPlayPause
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const controlsRef = useRef(null);

  return (
    <footer
      ref={controlsRef}
      className={`wp-controls ${isCollapsed ? 'is-collapsed' : ''}`}
    >
      {/* --- Buttons Area --- */}
      <div className="wp-controls-body">
        {/* ปุ่มย้อนกลับ */}
        <button
          className="wp-control-btn wp-control-btn-secondary"
          onClick={onPrev}
          disabled={!canPrev}
          style={{ position: 'relative', zIndex: 10 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" />
          </svg>
          <span>ก่อนหน้า</span>
        </button>

        {/* ปุ่ม Play/Pause */}
        {showPlayPause && (
          <button
            className={`wp-control-btn wp-control-btn-circle ${isPaused ? "play" : "pause"}`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePause();
            }}
            style={{ position: 'relative', zIndex: 10 }}
          >
            {isPaused ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            )}
          </button>
        )}

        {/* ปุ่มถัดไป */}
        <button
          className="wp-control-btn wp-control-btn-primary"
          onClick={onNext}
          style={{ position: 'relative', zIndex: 10 }}
        >
          <span>{mainButtonLabel}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
      </div>
    </footer>
  );
};