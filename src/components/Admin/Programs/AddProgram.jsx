import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { showAlert } from "../../../utils/showAlert";
import "./AddProgram.scss";

function AddProgram() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Form fields
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState("");
    const [caloriesBurned, setCaloriesBurned] = useState("");
    const [category, setCategory] = useState("ความแข็งแรง");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    const CATEGORIES = [
        "ความแข็งแรง", "คาร์ดิโอ", "ความยืดหยุ่น", "HIIT",
        "โปรแกรมช่วงบน", "โปรแกรมช่วงล่าง", "โปรแกรมหน้าท้อง",
        "ลดไขมัน", "เพิ่มกล้าม", "กระชับก้น & ขา"
    ];

    // Minimal form structure without complex workoutList for MVP, can add workoutList if needed later

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name || !description || !duration) {
            showAlert({ title: "ข้อผิดพลาด", text: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", icon: "error" });
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("description", description);
            formData.append("duration", duration);
            formData.append("caloriesBurned", caloriesBurned || 0);
            formData.append("category", category);

            if (imageFile) {
                formData.append("image", imageFile); // 'image' is commonly used by multer
            }

            // Optional: specify token if backend requires Admin Auth.
            const res = await axios.post(`/api/workout_programs`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            if (res.status === 201 || res.status === 200) {
                showAlert({ title: "สำเร็จ", text: "เพิ่มโปรแกรมเรียบร้อยแล้ว", icon: "success" });
                navigate("/admin/programs");
            }
        } catch (error) {
            console.error("Error creating program:", error);
            showAlert({ title: "ข้อผิดพลาด", text: "ไม่สามารถเพิ่มโปรแกรมได้", icon: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-program">
            <div className="header">
                <h2>เพิ่มโปรแกรมใหม่</h2>
                <button
                    onClick={() => navigate(-1)}
                    className="btn-back"
                >
                    กลับ
                </button>
            </div>

            <form onSubmit={handleSubmit} className="program-form">
                <div className="form-group">
                    <label>ชื่อโปรแกรม *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="form-input"
                        placeholder="เช่น สร้างกล้ามเนื้อหน้าอกเบื้องต้น"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>รายละเอียด</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="form-textarea"
                        placeholder="คำอธิบายโปรแกรม..."
                        required
                    />
                </div>

                <div className="form-row">
                    <div className="col form-group">
                        <label>ระยะเวลา (นาที) *</label>
                        <input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="form-input"
                            placeholder="เช่น 30"
                            required
                        />
                    </div>
                    <div className="col form-group">
                        <label>แคลอรี่ที่เผาผลาญ (kcal)</label>
                        <input
                            type="number"
                            value={caloriesBurned}
                            onChange={(e) => setCaloriesBurned(e.target.value)}
                            className="form-input"
                            placeholder="เช่น 250"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>หมวดหมู่โปรแกรม</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="form-input"
                    >
                        {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>รูปภาพปกโปรแกรม</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="form-input"
                    />
                    {imagePreview && (
                        <div className="image-preview">
                            <img src={imagePreview} alt="Preview" />
                        </div>
                    )}
                </div>

                <div className="submit-section">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-submit"
                    >
                        {loading ? "กำลังบันทึก..." : "บันทึกโปรแกรม"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AddProgram;
