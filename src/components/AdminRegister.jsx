import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// import {
//   createUserWithEmailAndPassword,
//   sendEmailVerification,
//   signOut,
// } from "firebase/auth";
// import { auth, db } from "../../firebase";
// import { doc, setDoc } from "firebase/firestore";
import { showAlert, getSwal } from "../utils/showAlert";

import { 
  EmailIcon, 
  LockIcon, 
  VisibilityIcon, 
  VisibilityOffIcon, 
  PersonAddIcon, 
  PersonIcon, 
  LoginIcon, 
  SupervisorAccountIcon 
} from "./Common/Icons";
import "./Register.css";

function AdminRegister() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const navigate = useNavigate();

  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  const getPasswordStrengthText = (strength) => {
    switch (strength) {
      case 0:
      case 1: return "อ่อนแอ";
      case 2: return "ปานกลาง";
      case 3: return "แข็งแกร่ง";
      case 4:
      case 5: return "แข็งแกร่งมาก";
      default: return "";
    }
  };

  const getPasswordStrengthColor = (strength) => {
    switch (strength) {
      case 0:
      case 1: return "#dc3545";
      case 2: return "#ffc107";
      case 3: return "#fd7e14";
      case 4:
      case 5: return "#28a745";
      default: return "#dee2e6";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !name) {
      return showAlert({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอกข้อมูลให้ครบถ้วน",
        confirmButtonColor: "#27BAF9",
      });
    }

    if (passwordStrength < 3) {
      return showAlert({
        icon: "warning",
        title: "รหัสผ่านไม่ปลอดภัย",
        text: "กรุณาใช้รหัสผ่านที่ยากต่อการเดา (มีตัวใหญ่ ตัวเล็ก และตัวเลข)",
        confirmButtonColor: "#27BAF9",
      });
    }

    setIsLoading(true);
    const Swal = await getSwal();
    showAlert({
      title: "กำลังลงทะเบียน Admin...",
      text: "กรุณารอสักครู่",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const { initFirebase } = await import("../../firebase");
      const { auth, db } = await initFirebase();
      const { createUserWithEmailAndPassword, sendEmailVerification, signOut } = await import("firebase/auth");
      const { doc, setDoc } = await import("firebase/firestore");

      // 1) สร้างบัญชีใหม่
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const newAdminUser = result.user;

      // 2) ส่งอีเมลยืนยัน
      await sendEmailVerification(newAdminUser);

      // 3) บันทึกข้อมูล admin ลง Firestore (เก็บใน 2 collection เผื่อการ query แบบรวม)
      // เก็บใน admin collection เพื่ออ้างอิงสิทธ์ปกปิด
      await setDoc(doc(db, "admin", newAdminUser.uid), {
        uid: newAdminUser.uid,
        name,
        email,
        role: "admin",
        createdAt: new Date(),
      });

      // เก็บใน users collection ด้วยเพื่อให้โชว์ในตารางหลักและการนับยอด
      await setDoc(doc(db, "users", newAdminUser.uid), {
        uid: newAdminUser.uid,
        name,
        email,
        role: "admin",
        userstatus: "pass", // ข้ามการกรอกข้อมูลพื้นฐานไปเลย (แล้วแต่ระบบออกแบบ)
        createdAt: new Date(),
      });

      // 4) เซ็นเอาต์
      await signOut(auth);

      // 5) แจ้งผล
      Swal.close(); // Close loading alert
      showAlert({
        icon: "success",
        title: "สมัคร Admin สำเร็จ",
        html: `ระบบได้ส่งอีเมลยืนยันไปยัง <strong>${email}</strong><br/>กรุณาตรวจสอบอีเมลและกดลิงก์ยืนยันก่อนเข้าสู่ระบบ`,
        confirmButtonColor: "#27BAF9",
      }).then(() => {
        navigate("/login");
      });

    } catch (err) {
      setIsLoading(false);
      console.error("Admin register error:", err);
      let message = "เกิดข้อผิดพลาดในการสมัครผู้ดูแลระบบ";
      if (err.code === "auth/email-already-in-use") {
        message = "อีเมลนี้มีอยู่ในระบบแล้ว";
      } else if (err.code === "auth/weak-password") {
        message = "รหัสผ่านคาดเดาง่ายเกินไป";
      } else if (err.code === "auth/invalid-email") {
        message = "รูปแบบอีเมลไม่ถูกต้อง";
      }

      Swal.close(); // Close loading alert
      showAlert({
        icon: "error",
        title: "สมัคร Admin ไม่สำเร็จ",
        text: message,
        confirmButtonColor: "#27BAF9",
      });
    }
  };

  return (
    <div className="register-container">
      <div className="floating-elements">
        <div className="floating-circle circle-1" style={{ background: "rgba(16, 185, 129, 0.1)" }}></div>
        <div className="floating-circle circle-2" style={{ background: "rgba(59, 130, 246, 0.1)" }}></div>
        <div className="floating-circle circle-3" style={{ background: "rgba(139, 92, 246, 0.1)" }}></div>
      </div>

      <div className="register-box">
        <div className="video-section">
          <div className="video-overlay" style={{ background: "linear-gradient(135deg, rgba(31, 41, 55, 0.9) 0%, rgba(17, 24, 39, 0.95) 100%)" }}>
            <div className="brand-section">
              <SupervisorAccountIcon className="brand-icon" style={{ fontSize: "3.5rem", color: "#60a5fa" }} />
              <h1 className="brand-title" style={{ fontSize: "2rem", marginTop: "1rem" }}>ระบบผู้ดูแล</h1>
              <p className="brand-subtitle">HealthCare Admin Portal</p>
            </div>
            <div className="welcome-text">
              <h2 style={{ fontSize: "1.5rem" }}>จัดการฐานข้อมูลอย่างปลอดภัย</h2>
              <p style={{ opacity: "0.8" }}>สำหรับบุคลากรภายในเท่านั้น</p>
            </div>
            <div className="footer-section">
              <span className="footer-text">มีบัญชีผู้ดูแลระบบแบบพิเศษอยู่แล้ว?</span>
              <Link to="/login" className="footer-link">
                <LoginIcon className="me-2" /> เข้าสู่ระบบที่นี่
              </Link>
            </div>
          </div>
        </div>

        <div className="form-section">
          {/* Mobile Back Button */}
          <Link to="/login" className="mobile-back-link">
            <MdLogin className="back-icon" />
            กลับไปหน้าเข้าสู่ระบบทั่วไป
          </Link>

          <div className="form-header">
            <h2 className="form-title">สร้างบัญชีผู้ดูแลระบบ</h2>
            <p className="form-subtitle">ลงทะเบียนการเข้าถึงระดับ Admin</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <div className="input-wrapper">
                <PersonIcon className="input-icon" />
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุลผู้แลระบบ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="custom-input"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <div className="input-wrapper">
                <EmailIcon className="input-icon" />
                <input
                  type="email"
                  placeholder="อีเมลองค์กร (เช่น @healthcare.com)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="custom-input"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <div className="input-wrapper">
                <LockIcon className="input-icon" />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="ตั้งรหัสผ่านที่ปลอดภัย"
                  value={password}
                  onChange={handlePasswordChange}
                  className="custom-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPass(!showPass)}
                  disabled={isLoading}
                >
                  {showPass ? <VisibilityIcon /> : <VisibilityOffIcon />}
                </button>
              </div>
              {password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div
                      className="strength-fill"
                      style={{
                        width: `${(passwordStrength / 5) * 100}%`,
                        backgroundColor: getPasswordStrengthColor(passwordStrength)
                      }}
                    ></div>
                  </div>
                  <span
                    className="strength-text"
                    style={{ color: getPasswordStrengthColor(passwordStrength) }}
                  >
                    {getPasswordStrengthText(passwordStrength)}
                  </span>
                </div>
              )}
            </div>

            <div className="button-group" style={{ marginTop: "2rem" }}>
              <button
                type="submit"
                className="primary-button"
                style={{ background: "linear-gradient(45deg, #10b981, #059669)" }}
                disabled={isLoading}
              >
                <PersonAddIcon className="button-icon" />
                {isLoading ? "กำลังตรวจสอบข้อมูล..." : "ลงทะเบียน Admin"}
              </button>

              <div className="login-redirect mobile-hide-desktop-show">
                <span>มีสิทธิ์ผู้ดูแลอยู่แล้ว?</span>
                <Link to="/login" className="login-link">
                  เข้าสู่ระบบเลย
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminRegister;
