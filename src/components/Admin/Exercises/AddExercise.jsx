import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import "./AddExercise.scss";

function AddExercise() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Form fields
    const [name, setName] = useState("");
    const [type, setType] = useState("reps");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState("");
    const [reps, setReps] = useState("");
    const [muscles, setMuscles] = useState("");

    // New fields
    const [difficulty, setDifficulty] = useState("beginner");
    const [tips, setTips] = useState("");
    const [metBase, setMetBase] = useState(5.0);
    const [metMin, setMetMin] = useState(4.0);
    const [metMax, setMetMax] = useState(6.0);
    const [metSource, setMetSource] = useState("Compendium of Physical Activities");
    const [metMappedFrom, setMetMappedFrom] = useState("Weight training (general)");

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

        if (!name || (!duration && !reps)) {
            Swal.fire("ข้อผิดพลาด", "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", "error");
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("type", type);
            formData.append("description", description);
            formData.append("duration", duration || 60);
            if (type === "reps") formData.append("reps", reps || 0);

            // Convert comma-separated string back to array if needed, otherwise send as JSON string
            const musclesArray = muscles.split(",").map(m => m.trim()).filter(Boolean);
            formData.append("muscles", JSON.stringify(musclesArray));

            formData.append("difficulty", difficulty);
            
            const tipsArray = tips.split("\n").map(t => t.trim()).filter(Boolean);
            formData.append("tips", JSON.stringify(tipsArray));
            
            const metData = {
                base: parseFloat(metBase) || 5.0,
                min: parseFloat(metMin) || 4.0,
                max: parseFloat(metMax) || 6.0,
                source: metSource,
                mappedFrom: metMappedFrom
            };
            formData.append("met", JSON.stringify(metData));

            if (imageFile) formData.append("image", imageFile);
            if (videoFile) formData.append("video", videoFile);

            const res = await axios.post(`/api/exercises`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            if (res.status === 201 || res.status === 200) {
                Swal.fire("สำเร็จ", "เพิ่มท่าออกกำลังกายเรียบร้อยแล้ว", "success");
                navigate("/admin/exercises");
            }
        } catch (error) {
            console.error("Error creating exercise:", error);
            Swal.fire("ข้อผิดพลาด", "ไม่สามารถเพิ่มท่าออกกำลังกายได้", "error");
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
                            value={type === "reps" ? reps : duration}
                            onChange={(e) => type === "reps" ? setReps(e.target.value) : setDuration(e.target.value)}
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

                <div className="form-row">
                    <div className="col form-group">
                        <label>ระดับความยาก</label>
                        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="form-select">
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                    <div className="col form-group">
                        <label>Tips (ข้อแนะนำ - แยกด้วยการขึ้นบรรทัดใหม่)</label>
                        <textarea value={tips} onChange={(e) => setTips(e.target.value)} className="form-textarea" placeholder={"เช่น\nหลังตรง\nไม่กลั้นหายใจ"} rows="3" />
                    </div>
                </div>

                <div className="form-group-section" style={{ border: "1px dashed #ccc", padding: "15px", marginBottom: "20px", borderRadius: "8px" }}>
                    <h4 style={{ marginTop: 0, marginBottom: "15px", color: "#555" }}>MET Configuration (อัตราการเผาผลาญ)</h4>
                    <div className="form-row">
                        <div className="col form-group">
                            <label>Base MET</label>
                            <input type="number" step="0.1" value={metBase} onChange={(e) => setMetBase(e.target.value)} className="form-input" />
                        </div>
                        <div className="col form-group">
                            <label>Min MET</label>
                            <input type="number" step="0.1" value={metMin} onChange={(e) => setMetMin(e.target.value)} className="form-input" />
                        </div>
                        <div className="col form-group">
                            <label>Max MET</label>
                            <input type="number" step="0.1" value={metMax} onChange={(e) => setMetMax(e.target.value)} className="form-input" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="col form-group">
                            <label>Source</label>
                            <input type="text" value={metSource} onChange={(e) => setMetSource(e.target.value)} className="form-input" />
                        </div>
                        <div className="col form-group">
                            <label>Mapped From</label>
                            <select value={metMappedFrom} onChange={(e) => setMetMappedFrom(e.target.value)} className="form-select">
                                <option value="Calisthenics (light)">Calisthenics (light)</option>
                                <option value="Calisthenics (moderate)">Calisthenics (moderate)</option>
                                <option value="Calisthenics (vigorous)">Calisthenics (vigorous)</option>
                                <option value="Weight training (light)">Weight training (light)</option>
                                <option value="Weight training (moderate)">Weight training (moderate)</option>
                                <option value="Weight training (vigorous)">Weight training (vigorous)</option>
                                <option value="Resistance training (general)">Resistance training (general)</option>
                                <option value="Core exercise">Core exercise</option>
                                <option value="Floor exercise">Floor exercise</option>
                                <option value="Stretching">Stretching</option>
                                <option value="Yoga">Yoga</option>
                            </select>
                        </div>
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
