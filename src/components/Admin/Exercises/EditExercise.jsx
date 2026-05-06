import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
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
    const [existingImageUrl, setExistingImageUrl] = useState("");

    const [videoFile, setVideoFile] = useState(null);
    const [existingVideoUrl, setExistingVideoUrl] = useState("");

    const [audioFile, setAudioFile] = useState(null);
    const [existingAudioUrl, setExistingAudioUrl] = useState("");
    const [audioPreviewUrl, setAudioPreviewUrl] = useState("");

    useEffect(() => {
        const fetchExercise = async () => {
            try {
                const res = await axios.get(`/api/exercises/${id}`);
                const data = res.data;
                setName(data.name || "");
                setType(data.type || "reps");
                setDescription(data.description || "");
                setDuration(data.duration || "");
                setReps(data.reps || data.value || "");
                setMuscles(Array.isArray(data.muscles) ? data.muscles.join(", ") : "");

                setDifficulty(data.difficulty || "beginner");
                setTips(Array.isArray(data.tips) ? data.tips.join("\n") : (typeof data.tips === 'string' ? data.tips : ""));
                
                if (data.met) {
                    setMetBase(data.met.base ?? 5.0);
                    setMetMin(data.met.min ?? 4.0);
                    setMetMax(data.met.max ?? 6.0);
                    setMetSource(data.met.source || "Compendium of Physical Activities");
                    setMetMappedFrom(data.met.mappedFrom || "Weight training (general)");
                }

                setExistingImageUrl(data.media?.imageUrl || data.imageUrl || data.image || "");
                setExistingVideoUrl(data.media?.videoUrl || data.videoUrl || data.video || "");
                setExistingAudioUrl(data.media?.audioUrl || data.audioUrl || "");
            } catch (error) {
                console.error("Error fetching exercise:", error);
                Swal.fire("ข้อผิดพลาด", "ไม่สามารถดึงข้อมูลท่าออกกำลังกายได้", "error");
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

    const handleAudioChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAudioFile(file);
            setAudioPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveAudio = async () => {
        if (!existingAudioUrl) return;
        setExistingAudioUrl("");
        setAudioFile(null);
        setAudioPreviewUrl("");
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
            if (audioFile) formData.append("audio", audioFile);
            // หากลบไฟล์เสียงโดยไม่อัปโหลดใหม่ ให้ส่ง flag เพื่อลบข้อมูลออก
            if (!audioFile && !existingAudioUrl) formData.append("removeAudio", "true");

            const res = await axios.put(`/api/exercises/${id}`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            if (res.status === 200) {
                Swal.fire("สำเร็จ", "แก้ไขข้อมูลเรียบร้อยแล้ว", "success");
                navigate("/admin/exercises");
            }
        } catch (error) {
            console.error("Error updating exercise:", error);
            Swal.fire("ข้อผิดพลาด", "ไม่สามารถแก้ไขท่าออกกำลังกายได้", "error");
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

                {/* ——— ไฟล์เสียงพูดสำหรับ Tips ——— */}
                <div className="form-group" style={{ border: '1px dashed #10b981', padding: '15px', borderRadius: '8px', background: '#f0fdf4' }}>
                    <label style={{ fontWeight: 'bold', color: '#065f46', display: 'block', marginBottom: '8px' }}>
                        🔊 ไฟล์เสียงคำแนะนำ (Pre-recorded Audio)
                    </label>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '10px' }}>
                        อัปโหลดไฟล์เสียง MP3/WAV ที่อัดไว้ล่วงหน้า ระบบจะเล่นไฟล์นี้แทนการสุ่ม TTS
                    </p>
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioChange}
                        className="form-input"
                    />
                    {/* Preview ไฟล์ใหม่ */}
                    {audioPreviewUrl && (
                        <div style={{ marginTop: '10px' }}>
                            <p style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '4px' }}>✅ ไฟล์เสียงใหม่ (ทดสอบฟัง):</p>
                            <audio controls src={audioPreviewUrl} style={{ width: '100%' }} />
                        </div>
                    )}
                    {/* แสดงไฟล์เสียงเดิม */}
                    {existingAudioUrl && !audioPreviewUrl && (
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '4px' }}>🔊 ไฟล์เสียงที่บันทึกไว้:</p>
                                <audio controls src={existingAudioUrl} style={{ width: '100%' }} />
                            </div>
                            <button
                                type="button"
                                onClick={handleRemoveAudio}
                                style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                            >
                                🗑️ ลบไฟล์เสียง
                            </button>
                        </div>
                    )}
                    {!existingAudioUrl && !audioPreviewUrl && (
                        <p style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: '6px' }}>⚠️ ยังไม่มีไฟล์เสียง — ระบบจะใช้เสียง TTS สำรองแทน</p>
                    )}
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
