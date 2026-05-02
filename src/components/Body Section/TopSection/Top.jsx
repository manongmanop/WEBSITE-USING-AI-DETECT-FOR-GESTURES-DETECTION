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

  const dayNamesTH = {
    monday: "จ.", tuesday: "อ.", wednesday: "พ.", thursday: "พฤ.", friday: "ศ.", saturday: "ส.", sunday: "อา."
  };

  const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayStr = new Date().toLocaleDateString('en-CA');

  const categories = [
    { label: "🌟 ทั้งหมด", value: "All" },
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
                placeholder="Search workouts..."
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
      <div className="daily-plan-wrapper" style={{ margin: '1rem', marginTop: '-2rem', zIndex: 10, position: 'relative' }}>

        {/* 14-Day Horizontal Calendar Picker */}
        <div className="calendar-scroll-section" style={{
          display: 'flex', gap: '10px', marginBottom: '12px', overflowX: 'auto', padding: '10px 4px',
          scrollbarWidth: 'none', msOverflowStyle: 'none'
        }}>
          {overviewDays.map((day) => {
            const isSelected = selectedDate === day.date;
            const isToday = day.isToday;
            const isPast = new Date(day.date) < new Date(todayStr);

            return (
              <div
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`calendar-day-bubble ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                style={{
                  minWidth: '55px', height: '70px', borderRadius: '14px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  transition: '0.3s', flexShrink: 0,
                  background: isSelected ? 'linear-gradient(135deg, #2B5876 0%, #4E4376 100%)' : 'rgba(255,255,255,0.85)',
                  color: isSelected ? 'white' : '#555',
                  boxShadow: isSelected ? '0 6px 15px rgba(43,88,118,0.3)' : '0 2px 5px rgba(0,0,0,0.05)',
                  border: isToday && !isSelected ? '2px solid #2B5876' : 'none'
                }}
              >
                <span style={{ fontSize: '0.65rem', marginBottom: '2px', opacity: isSelected ? 0.9 : 0.7, fontWeight: 'bold' }}>
                  {day.dayNameShort.toUpperCase()}
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>{day.dayNum}</span>

                {/* Status Icons */}
                <div style={{ marginTop: '2px', fontSize: '0.8rem' }}>
                  {day.status === 'completed' && <BsCheckCircleFill style={{ color: isSelected ? '#4ade80' : '#28a745' }} />}
                  {day.status === 'rest' && <span>🛁</span>}
                  {day.status === 'pending' && isPast && <span style={{ opacity: 0.5 }}>➖</span>}
                </div>
              </div>
            );
          })}
        </div>

        {planLoading ? (
          <div className="daily-plan-card loading" style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.7)', borderRadius: '1rem' }}>
            ⏳ กำลังประเมินภารกิจประจำวันให้คุณ...
          </div>
        ) : dailyPlan && dailyPlan.exercises && dailyPlan.exercises.length > 0 ? (
          <div className={`daily-plan-card glass-panel ${dailyPlan.status === 'completed' ? 'completed' : ''}`} style={{ padding: '1.5rem', borderRadius: '1rem', background: dailyPlan.status === 'completed' ? 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' : 'rgba(255, 255, 255, 0.9)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card-top-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div className="day-info">
                <h3 style={{ fontSize: '1.2rem', color: '#2B5876', fontWeight: '800' }}>
                  {selectedDate === todayStr ? 'ภารกิจของวันนี้' : `แผนสำหรับวันที่ ${new Date(selectedDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}`}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#777' }}>
                  {dailyPlan.exercises?.length > 0 ? `มีทั้งหมด ${dailyPlan.exercises.length} ท่า` : 'วันนี้เป็นวันแห่งการพักผ่อน'}
                </p>
              </div>
              {dailyPlan.status === 'completed' && <span className="status-badge" style={{ background: '#28a745', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 'bold' }}>🎉 สำเร็จแล้ว</span>}
            </div>

            <div className="plan-stats" style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#555', marginBottom: '0.5rem' }}>
              <span>⏱ {Math.ceil((dailyPlan.totalDuration || 0) / 60)} นาที</span>
              <span>🔥 {Math.ceil(dailyPlan.estimatedCalories || 0)} kcal</span>
              <span>💪 {dailyPlan.exercises?.length || 0} ท่า</span>
            </div>

            {/* แสดงรายชื่อท่าออกกำลังกายตรงนี้เลย ไม่ต้องกดพรีวิว */}
            <div className="daily-exercise-list" style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
                {dailyPlan.exercises.map((ex, idx) => (
                  <li key={idx} onClick={() => setPreviewExercise(ex)} style={{ background: 'rgba(0,0,0,0.04)', padding: '0.8rem', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: '0.2s', border: '1px solid transparent' }} onMouseEnter={(e) => e.currentTarget.style.border = '1px solid #2B5876'} onMouseLeave={(e) => e.currentTarget.style.border = '1px solid transparent'}>
                    <strong style={{ color: '#444', fontSize: '0.9rem' }}>{idx + 1}. {ex.name}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#007bff', fontWeight: 'bold' }}>
                      {ex.reps > 0 ? `${ex.reps} ครั้ง` : ''}
                      {ex.reps > 0 && ex.time > 0 ? ' | ' : ''}
                      {ex.time > 0 ? `${ex.time} วิ` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ปุ่มเริ่มเล่น */}
            <div style={{ marginTop: '0.5rem' }}>
              {selectedDate <= todayStr ? (
                <Link to={`/WorkoutPlayer/dailyplan`} style={{ display: 'block', padding: '0.8rem', background: '#2B5876', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' }}>
                  {dailyPlan.status === 'completed' ? 'ทบทวนภารกิจอีกครั้ง' : 'เริ่มออกกำลังกายเลย! 🔥'}
                </Link>
              ) : (
                <div style={{ padding: '0.8rem', background: '#eee', color: '#888', borderRadius: '0.5rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  ยังไม่ถึงเวลาเล่น ⏳
                </div>
              )}
            </div>
          </div>
        ) : dailyPlan ? (
          <div className="daily-plan-card rest-day glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', background: 'rgba(255, 255, 255, 0.9)', textAlign: 'center', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '1rem', background: 'rgba(43, 88, 118, 0.05)', borderRadius: '0.5rem', fontSize: '0.85rem', color: '#444', marginBottom: '1rem' }}>
              💡 การพักผ่อนช่วยให้กล้ามเนื้อได้ซ่อมแซมและเติบโต
            </div>

            {/* ปุ่มสลับแผนสำหรับคนอยากเล่น */}
            {selectedDate === todayStr && dailyPlan.availableWorkoutDays?.length > 0 && (
              <button 
                onClick={() => setShowSwapModal(true)}
                style={{ width: '100%', padding: '0.8rem', background: '#48bb78', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}
              >
                💪 ฟิตจัด! อยากดึงแผนวันอื่นมาเล่นวันนี้
              </button>
            )}
          </div>
        ) : (
          <div className="daily-plan-card no-plan glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', background: 'rgba(255, 255, 255, 0.9)', textAlign: 'center', border: '2px dashed #ccc' }}>
            <h3 style={{ color: '#666' }}>📋 ยังไม่มีแผนการออกกำลังกาย</h3>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem' }}>ทำแบบทดสอบเพื่อสร้างแผนการฝึกที่เหมาะกับคุณ</p>
            <Link to="/onboarding" style={{ display: 'inline-block', padding: '0.6rem 1.2rem', background: '#2B5876', color: 'white', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 'bold' }}>
              สร้างแผนการฝึกเลย 🔥
            </Link>
          </div>
        )}
      </div>

      {/* --- EXERCISE PREVIEW MODAL --- */}
      {previewExercise && (
        <div className="exercise-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setPreviewExercise(null)}>
          <div className="exercise-modal-content" style={{ background: 'white', padding: '1.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: '400px', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewExercise(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#eee', border: 'none', borderRadius: '50%', width: '30px', height: '30px', fontWeight: 'bold', cursor: 'pointer', color: '#555' }}>✕</button>
            <h3 style={{ margin: 0, color: '#2B5876', fontSize: '1.3rem', paddingRight: '2rem' }}>{previewExercise.name}</h3>
            
            <div className="exercise-video-container" style={{ width: '100%', borderRadius: '1rem', overflow: 'hidden', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              {(previewExercise.exerciseId?.videoUrl || previewExercise.exerciseId?.media?.videoUrl) ? (
                <video src={getMediaUrl(previewExercise.exerciseId.videoUrl || previewExercise.exerciseId.media.videoUrl)} autoPlay loop muted playsInline style={{ width: '100%', maxHeight: '250px', objectFit: 'cover' }} />
              ) : (
                <div style={{ color: '#888', fontSize: '0.9rem' }}>ไม่มีวิดีโอตัวอย่าง</div>
              )}
            </div>

            <div className="exercise-instructions" style={{ color: '#444', fontSize: '0.95rem', lineHeight: '1.5' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#333' }}>คำแนะนำการฝึก:</h4>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {previewExercise.exerciseId?.description || "ไม่มีคำแนะนำสำหรับท่านี้"}
              </p>
            </div>
            
            <div className="exercise-target" style={{ display: 'flex', gap: '1rem', background: '#f8f9fa', padding: '1rem', borderRadius: '0.8rem', marginTop: 'auto' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>จำนวนครั้ง</div>
                <div style={{ fontWeight: 'bold', color: '#333' }}>{previewExercise.reps > 0 ? `${previewExercise.reps} ครั้ง` : '-'}</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid #ddd', borderRight: '1px solid #ddd' }}>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>เวลา</div>
                <div style={{ fontWeight: 'bold', color: '#333' }}>{previewExercise.time > 0 ? `${previewExercise.time} วิ` : '-'}</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>เผาผลาญ</div>
                <div style={{ fontWeight: 'bold', color: '#ff6b6b' }}>~{Math.ceil((previewExercise.met * 70 * (previewExercise.time || 30)) / 3600)} kcal</div>
              </div>
            </div>

            <button onClick={() => setPreviewExercise(null)} style={{ padding: '0.8rem', background: '#2B5876', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' }}>
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}

      {/* --- SWAP PLAN MODAL --- */}
      {showSwapModal && (
        <div className="swap-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowSwapModal(false)}>
          <div className="swap-modal-content" style={{ background: 'white', padding: '1.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: '400px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', color: '#2B5876' }}>💪 อยากเล่นวันไหน?</h2>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>เลือกแผนจากวันปกติของคุณ มาสลับเล่นในวันนี้ได้เลยครับ</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.5rem' }}>
              {dailyPlan.availableWorkoutDays.map((day) => (
                <button
                  key={day}
                  disabled={planLoading}
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
                  style={{ padding: '1rem', background: '#f8f9fa', border: '2px solid #eee', borderRadius: '0.8rem', fontWeight: 'bold', color: '#444', cursor: planLoading ? 'not-allowed' : 'pointer', transition: '0.2s' }}
                  onMouseEnter={(e) => !planLoading && (e.currentTarget.style.borderColor = '#2B5876')}
                  onMouseLeave={(e) => !planLoading && (e.currentTarget.style.borderColor = '#eee')}
                >
                  วัน{getDayLabel(day)}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowSwapModal(false)}
              style={{ padding: '0.8rem 2rem', background: '#eee', color: '#555', border: 'none', borderRadius: '2rem', fontWeight: 'bold', cursor: 'pointer' }}
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

      <div className="programs-section">
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