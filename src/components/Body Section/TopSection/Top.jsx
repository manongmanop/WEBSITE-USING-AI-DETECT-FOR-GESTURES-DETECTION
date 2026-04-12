import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineSearch, AiOutlineClockCircle } from "react-icons/ai";
import { IoFitnessOutline } from "react-icons/io5";
import { BsLightning, BsFire, BsArrowRight } from "react-icons/bs";
import { useUserAuth } from "../../../context/UserAuthContext";
import { doc, getDoc } from 'firebase/firestore'; // เพิ่ม import สำหรับ Firestore
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

  // ดึง Daily Plan ของผู้ใช้
  useEffect(() => {
    const fetchDailyPlan = async () => {
      if (!user?.uid) return;
      try {
        setPlanLoading(true);
        const res = await fetch(`/api/daily-plan/${user.uid}`);
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
    fetchDailyPlan();
  }, [user]);

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
      </div>

      {/* --- DAILY PLAN UI --- */}
      <div className="daily-plan-wrapper" style={{ margin: '1rem', marginTop: '-2rem', zIndex: 10, position: 'relative' }}>
        {planLoading ? (
          <div className="daily-plan-card loading" style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.7)', borderRadius: '1rem' }}>
            ⏳ กำลังประเมินภารกิจประจำวันให้คุณ...
          </div>
        ) : dailyPlan && dailyPlan.exercises && dailyPlan.exercises.length > 0 ? (
          <div className={`daily-plan-card glass-panel ${dailyPlan.status === 'completed' ? 'completed' : ''}`} style={{ padding: '1.5rem', borderRadius: '1rem', background: dailyPlan.status === 'completed' ? 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' : 'rgba(255, 255, 255, 0.9)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="plan-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#333' }}>🎯 ภารกิจวันนี้</h3>
              {dailyPlan.status === 'completed' && <span className="status-badge" style={{ background: '#28a745', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 'bold' }}>🎉 สำเร็จแล้ว</span>}
            </div>
            
            <div className="plan-stats" style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#555' }}>
              <span>⏱ {Math.ceil(dailyPlan.totalDuration / 60)} นาที</span>
              <span>🔥 {Math.ceil(dailyPlan.estimatedCalories)} kcal</span>
              <span>💪 {dailyPlan.exercises.length} ท่า</span>
            </div>
            
            <button 
              onClick={() => setShowPlanModal(true)} 
              style={{ padding: '0.8rem', background: '#2B5876', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}
            >
              {dailyPlan.status === 'completed' ? 'ทบทวนภารกิจอีกครั้ง' : 'พรีวิวและเริ่มเลย!'}
            </button>
          </div>
        ) : (
          <div className="daily-plan-card rest-day glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', background: 'rgba(255, 255, 255, 0.9)', textAlign: 'center' }}>
            <h3 style={{ color: '#333' }}>🌿 วันนี้เป็นวันพักผ่อน (Rest Day)</h3>
            <p style={{ color: '#666', margin: 0 }}>ร่างกายต้องการการซ่อมแซมเพื่อสร้างกล้ามเนื้อ พักให้เต็มที่นะครับ!</p>
          </div>
        )}
      </div>

      {/* --- DAILY PLAN MODAL PREVIEW --- */}
      {showPlanModal && dailyPlan && (
        <div className="plan-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="plan-modal-content" style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: '#333' }}>📋 พรีวิวภารกิจ</h2>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {dailyPlan.exercises.map((ex, idx) => (
                <li key={idx} style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: '#444' }}>{idx + 1}. {ex.name}</strong>
                  <span style={{ fontSize: '0.9rem', color: '#007bff', fontWeight: '500' }}>
                    {ex.reps > 0 ? `${ex.reps} ครั้ง` : ''} 
                    {ex.reps > 0 && ex.time > 0 ? ' | ' : ''}
                    {ex.time > 0 ? `${ex.time} วิ` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowPlanModal(false)} style={{ flex: 1, padding: '0.8rem', background: '#ccc', color: '#333', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>ปิด</button>
              <Link to={`/WorkoutPlayer/dailyplan`} style={{ flex: 2, padding: '0.8rem', background: '#2B5876', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' }}>
                เริ่มออกกำลังกาย 🔥
              </Link>
            </div>
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