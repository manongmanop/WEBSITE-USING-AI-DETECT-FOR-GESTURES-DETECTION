import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Alert, Button } from "react-bootstrap";
import { useUserAuth } from "../context/UserAuthContext";
// import { sendEmailVerification } from "firebase/auth";
// import { auth, db } from "../../firebase";
// import { doc, getDoc } from "firebase/firestore";
import "./login.css";
import "./style/global.css";
import {
  EmailIcon,
  LockIcon,
  VisibilityIcon,
  VisibilityOffIcon,
  LoginIcon,
  PersonAddIcon,
  GoogleIcon,
  SparklesIcon
} from "./Common/Icons";
import { showAlert, getSwal } from "../utils/showAlert";
// import { signOut } from "firebase/auth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { logIn, googleSignIn, user, auth, db } = useUserAuth();
  let navigate = useNavigate();

  // ฟังก์ชันตรวจสอบสถานะผู้ใช้และนำทางไปยังหน้าที่เหมาะสม (รวม admin)
  const checkUserStatusAndNavigate = async (user) => {
    try {
      setIsLoading(true);
      const Swal = await getSwal();
      showAlert({
        title: "กำลังเข้าสู่ระบบ...",
        text: "กรุณารอสักครู่",
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });
      const { signOut } = await import("firebase/auth");
      const { doc, getDoc } = await import("firebase/firestore");

      const adminDocRef = doc(db, "admin", user.uid);
      const adminSnap = await getDoc(adminDocRef);

      if (adminSnap.exists()) {
        // ✅ reload เพื่อดึงสถานะล่าสุดจาก Firebase
        await user.reload();
        const refreshedUser = auth.currentUser;

        if (!refreshedUser.emailVerified) {
          await signOut(auth);
          showAlert({
            icon: "error",
            title: "อีเมลยังไม่ยืนยัน",
            text: "กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบในฐานะ Admin",
            confirmButtonColor: "#27BAF9",
          });
          setIsLoading(false);
          return;
        }

        (await getSwal()).close();
        setIsLoading(false);
        return navigate("/admin/dashboard");
      }

      // user ปกติ — ไม่เช็ค emailVerified
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      Swal.close();

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        userData.userstatus === "pass" ? navigate("/home") : navigate("/addinfo");
      } else {
        navigate("/addinfo");
      }
    } catch (err) {
      console.error("Error checking user status:", err);
      Swal.close();
      navigate("/addinfo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      return showAlert({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอกอีเมล",
        confirmButtonColor: "#27BAF9",
      });
    }

    if (!password) {
      return showAlert({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอกรหัสผ่าน",
        confirmButtonColor: "#27BAF9",
      });
    }

    setIsLoading(true);

    try {
      const userCredential = await logIn(email, password);

      await checkUserStatusAndNavigate(userCredential.user);
    } catch (err) {
      setIsLoading(false);
      let message = "เกิดข้อผิดพลาด";
      switch (err.code) {
        case "auth/missing-password":
          message = "กรุณากรอกรหัสผ่าน";
          break;
        case "auth/invalid-email":
          message = "รูปแบบอีเมลไม่ถูกต้อง";
          break;
        case "auth/user-not-found":
          message = "ไม่พบบัญชีผู้ใช้นี้";
          break;
        case "auth/wrong-password":
          message = "รหัสผ่านไม่ถูกต้อง";
          break;
        case "auth/invalid-credential":
          message = "ตรวจสอบอีเมลและรหัสผ่านอีกครั้ง";
          break;
        default:
          message = err.message;
      }

      Swal.fire({
        icon: "error",
        title: "เข้าสู่ระบบล้มเหลว",
        text: message,
        confirmButtonColor: "#27BAF9",
      });
    }
  }, [email, password]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const result = await googleSignIn();
      await checkUserStatusAndNavigate(result.user);
    } catch (err) {
      setIsLoading(false);
      setError(err.message);
    }
  };
  return (
    <div className="login-container">
      <div className="floating-elements">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
        <div className="floating-circle circle-3"></div>
      </div>

      <div className="login-box">
        <div className="video-section">
          {/* <video src={video} autoPlay muted loop></video> */}
          <div className="video-overlay">
            <div className="brand-section">
              <SparklesIcon className="brand-icon" />
              <h1 className="brand-title">HealthCare</h1>
              <p className="brand-subtitle">Your Health, Our Priority</p>
            </div>
            <div className="welcome-text">
              <h2>ทุกที่ที่คุณอยู่ สุขภาพคือที่หนึ่ง</h2>
              <p>ไม่มีทางลัดในการมีสุขภาพที่ดี</p>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-header">
            <h2 className="form-title">ยินดีต้อนรับ!</h2>
            <p className="form-subtitle">เข้าสู่ระบบเพื่อดูแลสุขภาพของคุณ</p>
          </div>

          {error && <Alert variant="danger" className="custom-alert">{error}</Alert>}
          {message && <Alert variant="success" className="custom-alert">{message}</Alert>}

          <Form onSubmit={handleSubmit} className="login-form">
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
                  onChange={(e) => setPassword(e.target.value)}
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
              <div className="forgot-password">
                <Link to="/forgot-password" className="forgot-link">
                  ลืมรหัสผ่าน?
                </Link>
              </div>
            </Form.Group>

            <div className="button-group">
              <Button
                variant="primary"
                type="submit"
                className="primary-button"
                disabled={isLoading}
              >
                <LoginIcon className="button-icon" />
                {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>

              <Button
                variant="outline-primary"
                className="secondary-button"
                onClick={() => navigate("/register")}
                disabled={isLoading}
              >
                <PersonAddIcon className="button-icon" />
                สมัครสมาชิก
              </Button>
            </div>

            <div className="divider">
              <span>หรือเข้าสู่ระบบด้วย</span>
            </div>

            <div className="google-button-wrapper">
              <Button
                onClick={handleGoogleSignIn}
                variant="outline-dark"
                className="google-button"
                disabled={isLoading}
              >
                <GoogleIcon className="google-icon" />
                <span>Google</span>
              </Button>
            </div>

            {/* Admin Register Link */}
            <div className="admin-link-wrapper" style={{ marginTop: '1rem', textAlign: 'center' }}>
              <span className="text" style={{ fontSize: '0.9rem', color: '#666' }}>
                {" "}
              </span>
              <Link to="/AdminRegister" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                เข้าสู่ระบบในฐานะผู้ดูแลระบบ
              </Link>
            </div>
          </Form>

        </div>
      </div>
    </div>
  );
}

export default Login;