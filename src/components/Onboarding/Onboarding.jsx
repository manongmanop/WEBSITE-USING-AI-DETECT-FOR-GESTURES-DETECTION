import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUserAuth } from "../../context/UserAuthContext";
import './Onboarding.scss';
import Swal from 'sweetalert2';

const Onboarding = () => {
    const { user } = useUserAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        fitnessLevel: 'Beginner', // Beginner, Intermediate, Advanced
        primaryGoal: '',
        preferredDays: []
    });

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleFinish = async () => {
        if (!user?.uid) return;
        setLoading(true);

        try {
            // Calculate weekly goal based on level
            let weeklyGoal = 3;
            if (formData.fitnessLevel === 'Intermediate') weeklyGoal = 5;
            if (formData.fitnessLevel === 'Advanced') weeklyGoal = 7;

            const payload = {
                uid: user.uid,
                ...formData,
                weeklyGoal,
                workoutsDone: 0, // Reset or Init
                caloriesBurned: 0 // Reset or Init
            };

            // Create or Update User
            await axios.post('/api/users', payload);

            // 🔥 ปั้นแผนระยะยาวอัตโนมัติจากข้อมูลที่เพิ่งส่งไป
            try {
                await axios.post(`/api/users/${user.uid}/generate-plan`);
            } catch (planErr) {
                console.error("Plan Generation Error:", planErr);
            }

            Swal.fire({
                icon: 'success',
                title: 'Plan Created!',
                text: 'Your personalized workout plan is ready.',
                timer: 1500,
                showConfirmButton: false
            });

            navigate('/home');

        } catch (err) {
            console.error("Onboarding Error:", err);
            // If 409 (User exists), try PUT? Or just ignore since POST handles upsert logic in some designs, 
            // but our server code returns 409. 
            // Let's assume we use PUT if user exists or modify POST to upsert. 
            // Current server POST returns 409 if exists. Let's try PUT if 409.
            if (err.response?.status === 409) {
                try {
                    let weeklyGoal = 3;
                    if (formData.fitnessLevel === 'Intermediate') weeklyGoal = 5;
                    if (formData.fitnessLevel === 'Advanced') weeklyGoal = 7;

                    await axios.put(`/api/users/${user.uid}`, {
                        ...formData,
                        weeklyGoal
                    });

                    // 🔥 ปั้นแผนระยะยาวอัตโนมัติเช่นกัน
                    try {
                        await axios.post(`/api/users/${user.uid}/generate-plan`);
                    } catch (planErr) {
                        console.error("Plan Generation Error (PUT path):", planErr);
                    }

                    navigate('/home');
                } catch (e) {
                    Swal.fire('Error', 'Failed to save profile', 'error');
                }
            } else {
                Swal.fire('Error', 'Something went wrong', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const updateData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleDay = (day) => {
        setFormData(prev => {
            const days = prev.preferredDays.includes(day)
                ? prev.preferredDays.filter(d => d !== day)
                : [...prev.preferredDays, day];
            return { ...prev, preferredDays: days };
        });
    };

    // Translation Helpers
    const translations = {
        levels: {
            Beginner: { label: 'ผู้เริ่มต้น', sub: '3 วัน/สัปดาห์', details: ['เน้นสร้างนิสัย'] },
            Intermediate: { label: 'ปานกลาง', sub: '5 วัน/สัปดาห์', details: ['เน้นสร้างกล้ามเนื้อ'] },
            Advanced: { label: 'ขั้นสูง', sub: '7 วัน/สัปดาห์', details: ['เน้นประสิทธิภาพสูงสุด'] }
        },
        goals: {
            'Lose Weight': 'ลดน้ำหนัก',
            'Build Muscle': 'สร้างกล้ามเนื้อ',
            'Stay Healthy': 'รักษาสุขภาพ',
            'Increase Strength': 'เพิ่มความแข็งแกร่ง',
            'Improve Endurance': 'เพิ่มความอึด'
        },
        days: {
            Monday: 'จันทร์',
            Tuesday: 'อังคาร',
            Wednesday: 'พุธ',
            Thursday: 'พฤหัสบดี',
            Friday: 'ศุกร์',
            Saturday: 'เสาร์',
            Sunday: 'อาทิตย์',
            // Short names
            Mon: 'จ.', Tue: 'อ.', Wed: 'พ.', Thu: 'พฤ.', Fri: 'ศ.', Sat: 'ส.', Sun: 'อา.'
        }
    };

    const getDayLabel = (day) => translations.days[day] || day;
    const getShortDayLabel = (day) => translations.days[day.slice(0, 3)] || translations.days[day] || day;

    return (
        <div className="onboarding-container">
            <div className="onboarding-card">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(step / 5) * 100}%` }}></div>
                </div>

                {/* Step 1: Welcome */}
                {step === 1 && (
                    <div className="step-content">
                        <h1>ยินดีต้อนรับสู่ Fitness App!</h1>
                        <p>มาสร้างแผนการออกกำลังกายส่วนตัวของคุณในไม่กี่ขั้นตอนกันเถอะ</p>
                        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                            <img src="https://cdni.iconscout.com/illustration/premium/thumb/workout-plan-4439126-3728639.png" alt="Workout" style={{ maxWidth: '200px' }} />
                        </div>
                        <div className="action-buttons">
                            <button className="btn-primary" onClick={nextStep}>เริ่มต้นเลย</button>
                        </div>
                    </div>
                )}

                {/* Step 2: Fitness Level */}
                {step === 2 && (
                    <div className="step-content">
                        <h2>ระดับความฟิตของคุณ</h2>
                        <div className="selection-grid">
                            <div
                                className={`fitness-level-card ${formData.fitnessLevel === 'Beginner' ? 'selected' : ''}`}
                                onClick={() => updateData('fitnessLevel', 'Beginner')}
                            >
                                <div className="level-header">
                                    <h3>🌱 {translations.levels.Beginner.label}</h3>
                                    <span className="level-icon">{translations.levels.Beginner.sub}</span>
                                </div>
                                <div className="level-details">
                                    <span>{translations.levels.Beginner.details[0]}</span>
                                    <span>{translations.levels.Beginner.details[1]}</span>
                                </div>
                            </div>

                            <div
                                className={`fitness-level-card ${formData.fitnessLevel === 'Intermediate' ? 'selected' : ''}`}
                                onClick={() => updateData('fitnessLevel', 'Intermediate')}
                            >
                                <div className="level-header">
                                    <h3>🔥 {translations.levels.Intermediate.label}</h3>
                                    <span className="level-icon">{translations.levels.Intermediate.sub}</span>
                                </div>
                                <div className="level-details">
                                    <span>{translations.levels.Intermediate.details[0]}</span>
                                    <span>{translations.levels.Intermediate.details[1]}</span>
                                </div>
                            </div>

                            <div
                                className={`fitness-level-card ${formData.fitnessLevel === 'Advanced' ? 'selected' : ''}`}
                                onClick={() => updateData('fitnessLevel', 'Advanced')}
                            >
                                <div className="level-header">
                                    <h3>💎 {translations.levels.Advanced.label}</h3>
                                    <span className="level-icon">{translations.levels.Advanced.sub}</span>
                                </div>
                                <div className="level-details">
                                    <span>{translations.levels.Advanced.details[0]}</span>
                                    <span>{translations.levels.Advanced.details[1]}</span>
                                </div>
                            </div>
                        </div>
                        <div className="action-buttons">
                            <button className="btn-secondary" onClick={prevStep}>ย้อนกลับ</button>
                            <button className="btn-primary" onClick={nextStep}>ถัดไป</button>
                        </div>
                    </div>
                )}

                {/* Step 3: Primary Goal */}
                {step === 3 && (
                    <div className="step-content">
                        <h2>เป้าหมายหลักของคุณคืออะไร?</h2>
                        <div className="selection-grid">
                            {['Lose Weight', 'Build Muscle', 'Stay Healthy', 'Increase Strength', 'Improve Endurance'].map(goal => (
                                <div
                                    key={goal}
                                    className={`goal-option ${formData.primaryGoal === goal ? 'selected' : ''}`}
                                    onClick={() => updateData('primaryGoal', goal)}
                                >
                                    <input
                                        type="radio"
                                        name="goal"
                                        checked={formData.primaryGoal === goal}
                                        readOnly
                                    />
                                    <label>{translations.goals[goal]}</label>
                                </div>
                            ))}
                        </div>
                        <div className="action-buttons">
                            <button className="btn-secondary" onClick={prevStep}>ย้อนกลับ</button>
                            <button className="btn-primary" disabled={!formData.primaryGoal} onClick={nextStep}>ถัดไป</button>
                        </div>
                    </div>
                )}

                {/* Step 4: Preferred Days */}
                {step === 4 && (
                    <div className="step-content">
                        <h2>คุณออกกำลังกายวันไหนบ้าง?</h2>
                        <p>เลือกวันที่คุณสะดวกออกกำลังกาย</p>
                        <div className="days-grid">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                <div key={day} className="day-checkbox">
                                    <input
                                        type="checkbox"
                                        id={day}
                                        checked={formData.preferredDays.includes(day)}
                                        onChange={() => toggleDay(day)}
                                    />
                                    <label htmlFor={day}>{getDayLabel(day)}</label>
                                </div>
                            ))}
                        </div>
                        <div className="action-buttons">
                            <button className="btn-secondary" onClick={prevStep}>ย้อนกลับ</button>
                            <button className="btn-primary" onClick={nextStep}>ถัดไป</button>
                        </div>
                    </div>
                )}

                {/* Step 5: Summary */}
                {step === 5 && (
                    <div className="step-content">
                        <h2>แผนส่วนตัวของคุณ</h2>
                        <div className="summary-box">
                            <div className="summary-item">
                                <strong>ระดับ</strong>
                                <span>{translations.levels[formData.fitnessLevel]?.label || formData.fitnessLevel}</span>
                            </div>
                            <div className="summary-item">
                                <strong>เป้าหมายรายสัปดาห์</strong>
                                <span>{formData.fitnessLevel === 'Beginner' ? 3 : formData.fitnessLevel === 'Intermediate' ? 5 : 7} ครั้ง/สัปดาห์</span>
                            </div>
                            <div className="summary-item">
                                <strong>เป้าหมายหลัก</strong>
                                <span>{translations.goals[formData.primaryGoal] || formData.primaryGoal}</span>
                            </div>
                            <div className="summary-item">
                                <strong>ตารางฝึก</strong>
                                <span>{formData.preferredDays.length > 0 ? formData.preferredDays.map(d => getDayLabel(d)).join(', ') : 'ตามความสะดวก'}</span>
                            </div>
                        </div>
                        <div className="action-buttons">
                            <button className="btn-secondary" onClick={prevStep}>แก้ไข</button>
                            <button className="btn-primary" onClick={handleFinish} disabled={loading}>
                                {loading ? 'กำลังสร้างแผน...' : 'ยืนยันและเริ่มต้น'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Onboarding;
