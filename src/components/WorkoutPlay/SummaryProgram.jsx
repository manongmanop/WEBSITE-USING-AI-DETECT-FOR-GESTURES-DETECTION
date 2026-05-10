import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./SummaryProgram.css";

function formatDuration(totalSeconds) {
    const seconds = Number(totalSeconds) || 0;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    // padStart(2, '0') จะทำให้เลขหลักเดียวมี 0 นำหน้า เช่น 5 -> 05
    return `${m}:${s.toString().padStart(2, '0')}`;
}
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`; // แสดงเป็น m:ss
}
export default function SummaryProgram() {
    const { uid } = useParams();
    const nav = useNavigate();

    const [data, setData] = useState(null);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!uid || uid === "undefined" || uid === "null") {
            setErr("ไม่พบรหัสผู้ใช้ (UID Invalid)");
            setLoading(false);
            return;
        }
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                setErr("");
                const res = await axios.get(`/api/__summary_internal/program/${uid}`);
                if (!mounted) return;
                setData(res.data);
            } catch (e) {
                if (!mounted) return;
                console.error("Summary Load Error:", e);
                if (e.response && e.response.status === 404) {
                    setErr("ไม่พบประวัติการเล่น (หากออกกำลังกายน้อยกว่า 60 วินาที ระบบจะไม่บันทึกผลครับ)");
                } else {
                    setErr(e?.response?.data?.error || e?.message || "โหลดข้อมูลไม่สำเร็จ");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [uid]);

    if (loading) {
        return (
            <div className="summary-container">
                <div className="summary-loading">
                    <div className="loading-spinner"></div>
                    <p>กำลังประมวลผลสรุป...</p>
                </div>
            </div>
        );
    }

    if (err) {
        return (
            <div className="summary-container">
                <div className="summary-error-section">
                    <div className="error-header">
                        <h1>⚠️ เกิดข้อผิดพลาด</h1>
                        <button
                            className="btn btn-primary"
                            onClick={() => nav("/")}
                        >
                            กลับหน้าหลัก
                        </button>
                    </div>
                    <div className="error-card">
                        <div className="error-message">{err}</div>
                        <div className="error-info">User ID: {String(uid)}</div>
                        <div className="error-actions">
                            <button
                                className="btn btn-primary"
                                onClick={() => window.location.reload()}
                            >
                                ลองใหม่
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => nav(-1)}
                            >
                                กลับไปหน้าเล่น
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;
    const exerciseProgress = ((data.doneExercises / data.totalExercises) * 100).toFixed(0);

    // [Display Guard] ถ้าเวลาที่ใช้น้อยกว่า 60 วินาที → ถือว่าไม่ได้ออกกำลังกายจริง
    const totalSeconds = Number(data.totals?.seconds) || 0;
    const isRealWorkout = totalSeconds >= 60;
    const displayCalories = isRealWorkout
        ? (data.totals?.calories ? Number(data.totals.calories).toFixed(2) : "0.00")
        : "0.00";

    return (
        <div className="summary-container-new">
            {/* Header Section */}
            <div className="summary-page-header">
                <div className="header-left">
                    <h1 className="main-title">สรุปผลการออกกำลังกาย</h1>
                    <p className="sub-title">
                        ภารกิจวันนี้ของคุณ • {new Date(data.finishedAt).toLocaleDateString('th-TH', {
                            day: 'numeric', month: 'long', year: 'numeric'
                        })} เวลา {new Date(data.finishedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div className="header-right">
                    <div className="status-badge-done">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>เสร็จสิ้น</span>
                    </div>
                </div>
            </div>

            {/* Success Banner */}
            {data.isDailyPlan && isRealWorkout && (
                <div className="mission-success-banner">
                    <div className="banner-icon">
                        <div className="icon-circle">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div className="banner-text">
                        <h3>ภารกิจวันนี้เสร็จสิ้น!</h3>
                        <p>คุณทำตามแผนรายวันได้สำเร็จ ระบบบันทึกประวัติเข้าระบบเรียบร้อยแล้ว</p>
                    </div>
                </div>
            )}

            {/* Stats Cards Grid */}
            <div className="summary-stats-grid">
                <div className="stats-card">
                    <div className="card-top">
                        <span className="card-icon time-icon-new">⏱️</span>
                        <span className="card-label">เวลาที่ใช้</span>
                    </div>
                    <div className="card-value-box">
                        <span className="main-value">{formatDuration(data.totals?.seconds)}</span>
                        <span className="unit-label">นาที : วินาที</span>
                    </div>
                </div>

                <div className="stats-card">
                    <div className="card-top">
                        <span className="card-icon cal-icon-new">🔥</span>
                        <span className="card-label">แคลอรี่</span>
                    </div>
                    <div className="card-value-box">
                        <span className="main-value">{displayCalories}</span>
                        <span className="unit-label">kcal เผาผลาญ</span>
                    </div>
                </div>

                <div className="stats-card">
                    <div className="card-top">
                        <span className="card-icon ex-icon-new">💪</span>
                        <span className="card-label">ท่าที่ทำ</span>
                    </div>
                    <div className="card-value-box">
                        <span className="main-value">{data.doneExercises} / {data.totalExercises}</span>
                        <span className="unit-label">ครบทุกท่า</span>
                    </div>
                </div>
            </div>

            {/* Progress Section */}
            <div className="exercise-progress-section">
                <div className="section-header-row">
                    <h2 className="section-title">ความสำเร็จของการออกกำลังกาย</h2>
                    <span className="percentage-label">{exerciseProgress}%</span>
                </div>

                <div className="progress-bar-wrapper">
                    <div className="bar-bg">
                        <div className="bar-fill" style={{ width: `${exerciseProgress}%` }}></div>
                    </div>
                </div>

                <div className="exercise-list-grid">
                    {/* จำลองรายการท่าที่ทำตามจำนวน Done Exercises */}
                    {Array.from({ length: data.totalExercises }).map((_, idx) => (
                        <div key={idx} className={`exercise-mini-card ${idx < data.doneExercises ? 'active' : ''}`}>
                            <div className="mini-card-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <span>ท่าที่ {idx + 1}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Motivational Footer */}
            <div className="motivational-message-card">
                <div className="medal-icon">🏅</div>
                <div className="message-content">
                    {isRealWorkout ? (
                        <>
                            <h4>ยอดเยี่ยม! คุณทำได้ดีมากจริง ๆ</h4>
                            <p>ข้อมูลการออกกำลังกายวันนี้ถูกบันทึกไว้เรียบร้อยแล้ว</p>
                        </>
                    ) : (
                        <>
                            <h4 style={{ color: '#92400e' }}>เวลาในการฝึกน้อยเกินไป</h4>
                            <p>ระบบจะไม่บันทึกประวัติหากเวลาออกกำลังกายรวมน้อยกว่า 60 วินาทีครับ</p>
                        </>
                    )}
                </div>
            </div>

            {/* Action Button */}
            <div className="bottom-actions">
                <button className="btn-back-home" onClick={() => nav("/home")}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    กลับสู่หน้าหลัก
                </button>
            </div>
        </div>
    );
}