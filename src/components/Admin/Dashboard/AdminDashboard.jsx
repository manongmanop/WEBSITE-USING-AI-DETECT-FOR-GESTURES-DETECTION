import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../../../firebase";
import { MdPeople, MdFitnessCenter, MdOutlineAdminPanelSettings, MdFormatListBulleted } from "react-icons/md";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import "./AdminDashboard.scss";

function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ totalUsers: 0, totalPrograms: 0, totalAdmins: 0, totalExercises: 0 });
    const [loading, setLoading] = useState(true);

    // New Data States
    const [monthlyUsers, setMonthlyUsers] = useState([]);
    const [newUsers, setNewUsers] = useState([]);
    const [popularPrograms, setPopularPrograms] = useState([]);
    const [activityLog, setActivityLog] = useState([]);

    const formatDate = (dateObj) => {
        if (!dateObj) return "-";
        try {
            const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
            return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("th-TH");
        } catch (e) {
            return "-";
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch users from Firestore
                const usersSnapshot = await getDocs(collection(db, "users"));
                // Fetch programs from MongoDB
                const programsRes = await axios.get(`/api/workout_programs`);
                // Fetch exercises from MongoDB
                const exercisesRes = await axios.get(`/api/exercises`);

                // Fetch admins from 'admin' collection
                const adminSnapshot = await getDocs(collection(db, "admin"));
                const adminSet = new Set();
                adminSnapshot.forEach(doc => {
                    if (doc.data().role === 'admin') adminSet.add(doc.id);
                });

                // Union: Admins are anyone in 'admin' collection PLUS anyone in 'users' with role='admin'
                let adminCount = adminSet.size;

                // Also count total unique users (users + admins not in users collection)
                // This ensures totalUsers is accurate even if some old admins are missing from 'users'
                let userCount = usersSnapshot.size;
                adminSet.forEach(adminId => {
                    let foundInUsers = false;
                    usersSnapshot.forEach(doc => {
                        if (doc.id === adminId) foundInUsers = true;
                    });
                    if (!foundInUsers) userCount++;
                });

                setStats({
                    totalUsers: userCount || 0,
                    totalPrograms: programsRes.data.length || 0,
                    totalAdmins: adminCount,
                    totalExercises: exercisesRes.data.length || 0
                });

                // Process Users for Graph & List
                const usersList = [];
                usersSnapshot.forEach(doc => {
                    const data = doc.data();
                    usersList.push({ id: doc.id, ...data });
                });

                // 1. Sort users by newest
                usersList.sort((a, b) => {
                    const getDateA = a.createdAt || a["createdAt "] || a.updatedAt;
                    const getDateB = b.createdAt || b["createdAt "] || b.updatedAt;
                    const timeA = getDateA ? (getDateA.toDate ? getDateA.toDate().getTime() : new Date(getDateA).getTime()) : 0;
                    const timeB = getDateB ? (getDateB.toDate ? getDateB.toDate().getTime() : new Date(getDateB).getTime()) : 0;
                    return timeB - timeA;
                });

                setNewUsers(usersList.slice(0, 5));

                // 2. Group by Month for Graph (Last 6 months)
                const monthData = {};
                const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

                usersList.forEach(user => {
                    const dateVal = user.createdAt || user["createdAt "] || user.updatedAt;
                    const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal || NaN);
                    if (!isNaN(d.getTime())) {
                        const monthKey = d.getMonth();
                        if (!monthData[monthKey]) {
                            monthData[monthKey] = { count: 0, names: [] };
                        }
                        monthData[monthKey].count += 1;
                        monthData[monthKey].names.push(user.name || "ไม่มีชื่อ");
                    }
                });

                // Generate chart data for display (simply taking all months with data or generating a fixed set)
                const chartData = Object.keys(monthData).sort((a, b) => a - b).map(key => ({
                    name: monthNames[key],
                    users: monthData[key].count,
                    userNames: monthData[key].names
                }));
                setMonthlyUsers(chartData.length > 0 ? chartData : [{ name: "ไม่มีข้อมูล", users: 0, userNames: [] }]);

                // 3. Popular Programs (Just top 5 for now)
                const popular = [...programsRes.data].slice(0, 5);
                setPopularPrograms(popular);

                // 4. Activity Log (Simulating from recent new users + programs)
                // We'll interleave the newest users and programs chronologically if programs had dates, 
                // but since programs might not have createdAt, we just append activities.
                const activities = [];
                usersList.slice(0, 3).forEach(u => {
                    activities.push({
                        id: `u_${u.id}`,
                        title: `มีผู้ใช้งานใหม่สมัครสมาชิก: ${u.name || 'ไม่มีชื่อ'}`,
                        time: formatDate(u.createdAt || u["createdAt "] || u.updatedAt),
                        type: 'user'
                    });
                });
                programsRes.data.slice(-2).reverse().forEach(p => {
                    activities.push({
                        id: `p_${p._id}`,
                        title: `มีการโปรแกรมใหม่เข้ามา: ${p.name || 'ไม่มีชื่อ'}`,
                        time: 'ล่าสุด',
                        type: 'program'
                    });
                });
                setActivityLog(activities);

            } catch (err) {
                console.error("Error fetching admin stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div>กำลังโหลดข้อมูลสรุปผล...</div>;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 5px 0', color: '#111827' }}>{`${label}: ${data.users} คน`}</p>
                    {data.userNames && data.userNames.length > 0 && (
                        <div style={{ fontSize: '0.85rem', color: '#4b5563', maxHeight: '150px', overflowY: 'auto' }}>
                            {data.userNames.map((name, idx) => (
                                <div key={idx}>• {name}</div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="admin-dashboard">
            <div className="dashboard-grid">

                {/* Card 1: Users */}
                <div onClick={() => navigate('/admin/users')} className="admin-card card-users">
                    <div className="card-content">
                        <h4>ผู้ใช้งานทั้งหมด</h4>
                        <p>{stats.totalUsers}</p>
                    </div>
                    <MdPeople className="icon-users" />
                </div>

                {/* Card 2: Programs */}
                <div onClick={() => navigate('/admin/programs')} className="admin-card card-programs">
                    <div className="card-content">
                        <h4>โปรแกรมทั้งหมด</h4>
                        <p>{stats.totalPrograms}</p>
                    </div>
                    <MdFitnessCenter className="icon-programs" />
                </div>

                {/* Card 3: Exercises */}
                <div onClick={() => navigate('/admin/exercises')} className="admin-card card-exercises">
                    <div className="card-content">
                        <h4>ท่าออกกำลังกายรวม</h4>
                        <p>{stats.totalExercises}</p>
                    </div>
                    <MdFormatListBulleted className="icon-exercises" />
                </div>

                {/* Card 4: Admins */}
                <div className="admin-card card-admins">
                    <div className="card-content">
                        <h4>ผู้ดูแลระบบ</h4>
                        <p>{stats.totalAdmins}</p>
                    </div>
                    <MdOutlineAdminPanelSettings className="icon-admins" />
                </div>

            </div>

            {/* Bottom Section: Graph & Logs */}
            <div className="bottom-grid">

                {/* Graph - Monthly Users */}
                <div className="dashboard-panel chart-panel">
                    <h3 className="panel-title">กราฟสถิติผู้ใช้งานใหม่ (รายเดือน)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyUsers}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
                            <Bar dataKey="users" name="จำนวนผู้ใช้" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Latest Users */}
                <div className="dashboard-panel">
                    <h3 className="panel-title">ผู้ใช้ใหม่ล่าสุด</h3>
                    <ul className="dashboard-list">
                        {newUsers.length > 0 ? newUsers.map((u, i) => (
                            <li key={i} className="list-item">
                                <div className="item-info">
                                    <div className="avatar">
                                        {u.name ? u.name.charAt(0).toUpperCase() : "?"}
                                    </div>
                                    <div>
                                        <p className="item-name">{u.name || "ไม่มีชื่อ"}</p>
                                        <p className="item-sub">{u.email}</p>
                                    </div>
                                </div>
                                <span className="item-meta">{formatDate(u.createdAt || u["createdAt "] || u.updatedAt)}</span>
                            </li>
                        )) : <li className="empty-message">ยังไม่มีข้อมูลผู้ใช้</li>}
                    </ul>
                </div>

                {/* Popular Programs */}
                <div className="dashboard-panel">
                    <h3 className="panel-title">โปรแกรมล่าสุด</h3>
                    <ul className="dashboard-list">
                        {popularPrograms.length > 0 ? popularPrograms.map((p, i) => (
                            <li key={i} className="list-item program-item">
                                {p.image ? (
                                    <img src={p.image.startsWith("http") ? p.image : p.image} alt={p.name} className="thumbnail" />
                                ) : (
                                    <div className="placeholder-thumbnail"></div>
                                )}
                                <div className="item-info-text">
                                    <p className="item-name">{p.name || "ไม่มีชื่อโปรแกรม"}</p>
                                    <p className="item-sub">{p.workoutList ? p.workoutList.length : (p.exercises ? p.exercises.length : 0)} ท่า • {p.duration || 0} นาที</p>
                                </div>
                            </li>
                        )) : <li className="empty-message">ยังไม่มีข้อมูลโปรแกรม</li>}
                    </ul>
                </div>

                {/* Activity Log */}
                <div className="dashboard-panel">
                    <h3 className="panel-title">กิจกรรมล่าสุด</h3>
                    <div className="activity-timeline">
                        {activityLog.length > 0 ? activityLog.map((log, i) => (
                            <div key={i} className="timeline-item">
                                <div className={`timeline-dot ${log.type === 'user' ? 'dot-user' : 'dot-program'}`}></div>
                                <p className="timeline-title">{log.title}</p>
                                <p className="timeline-time">{log.time}</p>
                            </div>
                        )) : <p className="empty-timeline">ยังไม่มีประวัติการเคลื่อนไหว</p>}
                    </div>
                </div>

            </div>
        </div>
    );
}

export default AdminDashboard;
