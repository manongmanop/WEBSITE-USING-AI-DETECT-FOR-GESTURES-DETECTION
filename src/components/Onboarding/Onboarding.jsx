import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUserAuth } from "../../context/UserAuthContext";
import './Onboarding.scss';
import Swal from 'sweetalert2';

function mapLevel(level) {
  if (level === 'Beginner') return 1;
  if (level === 'Intermediate') return 2;
  return 3;
}

function getInitialLevel(exp) {
  if (exp === 'never') return 1;
  if (exp === 'sometimes') return 2;
  return 3;
}

function mapGoal(goal) {
  if (goal === 'Lose Weight') return 'fat_loss';
  if (goal === 'Build Muscle') return 'muscle_gain';
  return 'health';
}

const Onboarding = () => {
    const { user } = useUserAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        experience: 'never', // never, sometimes, regular
        fitnessLevel: 'Beginner', // Beginner, Intermediate, Advanced
        primaryGoal: ''
    });

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleFinish = async () => {
        if (!user?.uid) return;
        
        if (!formData.experience || !formData.fitnessLevel || !formData.primaryGoal) {
            Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณากรอกข้อมูลให้ครบทุกขั้นตอนก่อนยืนยันหน้าถัดไป'
            });
            return;
        }

        setLoading(true);

        try {
            // Calculate weekly goal based on level
            let weeklyGoal = 3;
            if (formData.fitnessLevel === 'Intermediate') weeklyGoal = 5;
            if (formData.fitnessLevel === 'Advanced') weeklyGoal = 7;

            const payload = {
                uid: user.uid,
                ...formData,
                experience: formData.experience,
                initialLevel: getInitialLevel(formData.experience),
                fitnessLevel: mapLevel(formData.fitnessLevel),
                primaryGoal: mapGoal(formData.primaryGoal),
                weeklyGoal,
                workoutsDone: 0, // Reset or Init
                caloriesBurned: 0 // Reset or Init
            };

            // Create or Update User
            await axios.post('/api/users', payload);
            
            // 🔥 ปั้นแผนระยะยาวอัตโนมัติจากข้อมูลที่เพิ่งส่งไป
            await axios.post(`/api/users/${user.uid}/generate-plan`);

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
                        experience: formData.experience,
                        initialLevel: getInitialLevel(formData.experience),
                        fitnessLevel: mapLevel(formData.fitnessLevel),
                        primaryGoal: mapGoal(formData.primaryGoal),
                        weeklyGoal
                    });
                    
                    // 🔥 ปั้นแผนระยะยาวอัตโนมัติเช่นกัน
                    await axios.post(`/api/users/${user.uid}/generate-plan`);

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
        }
    };

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

                {/* Step 2: Experience */}
                {step === 2 && (
                    <div className="step-content">
                        <h2>ประสบการณ์ออกกำลังกายของคุณ</h2>
                        <div className="selection-grid">
                            {['never', 'sometimes', 'regular'].map(exp => (
                                <div
                                    key={exp}
                                    className={`goal-option ${formData.experience === exp ? 'selected' : ''}`}
                                    onClick={() => updateData('experience', exp)}
                                >
                                    <input
                                        type="radio"
                                        name="experience"
                                        checked={formData.experience === exp}
                                        readOnly
                                    />
                                    <label>
                                        {exp === 'never' ? 'ยังไม่ได้ออกกำลังกายเลย' : exp === 'sometimes' ? 'ออกบ้างบางครั้ง' : 'ออกเป็นประจำ'}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <div className="action-buttons">
                            <button className="btn-secondary" onClick={prevStep}>ย้อนกลับ</button>
                            <button className="btn-primary" onClick={nextStep}>ถัดไป</button>
                        </div>
                    </div>
                )}

                {/* Step 3: Fitness Level */}
                {step === 3 && (
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

                {/* Step 4: Primary Goal */}
                {step === 4 && (
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

                {/* Step 5: Summary */}
                {step === 5 && (
                    <div className="step-content">
                        <h2>แผนส่วนตัวของคุณ</h2>
                        <div className="summary-box">
                            <div className="summary-item">
                                <strong>ประสบการณ์</strong>
                                <span>{formData.experience === 'never' ? 'ยังไม่ได้ออกกำลังกายเลย' : formData.experience === 'sometimes' ? 'ออกบ้างบางครั้ง' : 'ออกเป็นประจำ'}</span>
                            </div>
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
