import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineSearch, AiOutlineClockCircle } from "react-icons/ai";
import { IoFitnessOutline } from "react-icons/io5";
import { BsLightning, BsFire, BsArrowRight, BsCheckCircleFill } from "react-icons/bs";
import { useUserAuth } from "../../../context/UserAuthContext";
import axios from "axios";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase'; // ต้องเพิ่ม import ตัวนี้ด้วย
import { getMediaUrl } from "../../Detail Section/Detail/Detail.jsx";
import "./top.css";
import "../../style/global.css";
import Swal from "sweetalert2";

const getDayLabel = (day) => {
  if (!day) return "";
  const days = {
    monday: "จันทร์", tuesday: "อังคาร", wednesday: "พุธ", thursday: "พฤหัสบดี",
    friday: "ศุกร์", saturday: "เสาร์", sunday: "อาทิตย์"
  };
  return days[day.toLowerCase()] || day;
};

export const Top = () => {
  const { user } = useUserAuth();

  const [displayName, setDisplayName] = useState("");
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All"); // default เป็น All
  const [userStats, setUserStats] = useState({ caloriesBurned: 0, workoutsDone: 0 });
  const [dailyPlan, setDailyPlan] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);
  const [previewExercise, setPreviewExercise] = useState(null); // State for exercise preview modal
  const [showSwapModal, setShowSwapModal] = useState(false); // State for swap plan modal

  // 🆕 14-Day Calendar State
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [overviewDays, setOverviewDays] = useState([]);
  const [lastCheckDate, setLastCheckDate] = useState(null); // ตัวแปรคุมการ fetch overview

  // ดึงชื่อจาก Firestore และสถิติผู้ใช้จาก MongoDB
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;

      try {
        // 1. ดึงข้อมูลจาก Firestore ก่อน
        let firestoreName = "";
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists() && docSnap.data().name) {
            firestoreName = docSnap.data().name;
          }
        } catch (firestoreError) {
          console.error("Error fetching user data from Firestore:", firestoreError);
        }

        // 2. ดึงข้อมูลจาก MongoDB
        try {
          const response = await fetch(`/api/users/${user.uid}`);
          if (response.ok) {
            const data = await response.json();

            // เลือกชื่อตามลำดับความสำคัญ: Firestore > MongoDB > Auth > Email
            const finalName =
              firestoreName ||
              data?.name ||
              user.displayName ||
              (user.email ? user.email.split("@")[0] : "ไม่ทราบชื่อ");

            setDisplayName(finalName);
            setUserStats({
              caloriesBurned: data.caloriesBurned || 0,
              workoutsDone: data.workoutsDone || 0,
            });
          } else {
            throw new Error(`ไม่พบผู้ใช้ หรือเกิดข้อผิดพลาด: ${response.status}`);
          }
        } catch (mongoError) {
          console.error("Error fetching user data from MongoDB:", mongoError);

          // ถ้าดึงข้อมูลจาก MongoDB ไม่ได้ แต่มีชื่อจาก Firestore แล้ว
          if (firestoreName) {
            setDisplayName(firestoreName);
          } else {
            // ใช้ชื่อจาก Auth หรืออีเมลเป็นตัวเลือกสุดท้าย
            setDisplayName(user.displayName || (user.email ? user.email.split("@")[0] : "ไม่ทราบชื่อ"));
          }
        }
      } catch (error) {
        console.error("Error in fetchUserData:", error);
        // กรณีเกิดข้อผิดพลาดในภาพรวม ใช้ข้อมูลจาก Auth ตามปกติ
        setDisplayName(user.displayName || (user.email ? user.email.split("@")[0] : "ไม่ทราบชื่อ"));
      }
    };

    fetchUserData();
  }, [user]);

  // ดึงโปรแกรมทั้งหมด
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await fetch("/api/workout_programs");
        const data = await response.json();
        setPrograms(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching programs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrograms();
  }, []);

  const fetchDailyPlan = async (dateStr) => {
    if (!user?.uid) {
      setPlanLoading(false);
      return;
    }
    try {
      setPlanLoading(true);
      const targetDate = dateStr || selectedDate;
      const res = await fetch(`/api/daily-plan/${user.uid}?date=${targetDate}`);
      if (res.ok) {
        const data = await res.json();
        setDailyPlan(data);
      }
    } catch (err) {
      console.error("Error fetching daily plan:", err);
    } finally {
      setPlanLoading(false);
    }
  };

  const fetchOverview = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch(`/api/daily-plan/overview/${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        setOverviewDays(data.days || []);
      }
    } catch (err) {
      console.error("Error fetching overview:", err);
    }
  };

  // ดึง Daily Plan เมื่อ User หรือ SelectedDate เปลี่ยน
  useEffect(() => {
    fetchDailyPlan(selectedDate);
    fetchOverview(); // ดึง Overview เสมอเพื่อให้สถานะอัปเดต
  }, [user, selectedDate]);

  const handleDaySwap = async (day) => {
    if (!user?.uid || planLoading) return;
    try {
      setPlanLoading(true);
      await axios.post(`/api/daily-plan/${user.uid}/swap`, { targetDay: day });
      await fetchDailyPlan(selectedDate); // โหลดข้อมูลใหม่ของวันที่เลือก
      await fetchOverview();
    } catch (err) {
      console.error("Error swapping plan:", err);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleSetRestDay = async () => {
    if (!user?.uid) return;
    try {
      const result = await Swal.fire({
        title: 'เปลี่ยนเป็นวันพัก?',
        text: "คุณต้องการเปลี่ยนแผนของวันนี้ให้เป็นวันพักผ่อนใช่หรือไม่?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2B5876',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ใช่, พักผ่อน!',
        cancelButtonText: 'ยกเลิก'
      });

      if (result.isConfirmed) {
        setPlanLoading(true);
        await axios.post(`/api/daily-plan/${user.uid}/set-rest`, { date: selectedDate });
        await fetchDailyPlan(selectedDate);
        await fetchOverview();
        Swal.fire('สำเร็จ!', 'เปลี่ยนเป็นวันพักเรียบร้อยแล้ว', 'success');
      }
    } catch (err) {
      console.error("Error setting rest day:", err);
      Swal.fire('ผิดพลาด', 'ไม่สามารถเปลี่ยนเป็นวันพักได้', 'error');
    } finally {
      setPlanLoading(false);
    }
  };

  const dayNamesTH = {
    monday: "จ.", tuesday: "อ.", wednesday: "พ.", thursday: "พฤ.", friday: "ศ.", saturday: "ส.", sunday: "อา."
  };

  const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayStr = new Date().toLocaleDateString('en-CA');

  const categories = [
    { label: "🌟 โปรแกรมทั้งหมด", value: "All" },
    { label: "💪 โปรแกรมช่วงบน", value: "โปรแกรมช่วงบน" },
    { label: "🦵 โปรแกรมช่วงล่าง", value: "โปรแกรมช่วงล่าง" },
    { label: "🔥 โปรแกรมหน้าท้อง", value: "โปรแกรมหน้าท้อง" },
    { label: "🔥 ลดไขมัน", value: "ลดไขมัน" },
    { label: "💪 เพิ่มกล้าม", value: "เพิ่มกล้าม" },
    { label: "🍑 กระชับก้น & ขา", value: "กระชับก้น & ขา" }
  ];

  const filteredPrograms = programs.filter((program) => {
    // เพิ่มการค้นหาด้วย searchTerm
    const matchesSearch = searchTerm === "" ||
      (program.name && program.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (program.description && program.description.toLowerCase().includes(searchTerm.toLowerCase()));

    // กรองตามหมวดหมู่
    const matchesCategory = selectedCategory === "All" ||
      (program.category && program.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase());

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="top">
      <div className="hero-section">
        <div className="hero-background">
          <div className="noise-texture"></div>
          <div className="glass-shape floating-shape-1"></div>
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>

        <div className="topDiv">
          <div className="titleText">
            <div className="greeting-container">
              <span className="greeting-emoji">💪</span>
              <span className="title">ยินดีต้อนรับ {displayName}!</span>
            </div>
            <h2 className="today-plan-title">
              พร้อมที่จะ <span className="highlight">ออกกำลังกาย</span>?
            </h2>
            <p className="motivation-text">มาขยับร่างกายกันดีกว่า!</p>
          </div>

          <div className="search-container">
            <div className="searchInput">
              <AiOutlineSearch className="search-icon" />
              <input
                type="text"
                placeholder="ค้นหาโปรแกรมออกกำลังกาย..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="search-glow"></div>
            </div>
          </div>
        </div>

        <div className="category-filter">
          {categories.map(({ label, value }) => (
            <button
              key={value}
              className={`category-btn ${selectedCategory === value ? "active" : ""}`}
              onClick={() => setSelectedCategory(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* --- DAILY PLAN UI --- */}
      <div className="daily-plan-wrapper">

        {/* 14-Day Horizontal Calendar Picker */}
        <div className="calendar-scroll-section">
          {overviewDays.map((day) => {
            const isSelected = selectedDate === day.date;
            const isToday = day.isToday;
            const isPast = new Date(day.date) < new Date(todayStr);

            return (
              <div
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`calendar-day-bubble ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              >
                <span className="day-name">
                  {day.dayNameShort.toUpperCase()}
                </span>
                <span className="day-number">{day.dayNum}</span>

                {/* Status Icons */}
                <div className="status-icon">
                  {day.status === 'completed' && <BsCheckCircleFill style={{ color: isSelected ? '#4ade80' : '#28a745' }} />}
                  {day.status === 'rest' && <span>🛁</span>}
                  {day.status === 'pending' && isPast && <span style={{ opacity: 0.5 }}>➖</span>}
                </div>
              </div>
            );
          })}
        </div>

        {planLoading ? (
          <div className="daily-plan-card loading">
            ⏳ กำลังประเมินภารกิจประจำวันให้คุณ...
          </div>
        ) : dailyPlan && dailyPlan.exercises && dailyPlan.exercises.length > 0 ? (
          <div className={`daily-plan-card glass-panel ${dailyPlan.status === 'completed' ? 'completed' : ''}`}>
            <div className="card-top-info">
              <div className="day-info">
                <h3>
                  {selectedDate === todayStr ? 'ภารกิจของวันนี้' : `แผนสำหรับวันที่ ${new Date(selectedDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}`}
                </h3>
                <p>
                  {dailyPlan.exercises?.length > 0 ? `มีทั้งหมด ${dailyPlan.exercises.length} ท่า` : 'วันนี้เป็นวันแห่งการพักผ่อน'}
                </p>
              </div>
              {dailyPlan.status === 'completed' && <span className="status-badge">🎉 สำเร็จแล้ว</span>}
            </div>

            <div className="plan-stats">
              <span>⏱ {Math.ceil((dailyPlan.totalDuration || 0) / 60)} นาที</span>
              <span>🔥 {Math.ceil(dailyPlan.estimatedCalories || 0)} kcal</span>
              <span>💪 {dailyPlan.exercises?.length || 0} ท่า</span>
            </div>

            {/* แสดงรายชื่อท่าออกกำลังกายตรงนี้เลย ไม่ต้องกดพรีวิว */}
            <div className="daily-exercise-list">
              <ul>
                {dailyPlan.exercises.map((ex, idx) => (
                  <li key={idx} onClick={() => setPreviewExercise(ex)}>
                    <strong className="exercise-name">{idx + 1}. {ex.name}</strong>
                    <span className="exercise-meta">
                      {ex.reps > 0 ? `${ex.reps} ครั้ง` : ''}
                      {ex.reps > 0 && ex.time > 0 ? ' | ' : ''}
                      {ex.time > 0 ? `${ex.time} วิ` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ปุ่มเริ่มเล่น */}
            <div className="card-actions-row">
              {selectedDate <= todayStr ? (
                <Link to={`/WorkoutPlayer/dailyplan`} className="start-workout-btn">
                  {dailyPlan.status === 'completed' ? 'ทบทวนภารกิจอีกครั้ง' : 'เริ่มออกกำลังกายเลย! 🔥'}
                </Link>
              ) : (
                <div className="not-ready-btn">
                  ยังไม่ถึงเวลาเล่น ⏳
                </div>
              )}

              {/* ปุ่มเปลี่ยนเป็นวันพัก (ยกเว้นวันที่สำเร็จแล้ว) */}
              {dailyPlan.status !== 'completed' && (
                <button
                  onClick={handleSetRestDay}
                  className="set-rest-btn"
                >
                  💤 ไม่สะดวกเล่น? เปลี่ยนเป็นวันพัก
                </button>
              )}
            </div>
          </div>
        ) : dailyPlan ? (
          <div className="daily-plan-card rest-day glass-panel">
            <div className="tip-box">
              💡 การพักผ่อนช่วยให้กล้ามเนื้อได้ซ่อมแซมและเติบโต
            </div>
            <div
              onClick={() => document.getElementById('programs-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="hint-box"
            >
              👇 หากต้องการเล่น เลือกเล่นได้จากโปรแกรมด้านล่างครับ
            </div>

            {/* ปุ่มสลับแผนสำหรับคนอยากเล่น */}
            {selectedDate === todayStr && dailyPlan.availableWorkoutDays?.length > 0 && (
              <button
                onClick={() => setShowSwapModal(true)}
                className="swap-plan-btn"
              >
                อยากออกกำลังกายวันนี้ไหม
              </button>
            )}
          </div>
        ) : (
          <div className="daily-plan-card no-plan glass-panel">
            <h3>📋 ยังไม่มีแผนการออกกำลังกาย</h3>
            <p>ทำแบบทดสอบเพื่อสร้างแผนการฝึกที่เหมาะกับคุณ</p>
            <Link to="/onboarding" className="create-plan-btn">
              สร้างแผนการฝึกเลย 🔥
            </Link>
          </div>
        )}
      </div>

      {/* --- EXERCISE PREVIEW MODAL --- */}
      {previewExercise && (
        <div className="modal-overlay" onClick={() => setPreviewExercise(null)}>
          <div className="exercise-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setPreviewExercise(null)}>✕</button>
            <h3>{previewExercise.name}</h3>

            <div className="exercise-video-container">
              {(previewExercise.exerciseId?.videoUrl || previewExercise.exerciseId?.media?.videoUrl) ? (
                <video src={getMediaUrl(previewExercise.exerciseId.videoUrl || previewExercise.exerciseId.media.videoUrl)} autoPlay loop muted playsInline />
              ) : (
                <div className="no-video-text">ไม่มีวิดีโอตัวอย่าง</div>
              )}
            </div>

            <div className="exercise-instructions">
              <h4>คำแนะนำการฝึก:</h4>
              <p>
                {previewExercise.exerciseId?.description || "ไม่มีคำแนะนำสำหรับท่านี้"}
              </p>
            </div>

            <div className="exercise-target">
              <div className="target-item">
                <div className="label">จำนวนครั้ง</div>
                <div className="value">{previewExercise.reps > 0 ? `${previewExercise.reps} ครั้ง` : '-'}</div>
              </div>
              <div className="target-item">
                <div className="label">เวลา</div>
                <div className="value">{previewExercise.time > 0 ? `${previewExercise.time} วิ` : '-'}</div>
              </div>
              <div className="target-item">
                <div className="label">เผาผลาญ</div>
                <div className="value calories">~{Math.ceil((previewExercise.met * 70 * (previewExercise.time || 30)) / 3600)} kcal</div>
              </div>
            </div>

            <button className="modal-action-btn" onClick={() => setPreviewExercise(null)}>
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}

      {/* --- SWAP PLAN MODAL --- */}
      {showSwapModal && (
        <div className="modal-overlay" onClick={() => setShowSwapModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>💪 อยากเล่นวันไหน?</h2>
            <p>เลือกแผนจากวันปกติของคุณ มาสลับเล่นในวันนี้ได้เลยครับ</p>

            <div className="swap-grid">
              {dailyPlan.availableWorkoutDays.map((day) => (
                <button
                  key={day}
                  disabled={planLoading}
                  className="swap-day-btn"
                  onClick={async () => {
                    await handleDaySwap(day);
                    setShowSwapModal(false);
                    Swal.fire({
                      icon: 'success',
                      title: 'สลับแผนสำเร็จ!',
                      text: `คุณได้ดึงแผนของวัน${getDayLabel(day)} มาเล่นในวันนี้แล้ว`,
                      timer: 2000,
                      showConfirmButton: false
                    });
                  }}
                >
                  วัน{getDayLabel(day)}
                </button>
              ))}
            </div>

            <button
              className="modal-action-btn secondary"
              onClick={() => setShowSwapModal(false)}
              style={{ background: '#eee', color: '#555' }}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <BsLightning />
            </div>
            <div className="stat-info">
              <h3>{userStats.caloriesBurned}</h3>
              <p>Calories Burned</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <IoFitnessOutline />
            </div>
            <div className="stat-info">
              <h3>{userStats.workoutsDone}</h3>
              <p>Workouts Done</p>
            </div>
          </div>
        </div>
      </div> */}

      <div id="programs-section" className="programs-section">
        <div className="section-header">
          <h2>{categories.find((cat) => cat.value === selectedCategory)?.label || "🌟 แนะนำผู้เริ่มต้น"}</h2>
        </div>

        <div className="cardsDiv">
          <div className="programs-grid">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Loading amazing workouts...</p>
                </div>
              </div>
            ) : filteredPrograms.length > 0 ? (
              filteredPrograms.map((program, index) => {
                // Mock stats if not available in program object
                const duration = program.duration || Math.floor(Math.random() * 30 + 15) + " นาที";
                const calories = program.calories || Math.floor(Math.random() * 200 + 100) + " kcal";

                return (
                  <div
                    key={program?._id || index}
                    className="workout-card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="card-image-wrapper">
                      <img
                        src={
                          program?.image
                            ? getMediaUrl(program.image)
                            : "/default.jpg"
                        }
                        alt={program?.name}
                        className="card-image"
                      />
                      <div className="card-badges-overlay">
                        <span className="badge-overlay time"><AiOutlineClockCircle /> {program.duration} นาที</span>
                        <span className="badge-overlay calories"><BsFire /> {program.caloriesBurned} kcal</span>
                      </div>
                    </div>

                    <div className="card-content">
                      <div className="card-info">
                        <div className="header-row">
                          <h3 className="program-name">{program?.name}</h3>
                        </div>
                        <p className="program-description">
                          {program?.description || "Transform your body with this amazing workout routine"}
                        </p>
                      </div>

                      <div className="card-actions">
                        <Link to={`/detail/${program?._id}`} className="start-program-btn">
                          <span>เริ่มโปรแกรม</span>
                          <BsArrowRight className="arrow-icon" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-results">
                <p>ไม่พบโปรแกรมที่ตรงกับการค้นหา</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};