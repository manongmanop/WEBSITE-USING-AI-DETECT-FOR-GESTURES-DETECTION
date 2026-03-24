import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { showAlert } from "../../../utils/showAlert";
import "./ExerciseManagement.scss";

function ExerciseManagement() {
    const navigate = useNavigate();
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchExercises = async () => {
        try {
            const res = await axios.get(`/api/exercises`);
            setExercises(res.data);
        } catch (err) {
            console.error("Error fetching exercises:", err);
            showAlert({ title: "ข้อผิดพลาด", text: "ไม่สามารถโหลดข้อมูลท่าออกกำลังกายได้", icon: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExercises();
    }, []);

    const handleDelete = async (id, name) => {
        const result = await showAlert({
            title: "ลบท่าออกกำลังกาย?",
            text: `คุณต้องการลบ "${name}" หรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก"
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/exercises/${id}`);
                showAlert({ title: "สำเร็จ", text: "ลบท่าออกกำลังกายเรียบร้อยแล้ว", icon: "success" });
                fetchExercises();
            } catch (err) {
                console.error("Error deleting exercise:", err);
                showAlert({ title: "ข้อผิดพลาด", text: "ไม่สามารถลบท่าออกกำลังกายได้", icon: "error" });
            }
        }
    };

    const filteredExercises = exercises.filter(ex => {
        return (ex.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (loading) return <div>กำลังโหลดรายชื่อท่าออกกำลังกาย...</div>;

    return (
        <div className="exercise-management">
            <div className="header">
                <h2>จัดการท่าออกกำลังกาย</h2>
                <button
                    className="btn-add"
                    onClick={() => navigate('/admin/exercises/add')}
                >
                    + เพิ่มท่าออกกำลังกายใหม่
                </button>
            </div>

            {/* แถบค้นหา */}
            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="🔍 ค้นหาชื่อท่าออกกำลังกาย..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ลำดับ</th>
                            <th>รูป/วิดีโอ</th>
                            <th>ชื่อท่า</th>
                            <th>ประเภท</th>
                            <th>แท็ก (Tags)</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExercises.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="empty-row">ไม่พบข้อมูลท่าออกกำลังกายที่ค้นหา</td>
                            </tr>
                        ) : (
                            filteredExercises.map((exercise, index) => (
                                <tr key={exercise._id}>
                                    <td>{index + 1}</td>
                                    <td>
                                        {exercise.imageUrl ? (
                                            <img src={exercise.imageUrl.startsWith("http") ? exercise.imageUrl : exercise.imageUrl} alt="Exercise" className="thumbnail" />
                                        ) : (
                                            <div className="placeholder-img"></div>
                                        )}
                                    </td>
                                    <td className="font-bold">{exercise.name || "ไม่มีชื่อ"}</td>
                                    <td>{exercise.type === "reps" ? "จำนวนครั้ง (Reps)" : "จับเวลา (Time)"}</td>
                                    <td>
                                        <div className="tags-container">
                                            {exercise.difficulty && (
                                                <span className="tag-difficulty">
                                                    {exercise.difficulty}
                                                </span>
                                            )}
                                            {exercise.muscles && exercise.muscles.length > 0 ? (
                                                exercise.muscles.map((m, idx) => (
                                                    <span key={idx} className="tag-muscle">
                                                        {m}
                                                    </span>
                                                ))
                                            ) : (
                                                !exercise.difficulty && <span className="no-tag">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                onClick={() => navigate(`/admin/exercises/edit/${exercise._id}`)}
                                                className="btn btn-edit"
                                            >
                                                แก้ไข
                                            </button>
                                            <button
                                                onClick={() => handleDelete(exercise._id, exercise.name)}
                                                className="btn btn-delete"
                                            >
                                                ลบ
                                            </button>
                                        </div>
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

export default ExerciseManagement;
