import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase";
import { 
  ArrowBackIcon, 
  AccessTimeIcon, 
  LocalFireDepartmentIcon, 
  FitnessCenterIcon 
} from "../../Common/Icons";
import "./UserProgress.scss";

function UserProgress() {
    const { uid } = useParams();
    const navigate = useNavigate();

    const [userData, setUserData] = useState(null);
    const [summary, setSummary] = useState({ totalWorkouts: 0, totalTime: 0, totalCalories: 0 });
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const formatTime = (seconds) => {
        if (!seconds) return "0 นาที";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h} ชม. ${m} นาที`;
        return `${m} นาที`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        const fetchUserProgress = async () => {
            try {
                // 1. Fetch User Info (Still from Firebase since identity is there)
                let tempName = "ไม่ระบุ";
                let tempEmail = "ไม่ระบุ";
                try {
                    const userDoc = await getDoc(doc(db, "users", uid));
                    if (userDoc.exists()) {
                        const d = userDoc.data();
                        tempName = d.name || tempName;
                        tempEmail = d.email || tempEmail;
                        setUserData(d);
                    } else {
                        setUserData({ name: "ไม่พบข้อมูลผู้ใช้" });
                    }
                } catch (e) {
                    console.error("Firebase fetch error:", e);
                }

                // 2. Fetch Summary & History from MongoDB Backend (server.cjs)
                const [statsRes, historyRes] = await Promise.all([
                    axios.get(`/api/stats/dashboard/${uid}`),
                    axios.get(`/api/histories/user/${uid}`)
                ]);

                // Destructure stats logic (totalWorkouts, totalCalories)
                const dashboardSummary = statsRes.data.summary || { totalWorkouts: 0, totalCalories: 0 };
                const userHistory = historyRes.data || [];

                // 3. Aggregate Total Time
                // Because /api/stats/dashboard doesn't return totalTime inherently, 
                // we'll calculate it from the histories list.
                const computedTotalTime = userHistory.reduce((acc, h) => acc + (h.totalSeconds || 0), 0);

                setSummary({
                    totalWorkouts: dashboardSummary.totalWorkouts || 0,
                    totalCalories: dashboardSummary.totalCalories || 0,
                    totalTime: computedTotalTime
                });

                setHistory(userHistory);

            } catch (error) {
                console.error("Error fetching user progress from API:", error);
            } finally {
                setLoading(false);
            }
        };

        if (uid) {
            fetchUserProgress();
        }
    }, [uid]);

    if (loading) return <div>กำลังโหลดข้อมูลความคืบหน้า...</div>;

    return (
        <div className="user-progress">
            <button
                onClick={() => navigate(-1)}
                className="back-btn"
            >
                <ArrowBackIcon size={20} /> กลับไปหน้าจัดการผู้ใช้งาน
            </button>

            <h2>
                ความคืบหน้าของ: <span className="highlight-name">{userData?.name || "ไม่ระบุ"}</span>
            </h2>
            <p className="user-email">อีเมล: {userData?.email || "ไม่ระบุ"}</p>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card card-workouts">
                    <div className="icon-wrapper">
                        <FitnessCenterIcon size={25} color="#059669" />
                    </div>
                    <div className="stat-info">
                        <p>จำนวนครั้งที่เล่นจบ</p>
                        <h3>{summary.totalWorkouts || 0} ครั้ง</h3>
                    </div>
                </div>

                <div className="stat-card card-time">
                    <div className="icon-wrapper">
                        <AccessTimeIcon size={25} color="#2563eb" />
                    </div>
                    <div className="stat-info">
                        <p>เวลาทั้งหมด</p>
                        <h3>{formatTime(summary.totalTime)}</h3>
                    </div>
                </div>

                <div className="stat-card card-calories">
                    <div className="icon-wrapper">
                        <LocalFireDepartmentIcon size={25} color="#dc2626" />
                    </div>
                    <div className="stat-info">
                        <p>เผาผลาญทั้งหมด</p>
                        <h3>{summary.totalCalories ? summary.totalCalories.toFixed(0) : 0} kcal</h3>
                    </div>
                </div>
            </div>

            {/* History List */}
            <div className="history-section">
                <h3>ประวัติการออกกำลังกาย</h3>

                {history.length > 0 ? (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>วันที่ / เวลา</th>
                                    <th>โปรแกรม</th>
                                    <th>เวลาที่ใช้</th>
                                    <th>เผาผลาญ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((record) => (
                                    <tr key={record._id}>
                                        <td>{formatDate(record.finishedAt || record.createdAt)}</td>
                                        <td className="font-bold">{record.programName || "โปรแกรมออกกำลังกาย"}</td>
                                        <td>{formatTime(record.totalSeconds)}</td>
                                        <td className="text-danger">{record.caloriesBurned ? record.caloriesBurned.toFixed(0) : 0} kcal</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-history">
                        <p>ผู้ใช้นี้ยังไม่มีประวัติการออกกำลังกาย</p>
                    </div>
                )}
            </div>

        </div>
    );
}

export default UserProgress;
