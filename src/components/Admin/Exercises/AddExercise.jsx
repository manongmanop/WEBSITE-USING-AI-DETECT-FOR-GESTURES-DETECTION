import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { showAlert } from "../../../utils/showAlert";
import "./AddExercise.scss";

function AddExercise() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Form fields
    const [name, setName] = useState("");
    const [type, setType] = useState("reps");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState("");
    const [caloriesBurned, setCaloriesBurned] = useState("");
    const [value, setValue] = useState("");
    const [muscles, setMuscles] = useState("");

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [videoFile, setVideoFile] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleVideoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setVideoFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name || (!duration && !value)) {
            showAlert({ title: "ข้อผิดพลาด", text: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", icon: "error" });
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("type", type);
            formData.append("description", description);
            formData.append("duration", duration || 60);
            formData.append("caloriesBurned", caloriesBurned || 0);
            formData.append("value", value || 0);

            // Convert comma-separated string back to array if needed, otherwise send as JSON string
            const musclesArray = muscles.split(",").map(m => m.trim()).filter(Boolean);
            formData.append("muscles", JSON.stringify(musclesArray));

            if (imageFile) formData.append("image", imageFile);
            if (videoFile) formData.append("video", videoFile);

            const res = await axios.post(`/api/exercises`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            if (res.status === 201 || res.status === 200) {
                showAlert({ title: "สำเร็จ", text: "เพิ่มท่าออกกำลังกายเรียบร้อยแล้ว", icon: "success" });
                navigate("/admin/exercises");
            }
        } catch (error) {
            console.error("Error creating exercise:", error);
            showAlert({ title: "ข้อผิดพลาด", text: "ไม่สามารถเพิ่มท่าออกกำลังกายได้", icon: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-exercise">
            <div className="header">
                <h2>เพิ่มท่าออกกำลังกายใหม่</h2>
                <button
                    onClick={() => navigate(-1)}
                    className="btn-back"
                >
                    กลับ
                </button>
            </div>

            <form onSubmit={handleSubmit} className="exercise-form">
                <div className="form-group">
                    <label>ชื่อท่า *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="form-input"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>ประเภท *</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="form-select"
                    >
                        <option value="reps">จำนวนครั้ง (Reps)</option>
                        <option value="time">จับเวลา (Time)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>รายละเอียด (วิธีเล่น)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="form-textarea"
                        required
                    />
                </div>

                <div className="form-row">
                    <div className="col form-group">
                        <label>
                            {type === "reps" ? "จำนวนครั้งเป้าหมาย *" : "ระยะเวลาที่ใช้ต่อเซ็ต (วินาที) *"}
                        </label>
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="form-input"
                            required
                        />
                    </div>
                    <div className="col form-group">
                        <label>ระยะเวลาเล่นรวม (duration: วินาที)</label>
                        <input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="form-input"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="col form-group">
                        <label>แคลอรี่ที่เผาผลาญ (kcal)</label>
                        <input
                            type="number"
                            value={caloriesBurned}
                            onChange={(e) => setCaloriesBurned(e.target.value)}
                            className="form-input"
                        />
                    </div>
                    <div className="col form-group">
                        <label>กล้ามเนื้อเป้าหมาย (คั่นด้วยลูกน้ำ)</label>
                        <input
                            type="text"
                            value={muscles}
                            onChange={(e) => setMuscles(e.target.value)}
                            className="form-input"
                            placeholder="อก, ไหล่, หลังแขน"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>รูปภาพสาธิตท่า *</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="form-input"
                        required
                    />
                    {imagePreview && (
                        <div className="image-preview">
                            <img src={imagePreview} alt="Preview" />
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label>วิดีโอสาธิตท่า</label>
                    <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoChange}
                        className="form-input"
                    />
                </div>

                <div className="submit-section">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-submit"
                    >
                        {loading ? "กำลังบันทึก..." : "บันทึกท่าออกกำลังกาย"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AddExercise;
