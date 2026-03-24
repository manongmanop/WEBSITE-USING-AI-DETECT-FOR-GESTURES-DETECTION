import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Alert, Button } from "react-bootstrap";
import { 
  EmailIcon, 
  LockIcon, 
  VisibilityIcon, 
  VisibilityOffIcon, 
  PersonAddIcon, 
  LoginIcon, 
  CheckIcon, 
  SparklesIcon 
} from "./Common/Icons";
import { useUserAuth } from "../context/UserAuthContext";
import "./Register.css";
import video from "../LoginAssets/video.mp4";
import { showAlert, getSwal } from "../utils/showAlert";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { signUp } = useUserAuth();
  let navigate = useNavigate();

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
    setSuccess("");

    // Validation
    if (!email || !password || !confirmPassword) {
      return showAlert({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอกข้อมูลให้ครบถ้วน",
        confirmButtonColor: "#27BAF9",
      });
    }

    if (password !== confirmPassword) {
      return showAlert({
        icon: "error",
        title: "รหัสผ่านไม่ตรงกัน",
        text: "กรุณาตรวจสอบรหัสผ่านอีกครั้ง",
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
      title: "กำลังลงทะเบียน...",
      text: "กรุณารอสักครู่",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      await signUp(email, password);

      Swal.close(); // Close the loading alert
      showAlert({
        icon: "success",
        title: "สมัครสมาชิกสำเร็จ!",
        html: `
          <p>กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี</p>
          <p class="text-muted" style="font-size: 0.9em; margin-top: 10px;">
            หากไม่พบกล่องจดหมายเข้า โปรดตรวจสอบในกล่องจดหมายขยะ (Spam) <br />
            จะนำคุณไปหน้าเข้าสู่ระบบใน 3 วินาที...
          </p>
        `,
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        confirmButtonColor: "#27BAF9",
      }).then(() => {
        navigate("/login");
      });

    } catch (err) {
      setIsLoading(false);
      Swal.close(); // Close the loading alert
      console.log(err);

      let message = "เกิดข้อผิดพลาดในการสมัครสมาชิก";

      switch (err.code) {
        case "auth/email-already-in-use":
          message = "อีเมลนี้ถูกใช้แล้ว กรุณาใช้อีเมลอื่นหรือเข้าสู่ระบบ";
          break;
        case "auth/invalid-email":
          message = "รูปแบบอีเมลไม่ถูกต้อง";
          break;
        case "auth/weak-password":
          message = "รหัสผ่านไม่แข็งแกร่งพอ กรุณาใช้รหัสผ่านที่ซับซ้อนกว่านี้";
          break;
        case "auth/operation-not-allowed":
          message = "การสมัครสมาชิกถูกปิดใช้งานชั่วคราว";
          break;
        default:
          message = err.message;
      }

      Swal.fire({
        icon: "error",
        title: "สมัครสมาชิกล้มเหลว",
        text: message,
        confirmButtonColor: "#27BAF9",
      });
    }
  };

  return (
    <div className="register-container">
      <div className="floating-elements">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
        <div className="floating-circle circle-3"></div>
      </div>

      <div className="register-box">
        <div className="video-section">
          {/* <video src={video} autoPlay muted loop></video> */}
          <div className="video-overlay">
            <div className="brand-section">
              <SparklesIcon className="brand-icon" />
              <h1 className="brand-title">HealthCare</h1>
              <p className="brand-subtitle">Your Health Journey Starts Here</p>
            </div>
            <div className="welcome-text">
              <h2>ทุกที่ที่คุณอยู่ สุขภาพคือที่หนึ่ง</h2>
              <p>ไม่มีทางลัดในการมีสุขภาพที่ดี</p>
            </div>
            <div className="footer-section">
              <span className="footer-text">มีบัญชีอยู่แล้ว?</span>
              <Link to="/login" className="footer-link">
                <LoginIcon className="me-2" /> เข้าสู่ระบบที่นี่
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </div>

        <div className="form-section">
          {/* Mobile Back Button */}
          <Link to="/login" className="mobile-back-link">
            <LoginIcon className="back-icon" />
            กลับไปหน้าเข้าสู่ระบบ
          </Link>

          <div className="form-header">
            <h2 className="form-title">สร้างบัญชีใหม่</h2>
            <p className="form-subtitle">เริ่มต้นการดูแลสุขภาพของคุณวันนี้</p>
          </div>

          {error && <Alert variant="danger" className="custom-alert">{error}</Alert>}
          {success && <Alert variant="success" className="custom-alert">{success}</Alert>}

          <Form onSubmit={handleSubmit} className="register-form">
            <Form.Group className="form-group">
              <div className="input-wrapper">
                <EmailIcon className="input-icon" />
                <Form.Control
                  type="email"
                  placeholder="อีเมล"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="custom-input"
                  disabled={isLoading}
                />
              </div>
            </Form.Group>

            <Form.Group className="form-group">
              <div className="input-wrapper">
                <LockIcon className="input-icon" />
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder="รหัสผ่าน"
                  value={password}
                  onChange={handlePasswordChange}
                  className="custom-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                </button>
              </div>
              {password && (
                <div className="password-strength-meter">
                  <div className="strength-bars-container">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`strength-bar ${i < passwordStrength ? "active" : ""}`}
                        style={{
                          backgroundColor: i < passwordStrength ? getPasswordStrengthColor(passwordStrength) : undefined
                        }}
                      ></div>
                    ))}
                  </div>
                  <span
                    className="strength-text"
                    style={{ color: getPasswordStrengthColor(passwordStrength) }}
                  >
                    <CheckIcon className="me-1" size={14} /> {getPasswordStrengthText(passwordStrength)}
                  </span>
                </div>
              )}
            </Form.Group>

            <Form.Group className="form-group">
              <div className="input-wrapper">
                <LockIcon className="input-icon" />
                <Form.Control
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="ยืนยันรหัสผ่าน"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`custom-input ${confirmPassword && password === confirmPassword ? 'valid' :
                    confirmPassword && password !== confirmPassword ? 'invalid' : ''
                    }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                </button>
                {confirmPassword && password === confirmPassword && (
                  <CheckIcon className="validation-icon success" />
                )}
              </div>
              {confirmPassword && password !== confirmPassword && (
                <div className="validation-message error">
                  รหัสผ่านไม่ตรงกัน
                </div>
              )}
              {confirmPassword && password === confirmPassword && (
                <div className="validation-message success">
                  รหัสผ่านตรงกัน
                </div>
              )}
            </Form.Group>

            <div className="terms-section">
              <p className="terms-text">
                การสมัครสมาชิกแสดงว่าคุณยอมรับ{" "}
                <Link to="/terms" className="terms-link">
                  เงื่อนไขการใช้งาน
                </Link>{" "}
                และ{" "}
                <Link to="/privacy" className="terms-link">
                  นโยบายความเป็นส่วนตัว
                </Link>
              </p>
            </div>

            <div className="button-group">
              <Button
                variant="primary"
                type="submit"
                className="primary-button"
                disabled={isLoading}
              >
                <PersonAddIcon className="button-icon" />
                {isLoading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
              </Button>

              <div className="login-redirect mobile-hide-desktop-show">
                <span>มีบัญชีอยู่แล้ว?</span>
                <Link to="/login" className="login-link">
                  เข้าสู่ระบบ
                </Link>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default Register;