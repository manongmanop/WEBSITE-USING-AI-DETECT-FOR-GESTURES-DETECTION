import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineSearch, AiOutlineClockCircle } from "react-icons/ai";
import { IoFitnessOutline } from "react-icons/io5";
import { BsLightning, BsFire, BsArrowRight } from "react-icons/bs";
import { GiArtificialIntelligence } from "react-icons/gi";
import { useUserAuth } from "../../../context/UserAuthContext";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { getMediaUrl } from "../../Detail Section/Detail/Detail.jsx";
import "./top.css";
import "../../style/global.css";
export const Top = () => {
  const { user } = useUserAuth();

  const [displayName, setDisplayName] = useState("");
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [userStats, setUserStats] = useState({ caloriesBurned: 0, workoutsDone: 0 });
  const [dailyPlan, setDailyPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

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

  // ดึงแผนออกกำลังกายวันนี้ถ้ามี
  useEffect(() => {
    const fetchDailyPlan = async () => {
      if (!user?.uid) return;
      try {
        const res = await fetch(`/api/daily-plan/${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setDailyPlan(data);
        }
      } catch (e) {
        // ยังไม่มีแผน ไม่ต้องแสดง error
      }
    };
    fetchDailyPlan();
  }, [user]);

  const handleGeneratePlan = async () => {
    if (!user?.uid) return;
    setPlanLoading(true);
    setPlanError("");
    try {
      const res = await fetch("/api/daily-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid })
      });
      if (!res.ok) throw new Error("สร้างแผนไม่สำเร็จ");
      const data = await res.json();
      setDailyPlan(data);
    } catch (e) {
      setPlanError("ไม่สามารถสร้างแผนวันนี้ได้ กรุณาลองใหม่");
    } finally {
      setPlanLoading(false);
    }
  };

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

      {/* === AI Daily Plan Card === */}
      <div className="daily-plan-section">
        <div className="daily-plan-header">
          <h2 className="daily-plan-title">🤖 แผนออกกำลังกายวันนี้ (AI)</h2>
          <button
            className="generate-plan-btn"
            onClick={handleGeneratePlan}
            disabled={planLoading}
          >
            {planLoading ? "กำลังสร้าง..." : dailyPlan ? "🔄 สร้างแผนใหม่" : "✨ สร้างแผนวันนี้"}
          </button>
        </div>

        {planError && <p className="plan-error">{planError}</p>}

        {dailyPlan ? (
          <div className="daily-plan-card">
            <div className="plan-summary">
              <span>⏱️ {dailyPlan.totalDuration} วินาที</span>
              <span>🔥 ~{dailyPlan.estimatedCalories} kcal</span>
              <span>💪 {dailyPlan.exercises?.length} ท่า</span>
            </div>
            <div className="plan-exercises-list">
              {dailyPlan.exercises?.map((ex, i) => (
                <div key={i} className="plan-exercise-item">
                  {ex.imageUrl && (
                    <img src={getMediaUrl(ex.imageUrl)} alt={ex.name} className="plan-ex-img" onError={e => e.currentTarget.style.display='none'} />
                  )}
                  <div className="plan-ex-info">
                    <span className="plan-ex-name">{ex.name}</span>
                    <span className="plan-ex-detail">
                      {ex.type === 'time' ? `⏱️ ${ex.time} วินาที` : `🔁 ${ex.reps} ครั้ง`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !planLoading && (
          <div className="no-plan-placeholder">
            <p>กดปุ่มด้านบนเพื่อให้ AI สร้างแผนออกกำลังกายของคุณวันนี้!</p>
          </div>
        )}
      </div>

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