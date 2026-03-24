import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { showAlert, getSwal } from "../../../utils/showAlert";
import "./EditExercise.scss";

function EditExercise() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

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
    const [existingImageUrl, setExistingImageUrl] = useState("");

    const [videoFile, setVideoFile] = useState(null);
    const [existingVideoUrl, setExistingVideoUrl] = useState("");

    useEffect(() => {
        const fetchExercise = async () => {
            try {
                const res = await axios.get(`/api/exercises/${id}`);
                const data = res.data;
                setName(data.name || "");
                setType(data.type || "reps");
                setDescription(data.description || "");
                setDuration(data.duration || "");
                setCaloriesBurned(data.caloriesBurned || "");
                setValue(data.value || "");
                setMuscles(Array.isArray(data.muscles) ? data.muscles.join(", ") : "");

                setExistingImageUrl(data.imageUrl || data.image || "");
                setExistingVideoUrl(data.videoUrl || data.video || "");
            } catch (error) {
                console.error("Error fetching exercise:", error);
                showAlert({ title: "ข้อผิดพลาด", text: "ไม่สามารถดึงข้อมูลท่าออกกำลังกายได้", icon: "error" });
                navigate("/admin/exercises");
            } finally {
                setFetching(false);
            }
        };
        fetchExercise();
    }, [id, navigate]);

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

            const musclesArray = muscles.split(",").map(m => m.trim()).filter(Boolean);
            formData.append("muscles", JSON.stringify(musclesArray));

            if (imageFile) formData.append("image", imageFile);
            if (videoFile) formData.append("video", videoFile);

            const res = await axios.put(`/api/exercises/${id}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            if (res.status === 200) {
                showAlert({ title: "สำเร็จ", text: "แก้ไขข้อมูลเรียบร้อยแล้ว", icon: "success" });
                navigate("/admin/exercises");
            }
        } catch (error) {
            console.error("Error updating exercise:", error);
            showAlert({ title: "ข้อผิดพลาด", text: "ไม่สามารถแก้ไขท่าออกกำลังกายได้", icon: "error" });
        } finally {
            setLoading(false);
        }
    };

    const getMediaDisplayUrl = (url) => {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return url;
    };

    if (fetching) return <div style={{ padding: "20px" }}>กำลังโหลดข้อมูล...</div>;

    return (
        <div className="edit-exercise">
            <div className="header">
                <h2>แก้ไขท่าออกกำลังกาย</h2>
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
                    <label>เปลี่ยนรูปภาพสาธิตท่า</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="form-input"
                    />
                    <div className="image-preview-group">
                        {imagePreview ? (
                            <div className="preview-item">
                                <p>รูปภาพใหม่:</p>
                                <img src={imagePreview} alt="New Preview" />
                            </div>
                        ) : existingImageUrl ? (
                            <div className="preview-item">
                                <p>รูปภาพเดิม:</p>
                                <img src={getMediaDisplayUrl(existingImageUrl)} alt="Existing" />
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="form-group">
                    <label>เปลี่ยนวิดีโอสาธิตท่า</label>
                    <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoChange}
                        className="form-input"
                    />
                    <div className="video-preview">
                        {existingVideoUrl && !videoFile && (
                            <p>ไฟล์วิดีโอเดิม: {existingVideoUrl.split("/").pop()}</p>
                        )}
                    </div>
                </div>

                <div className="submit-section">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-submit"
                    >
                        {loading ? "กำลังปรับปรุง..." : "ปรับปรุงท่าออกกำลังกาย"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default EditExercise;
