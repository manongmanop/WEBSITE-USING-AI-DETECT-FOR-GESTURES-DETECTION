import React, { useEffect, useState } from "react";
import axios from "axios";
import { showAlert, getSwal } from "../../../utils/showAlert";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, deleteDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../../../firebase";
import "./UserManagement.scss";

function UserManagement() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [adminUids, setAdminUids] = useState(new Set());
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("ทั้งหมด");

    const formatDate = (dateObj) => {
        if (!dateObj) return "-";

        try {
            let d;
            // 1) Is it a Firebase Timestamp (has .toDate())?
            if (dateObj.toDate && typeof dateObj.toDate === 'function') {
                d = dateObj.toDate();
            }
            // 2) Is it already a Date object?
            else if (dateObj instanceof Date) {
                d = dateObj;
            }
            // 3) Is it a String? (e.g. from manual Firestore entry "March 4, 2026 at 8:46:29 PM UTC+7")
            else if (typeof dateObj === 'string') {
                // Remove the " at " which breaks JS Date parsing
                const cleanString = dateObj.replace(" at ", " ");
                d = new Date(cleanString);
            }
            // 4) Fallback (e.g. numbers / timestamps)
            else {
                d = new Date(dateObj);
            }

            // Return "-" if parsing failed
            if (isNaN(d.getTime())) return "-";

            // Format successfully
            return d.toLocaleDateString("th-TH");

        } catch (e) {
            console.error("Error formatting date:", e);
            return "-";
        }
    };

    const fetchData = async () => {
        try {
            const [usersSnapshot, adminsSnapshot] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "admin"))
            ]);

            const usersData = [];
            usersSnapshot.forEach(doc => {
                usersData.push({ _id: doc.id, firebaseUid: doc.id, ...doc.data() });
            });
            setUsers(usersData);

            const adminSet = new Set();
            const adminsData = [];
            adminsSnapshot.forEach(doc => {
                if (doc.data().role === 'admin') {
                    adminSet.add(doc.id);
                    adminsData.push({ _id: doc.id, firebaseUid: doc.id, ...doc.data() });
                }
            });

            // Merge admins who are not in usersData
            adminsData.forEach(admin => {
                const exists = usersData.find(u => u.firebaseUid === admin.firebaseUid);
                if (!exists) {
                    usersData.push(admin);
                }
            });

            // Sort by createdAt descending (with fallback to updatedAt/createdAt with space)
            usersData.sort((a, b) => {
                const getBestDate = (u) => {
                    const dateObj = u.createdAt || u["createdAt "] || u.updatedAt;
                    if (!dateObj) return 0;
                    return dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
                };
                return getBestDate(b) - getBestDate(a);
            });

            setUsers(usersData);
            setAdminUids(adminSet);
        } catch (err) {
            console.error("Error fetching data:", err);
            showAlert({ title: "ข้อผิดพลาด", text: "ไม่สามารถโหลดข้อมูลผู้ใช้งานได้", icon: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id, uid) => {
        const result = await showAlert({
            title: "แน่ใจหรือไม่?",
            text: "บัญชีผู้ใช้นี้จะถูกลบถาวร รวมถึงข้อมูลประวัติการออกกำลังกาย",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก"
        });

        if (result.isConfirmed) {
            try {
                // Delete from both collections to ensure complete removal
                await deleteDoc(doc(db, "users", uid));
                await deleteDoc(doc(db, "admin", uid));
                showAlert({ title: "ลบสำเร็จ", text: "ผู้ใช้ถูกลบออกจากระบบฐานข้อมูลแล้ว", icon: "success" });
                fetchData(); // Refresh list
            } catch (err) {
                console.error("Error deleting user:", err);
                showAlert({ title: "ข้อผิดพลาด", text: "ไม่สามารถลบผู้ใช้งานได้", icon: "error" });
            }
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email || "").toLowerCase().includes(searchTerm.toLowerCase());

        let matchesStatus = true;
        if (filterStatus === "แอดมิน (Admin)") {
            matchesStatus = adminUids.has(user.firebaseUid);
        } else if (filterStatus === "ผู้ใช้งานทั่วไป") {
            matchesStatus = !adminUids.has(user.firebaseUid);
        }

        return matchesSearch && matchesStatus;
    });

    if (loading) return <div>กำลังโหลดรายชื่อ...</div>;

    return (
        <div className="user-management">
            <h2>จัดการผู้ใช้งาน</h2>

            {/* แถบค้นหา และ ตัวกรอง สถานะ */}
            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="🔍 ค้นหาชื่อ หรือ อีเมล..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="status-select"
                >
                    <option value="ทั้งหมด">ผู้ใช้ทั้งหมด</option>
                    <option value="แอดมิน (Admin)">แอดมิน (Admin)</option>
                    <option value="ผู้ใช้งานทั่วไป">ผู้ใช้งานทั่วไป</option>
                </select>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ลำดับ</th>
                            <th>ชื่อ</th>
                            <th>อีเมล</th>
                            <th>สถานะ</th>
                            <th>วันที่สมัคร</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="empty-row">ไม่พบข้อมูลผู้ใช้ที่ค้นหา</td>
                            </tr>
                        ) : (
                            filteredUsers.map((user, index) => (
                                <tr key={user._id}>
                                    <td>{index + 1}</td>
                                    <td className="font-bold">{user.name || "ไม่มีชื่อ"}</td>
                                    <td>{user.email || "-"}</td>
                                    <td>
                                        {adminUids.has(user.firebaseUid) ? (
                                            <span className="status-badge badge-admin">Admin</span>
                                        ) : (
                                            <span className="status-badge badge-user">User</span>
                                        )}
                                    </td>
                                    <td>{formatDate(user.createdAt || user["createdAt "] || user.updatedAt)}</td>
                                    <td className="action-buttons">
                                        <button
                                            onClick={() => navigate(`/admin/users/progress/${user.firebaseUid}`)}
                                            className="btn btn-primary"
                                        >
                                            ดู Progress
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user._id, user.firebaseUid)}
                                            className="btn btn-danger"
                                        >
                                            ลบ
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default UserManagement;
