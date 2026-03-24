import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { showAlert } from "../../../utils/showAlert";
import "./ProgramManagement.scss";

function ProgramManagement() {
    const navigate = useNavigate();
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");

    const categories = ["ทั้งหมด", "โปรแกรมช่วงบน", "โปรแกรมช่วงล่าง", "โปรแกรมหน้าท้อง", "ลดไขมัน", "เพิ่มกล้าม", "กระชับก้น & ขา"];

    const fetchPrograms = async () => {
        try {
            const res = await axios.get(`/api/workout_programs`);
            setPrograms(res.data);
        } catch (err) {
            console.error("Error fetching programs:", err);
            showAlert({ title: "ข้อผิดพลาด", text: "ไม่สามารถโหลดข้อมูลโปรแกรมได้", icon: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrograms();
    }, []);

    const handleDelete = async (id, name) => {
        const result = await showAlert({
            title: "ลบโปรแกรม?",
            text: `คุณต้องการลบโปรแกรม "${name}" หรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก"
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/workout_programs/${id}`);
                showAlert({ title: "สำเร็จ", text: "ลบโปรแกรมเรียบร้อยแล้ว", icon: "success" });
                fetchPrograms();
            } catch (err) {
                console.error("Error deleting program:", err);
                showAlert({ title: "ข้อผิดพลาด", text: "ไม่สามารถลบโปรแกรมได้", icon: "error" });
            }
        }
    };

    const filteredPrograms = programs.filter(program => {
        const matchesSearch = (program.name || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "ทั้งหมด" || program.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) return <div>กำลังโหลดรายชื่อโปรแกรม...</div>;

    return (
        <div className="program-management">
            <div className="header">
                <h2>จัดการโปรแกรม</h2>
                <button
                    className="btn-add"
                    onClick={() => navigate('/admin/programs/add')}
                >
                    + เพิ่มโปรแกรมใหม่
                </button>
            </div>

            {/* แถบค้นหา และ ตัวกรอง Tag */}
            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="🔍 ค้นหาชื่อโปรแกรม..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="category-select"
                >
                    {categories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ลำดับ</th>
                            <th>รูปโปรแกรม</th>
                            <th>ชื่อโปรแกรม</th>
                            <th>หมวดหมู่ (Tag)</th>
                            <th>จำนวนท่า</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPrograms.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="empty-row">ไม่พบข้อมูลโปรแกรมที่ค้นหา</td>
                            </tr>
                        ) : (
                            filteredPrograms.map((program, index) => (
                                <tr key={program._id}>
                                    <td>{index + 1}</td>
                                    <td>
                                        {program.image ? (
                                            <img src={program.image.startsWith("http") ? program.image : program.image} alt="Program" className="thumbnail" />
                                        ) : (
                                            <div className="placeholder-img"></div>
                                        )}
                                    </td>
                                    <td className="font-bold">{program.name || "ไม่มีชื่อ"}</td>
                                    <td>
                                        {program.category ? (
                                            <span className="tag-badge">
                                                {program.category}
                                            </span>
                                        ) : (
                                            <span className="no-tag">-</span>
                                        )}
                                    </td>
                                    <td>{program.exercises ? program.exercises.length : (program.workoutList ? program.workoutList.length : "0")} ท่า</td>
                                    <td className="action-buttons">
                                        <button
                                            onClick={() => navigate(`/admin/programs/edit/${program._id}`)}
                                            className="btn btn-edit"
                                        >
                                            แก้ไข
                                        </button>
                                        <button
                                            onClick={() => handleDelete(program._id, program.name)}
                                            className="btn btn-delete"
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

export default ProgramManagement;
