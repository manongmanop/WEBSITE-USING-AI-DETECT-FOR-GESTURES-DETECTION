import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import "./EditProgram.scss";

function EditProgram() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Form fields
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState("");
    const [caloriesBurned, setCaloriesBurned] = useState("");
    const [category, setCategory] = useState("ความแข็งแรง");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [existingImageUrl, setExistingImageUrl] = useState("");

    const CATEGORIES = [
        "ความแข็งแรง", "คาร์ดิโอ", "ความยืดหยุ่น", "HIIT",
        "โปรแกรมช่วงบน", "โปรแกรมช่วงล่าง", "โปรแกรมหน้าท้อง",
        "ลดไขมัน", "เพิ่มกล้าม", "กระชับก้น & ขา"
    ];

    // Workout list
    const [workoutList, setWorkoutList] = useState([]);
    const [allExercises, setAllExercises] = useState([]);
    const [isSavingList, setIsSavingList] = useState(false);

    // New exercise row state
    const [newEx, setNewEx] = useState({
        exercise: "",
        sets: 3,
        reps: 10,
        duration: "00:00",
        met: 0, // ✅ เพิ่มค่า MET เริ่มต้น
        order: 0,
    });

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [programRes, exercisesRes] = await Promise.all([
                    axios.get(`/api/workout_programs/${id}`),
                    axios.get(`/api/exercises`),
                ]);

                const data = programRes.data;
                setName(data.name || "");
                setDescription(data.description || "");
                setDuration(data.duration || "");
                setCaloriesBurned(data.caloriesBurned || "");
                setExistingImageUrl(data.imageUrl || data.image || "");
                setCategory(data.category || "ความแข็งแรง");

                // workoutList items may have exercise as populated object or ObjectId
                const mappedList = (data.workoutList || []).map(item => {
                    const exObj = item.exercise && typeof item.exercise === "object" ? item.exercise : {};
                    // ✅ Fallback: ถ้า item.duration ไม่มี ให้ลองดูที่ item.time หรือข้อมูลจากตัว Exercise เอง
                    const rawDuration = item.duration || item.time || exObj.duration || exObj.time || exObj.value || 0;
                    console.log("🔍 Mapping item:", exObj.name || "Unknown", "RawDuration:", rawDuration);
                    
                    return {
                        ...item,
                        sets: item.sets ?? 3,
                        reps: item.reps ?? 10,
                        duration: formatDuration(rawDuration),
                        met: item.met ?? 0
                    };
                });
                setWorkoutList(mappedList);
                setAllExercises(exercisesRes.data || []);
            } catch (error) {
                console.error("Error fetching program:", error);
                Swal.fire("ข้อผิดพลาด", "ไม่สามารถดึงข้อมูลโปรแกรมได้", "error");
                navigate("/admin/programs");
            } finally {
                setFetching(false);
            }
        };
        fetchAll();
    }, [id, navigate]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // ── Submit info form ──────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !description || !duration) {
            Swal.fire("ข้อผิดพลาด", "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", "error");
            return;
        }
        setLoading(true);
        try {
            // Normalize workoutList to send alongside info update
            // so the backend does not wipe it out
            const normalizedList = workoutList.map((item, idx) => ({
                exercise:
                    item.exercise && typeof item.exercise === "object"
                        ? item.exercise._id
                        : item.exercise,
                sets: Number(item.sets) || 3,
                reps: Number(item.reps) || 0,
                duration: parseDuration(item.duration),
                met: Number(item.met) || 0,
                order: idx,
            }));

            const formData = new FormData();
            formData.append("name", name);
            formData.append("description", description);
            formData.append("duration", duration);
            formData.append("caloriesBurned", caloriesBurned || 0);
            formData.append("category", category);
            // Always send workoutList to prevent backend from clearing it
            formData.append("workoutList", JSON.stringify(normalizedList));
            if (imageFile) formData.append("image", imageFile);

            const res = await axios.put(`/api/workout_programs/${id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (res.status === 200) {
                Swal.fire("สำเร็จ", "แก้ไขข้อมูลโปรแกรมเรียบร้อยแล้ว", "success");
            }
        } catch (error) {
            console.error("Error updating program:", error);
            Swal.fire("ข้อผิดพลาด", "ไม่สามารถแก้ไขโปรแกรมได้", "error");
        } finally {
            setLoading(false);
        }
    };

    // ── Helper: Duration formatting ──────────────────────────────────────────
    const formatDuration = (seconds) => {
        if (!seconds) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    const parseDuration = (timeStr) => {
        if (!timeStr || typeof timeStr !== "string") return 0;
        if (!timeStr.includes(":")) return parseInt(timeStr) || 0;
        const [mins, secs] = timeStr.split(":").map(s => parseInt(s) || 0);
        return (mins * 60) + secs;
    };

    // ── WorkoutList helpers ───────────────────────────────────────────────────
    const getExerciseName = (item) => {
        // populated object
        if (item.exercise && typeof item.exercise === "object") {
            return item.exercise.name || "ไม่มีชื่อท่า";
        }
        // ObjectId string — look up in allExercises
        const found = allExercises.find((ex) => ex._id === item.exercise);
        return found ? found.name : item.exercise || "ไม่มีชื่อท่า";
    };

    const handleAddExercise = () => {
        if (!newEx.exercise) {
            Swal.fire("แจ้งเตือน", "กรุณาเลือกท่าออกกำลังกาย", "warning");
            return;
        }
        setWorkoutList((prev) => [
            ...prev,
            { ...newEx, order: prev.length },
        ]);
        setNewEx({ exercise: "", sets: 3, reps: 10, duration: "00:00", met: 0, order: 0 });
    };

    const handleRemoveExercise = (index) => {
        setWorkoutList((prev) => prev.filter((_, i) => i !== index));
    };

    const handleExerciseFieldChange = (index, field, value) => {
        setWorkoutList((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        );
    };

    const handleSaveWorkoutList = async () => {
        setIsSavingList(true);
        try {
            // Normalize: send only exercise._id if object, otherwise send as-is
            const normalized = workoutList.map((item, idx) => ({
                exercise:
                    item.exercise && typeof item.exercise === "object"
                        ? item.exercise._id
                        : item.exercise,
                sets: Number(item.sets) || 3,
                reps: Number(item.reps) || 0,
                duration: parseDuration(item.duration),
                met: Number(item.met) || 0,
                order: idx,
            }));

            // Always send basic fields too so the backend does not
            // overwrite them with empty values when only workoutList changes
            const formData = new FormData();
            formData.append("name", name);
            formData.append("description", description);
            formData.append("duration", duration);
            formData.append("caloriesBurned", caloriesBurned || 0);
            formData.append("category", category);
            formData.append("workoutList", JSON.stringify(normalized));
            // Do NOT append image here — only append if the user just selected one
            // The backend should preserve the existing image URL when no new file is sent

            await axios.put(`/api/workout_programs/${id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            Swal.fire("สำเร็จ", "บันทึกรายการท่าออกกำลังกายเรียบร้อยแล้ว", "success");
        } catch (error) {
            console.error("Error saving workout list:", error);
            Swal.fire("ข้อผิดพลาด", "ไม่สามารถบันทึกรายการท่าได้", "error");
        } finally {
            setIsSavingList(false);
        }
    };

    const getMediaDisplayUrl = (url) => {
        if (!url) return "";
        return url;
    };

    if (fetching) return <div style={{ padding: "20px" }}>กำลังโหลดข้อมูล...</div>;

    return (
        <div className="edit-program">
            {/* ── Header ── */}
            <div className="header">
                <h2>แก้ไขโปรแกรม</h2>
                <button onClick={() => navigate(-1)} className="btn-back">
                    กลับ
                </button>
            </div>

            {/* ── Info Form ── */}
            <form onSubmit={handleSubmit} className="program-form">
                <div className="form-group">
                    <label>ชื่อโปรแกรม *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="form-input"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>รายละเอียด</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="form-textarea"
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
                    <div className="image-preview-group">
                        {imagePreview ? (
                            <div className="preview-item">
                                <p>รูปภาพใหม่ที่จะอัปโหลด:</p>
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

                <div className="submit-section">
                    <button type="submit" disabled={loading} className="btn-submit">
                        {loading ? "กำลังปรับปรุง..." : "ปรับปรุงข้อมูลโปรแกรม"}
                    </button>
                </div>
            </form>

            {/* ── Workout List Section ── */}
            <div className="workout-section">
                <div className="workout-section-header">
                    <h3>🏋️ รายการท่าออกกำลังกาย</h3>
                    <span className="exercise-count">{workoutList.length} ท่า</span>
                </div>

                {/* Table */}
                <div className="exercise-table-wrapper">
                    <table className="exercise-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>ชื่อท่า</th>
                                <th>เซต</th>
                                <th>ครั้ง</th>
                                <th>เวลา</th>
                                <th>MET</th>
                                <th>ลบ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workoutList.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="empty-row">
                                        ยังไม่มีท่าออกกำลังกายในโปรแกรมนี้
                                    </td>
                                </tr>
                            ) : (
                                workoutList.map((item, index) => (
                                    <tr key={index}>
                                        <td className="order-cell">{index + 1}</td>
                                        <td className="name-cell">{getExerciseName(item)}</td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={item.sets || ""}
                                                onChange={(e) => {
                                                    let val = e.target.value;
                                                    if (val !== "") {
                                                        val = Math.abs(Number(val));
                                                        if (val > 100) val = 100;
                                                    }
                                                    handleExerciseFieldChange(index, "sets", val);
                                                }}
                                                className="inline-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={item.reps || ""}
                                                onChange={(e) => {
                                                    let val = e.target.value;
                                                    if (val !== "") {
                                                        val = Math.abs(Number(val));
                                                        if (val > 100) val = 100;
                                                    }
                                                    handleExerciseFieldChange(index, "reps", val);
                                                }}
                                                className="inline-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                placeholder="00:30"
                                                value={item.duration || ""}
                                                maxLength="5"
                                                onChange={(e) => {
                                                    let val = e.target.value.replace(/[^0-9:]/g, ""); // Allow only numbers and colon
                                                    handleExerciseFieldChange(index, "duration", val);
                                                }}
                                                className="inline-input time-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={item.met || ""}
                                                onChange={(e) => handleExerciseFieldChange(index, "met", e.target.value)}
                                                className="inline-input met-input"
                                                style={{ width: '60px' }}
                                            />
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleRemoveExercise(index)}
                                                className="btn-remove"
                                                title="ลบท่านี้"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Add exercise row */}
                <div className="add-exercise-row">
                    <select
                        value={newEx.exercise}
                        onChange={(e) => setNewEx({ ...newEx, exercise: e.target.value })}
                        className="ex-select"
                    >
                        <option value="">-- เลือกท่าออกกำลังกาย --</option>
                        {allExercises.map((ex) => (
                            <option key={ex._id} value={ex._id}>
                                {ex.name}
                            </option>
                        ))}
                    </select>

                    <div className="add-inputs">
                        <label>เซต</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={newEx.sets}
                            onChange={(e) => {
                                let val = e.target.value;
                                if (val !== "") {
                                    val = Math.abs(Number(val));
                                    if (val > 100) val = 100;
                                }
                                setNewEx({ ...newEx, sets: val !== "" ? Number(val) : "" });
                            }}
                            className="small-input"
                        />
                        <label>ครั้ง</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={newEx.reps}
                            onChange={(e) => {
                                let val = e.target.value;
                                if (val !== "") {
                                    val = Math.abs(Number(val));
                                    if (val > 100) val = 100;
                                }
                                setNewEx({ ...newEx, reps: val !== "" ? Number(val) : "" });
                            }}
                            className="small-input"
                        />
                        <label>เวลา</label>
                        <input
                            type="text"
                            placeholder="00:30"
                            value={newEx.duration}
                            maxLength="5"
                            onChange={(e) => {
                                let val = e.target.value.replace(/[^0-9:]/g, "");
                                setNewEx({ ...newEx, duration: val });
                            }}
                            className="small-input"
                        />
                        <label>MET</label>
                        <input
                            type="number"
                            step="0.1"
                            value={newEx.met}
                            onChange={(e) => setNewEx({ ...newEx, met: e.target.value })}
                            className="small-input"
                            style={{ width: '60px' }}
                        />
                    </div>

                    <button onClick={handleAddExercise} className="btn-add-exercise">
                        + เพิ่มท่า
                    </button>
                </div>

                {/* Save list */}
                <div className="save-list-section">
                    <button
                        onClick={handleSaveWorkoutList}
                        disabled={isSavingList}
                        className="btn-save-list"
                    >
                        {isSavingList ? "กำลังบันทึก..." : "💾 บันทึกรายการท่า"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EditProgram;
