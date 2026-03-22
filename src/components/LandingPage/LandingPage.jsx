import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";
import "../../global.css";
// Removed asset imports, relying on public folder

function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="minimal-landing">
      {/* MINIMAL HERO SECTION */}
      <section className="minimal-hero">
        <div className="hero-wrapper">
          {/* Header Navigation */}
          <nav className="minimal-nav">
            <div className="nav-brand">
              <span className="brand-text">FitPose</span>
            </div>
            <div className="nav-links">
              <a href="#features" className="nav-link">ฟีเจอร์</a>
              <a href="#about" className="nav-link">เกี่ยวกับเรา</a>
              <a href="/login" className="cta-link">เข้าสู่ระบบ</a>
            </div>
          </nav>

          {/* Main Hero Content */}
          <div className="hero-main">
            <div className="hero-left">
              <div className="headline-wrapper">
                <h1 className="hero-headline">
                  ออกกำลังกาย<br />
                  <span className="highlight">อย่างถูกวิธี</span>
                </h1>
              </div>

              <p className="hero-description">
                ระบบ AI ที่ช่วยให้คุณออกกำลังกายได้อย่างมีประสิทธิภาพ
                ด้วยการตรวจจับท่าทางแบบเรียลไทม์
              </p>

              <div className="hero-cta">
                <button className="btn-primary-minimal" onClick={() => navigate('/login')}>เริ่มต้นใช้งาน</button>
              </div>

              <div className="hero-stats">
                <div className="stat">
                  <span className="stat-number">+45%</span>
                  <span className="stat-label">ความแข็งแรง</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat">
                  <span className="stat-number">-30%</span>
                  <span className="stat-label">บาดเจ็บ</span>
                </div>
              </div>
            </div>

            <div className="hero-right">
              <div className="device-showcase">
                <div className="phone-frame">
                  <div className="phone-notch"></div>
                  <div className="phone-screen">
                    <img
                      src="/images/mockup.webp"
                      alt="Mockup"
                      className="mockup-image"
                      width="350"
                      height="622"
                      loading="eager"
                      fetchpriority="high"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="minimal-features" id="features">
        <div className="section-wrapper">
          <h2 className="section-title">สิ่งที่คุณจะได้</h2>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-number">01</div>
              <h3 className="feature-name">ตรวจจับท่า</h3>
              <p className="feature-desc">AI ตรวจจับท่าทางของคุณแบบเรียลไทม์</p>
            </div>
            <div className="feature-item">
              <div className="feature-number">02</div>
              <h3 className="feature-name">แนะนำทันที</h3>
              <p className="feature-desc">รับคำแนะนำในการปรับปรุงท่าของคุณ</p>
            </div>
            <div className="feature-item">
              <div className="feature-number">03</div>
              <h3 className="feature-name">ติดตามผล</h3>
              <p className="feature-desc">วิเคราะห์ความก้าวหน้าของคุณ</p>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ UPDATED: EXTENDED ABOUT SECTION */}
      <section className="minimal-about" id="about">
        <div className="section-wrapper">

          {/* Header */}
          <div className="about-header-center">
            <h2 className="section-title">เกี่ยวกับ Pose Detect AI</h2>
            <p className="section-subtitle">
              เราผสมผสานวิทยาศาสตร์การกีฬาเข้ากับปัญญาประดิษฐ์ เพื่อสร้างระบบตรวจจับท่าทางที่แม่นยำที่สุด
            </p>
          </div>

          {/* Row 1: The Problem & Solution */}
          <div className="about-row">
            <div className="about-image-container bg-soft-blue">
              {/* Placeholder for AI Skeleton Image */}
              <div className="visual-placeholder">
                <span style={{ fontSize: "3rem" }}>🤖</span>
                <div className="skeleton-overlay"></div>
              </div>
            </div>
            <div className="about-text-content">
              <h3 className="about-topic">AI Skeleton Tracking คืออะไร?</h3>
              <p className="about-desc">
                ระบบของเราใช้ Computer Vision ขั้นสูงในการสร้างจุดข้อต่อ (Keypoints) บนร่างกายของคุณแบบเรียลไทม์
                โดยไม่ต้องใช้อุปกรณ์สวมใส่ (Wearables) ใดๆ เพียงแค่เปิดกล้อง ระบบจะวิเคราะห์องศาของแขน ขา และหลัง
                เพื่อตรวจสอบว่าคุณทำท่าถูกต้องหรือไม่
              </p>
              <ul className="about-list">
                <li>✅ ตรวจจับ 33 จุดข้อต่อทั่วร่างกาย</li>
                <li>✅ แจ้งเตือนทันทีเมื่อหลังงอ หรือเข่าเลยปลายเท้า</li>
              </ul>
            </div>
          </div>

          {/* Row 2: Internal Content Preview (Exercise Library) */}
          <div className="about-row reverse">
            <div className="about-image-container bg-soft-purple">
              {/* Mockup of Exercise Library */}
              <div className="library-grid-mockup">
                <div className="lib-card">
                  <img src="images/squat2.jpg" alt="Squat" className="lib-card-img" width="400" height="300" loading="lazy" />
                  <span className="lib-card-title">Squat</span>
                </div>
                <div className="lib-card">
                  <img src="images/PushUp.jpg" alt="Push Up" className="lib-card-img" width="400" height="300" loading="lazy" />
                  <span className="lib-card-title">Push Up</span>
                </div>
                <div className="lib-card">
                  <img src="images/plank.jpg" alt="Plank" className="lib-card-img" width="400" height="300" loading="lazy" />
                  <span className="lib-card-title">Plank</span>
                </div>
                <div className="lib-card">
                  <img src="images/legraises.jpg" alt="Legs Raises" className="lib-card-img" width="400" height="300" loading="lazy" />
                  <span className="lib-card-title">Legs Raises</span>
                </div>
              </div>
            </div>
            <div className="about-text-content">
              <h3 className="about-topic">คลังท่าออกกำลังกายครบครัน</h3>
              <p className="about-desc">
                ไม่ว่าเป้าหมายของคุณคือการลดน้ำหนัก, สร้างกล้ามเนื้อ, หรือยืดเหยียด
                เรามีโปรแกรมที่ออกแบบมาเพื่อคุณ เข้าถึงเนื้อหาภายในได้ทันที
              </p>
              <div className="tag-container">
                <span className="feature-tag">Strength</span>
                <span className="feature-tag">Cardio</span>
                <span className="feature-tag">Yoga</span>
                <span className="feature-tag">HIIT</span>
              </div>
              <p className="about-desc-small">
                พร้อมระบบนับจำนวนครั้งอัตโนมัติ (Smart Counter) ให้คุณโฟกัสที่การออกแรง ไม่ต้องพะวงกับการนับ
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* CTA SECTION */}
      <section className="minimal-cta">
        <div className="cta-wrapper">
          <h2>พร้อมเริ่มต้นหรือยัง?</h2>
          <button className="btn-primary-minimal btn-large" onClick={() => navigate('/register')}>สมัครสมาชิกฟรี</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="minimal-footer">
        <p>&copy; 2025 FitPose AI. สงวนลิขสิทธิ์ทุกประการ</p>
      </footer>
    </div>
  );
}

export default LandingPage;