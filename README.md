# 🏋️‍♂️ AI Workout Coach with Pose Detection & Adaptive Training

**ระบบโค้ชออกกำลังกายอัจฉริยะด้วย AI ตรวจจับท่าทาง (Pose Detection) และจัดโปรแกรมการฝึกแบบไดนามิก**

แอปพลิเคชันเว็บแบบ Full-Stack ที่ขับเคลื่อนด้วย AI สำหรับวิเคราะห์และตรวจจับท่าทางการออกกำลังกายแบบเรียลไทม์ผ่านกล้องเว็บแคม (Webcam) โดยใช้เฟรมเวิร์ก **MediaPipe Pose** พร้อมระบบวางแผนการฝึกส่วนบุคคลที่สามารถปรับเปลี่ยนความยาก-ง่ายของโปรแกรมการฝึกโดยอัตโนมัติตามความก้าวหน้าและการตอบสนองของผู้ใช้งาน

---

## 🌟 ฟีเจอร์เด่น (Key Features)

### 🤖 1. Real-time AI Pose Detection & Form Analysis
*   **ตรวจจับข้อต่อร่างกาย 33 จุด**: ใช้โมเดลการคำนวณเชิงลึกจาก MediaPipe Pose เพื่อสร้างจุดเชื่อมต่อโครงร่าง (Skeleton Keypoints)
*   **นับจำนวนครั้งอัตโนมัติ (Automatic Reps Counter)**: วิเคราะห์มุมข้อต่อและความเคลื่อนไหวเพื่อเพิ่มจำนวนครั้งในการออกกำลังกายแต่ละท่าโดยอัตโนมัติ
*   **ประเมินความถูกต้องและเสถียรภาพ (Form & Stability Score)**: ให้คะแนนคุณภาพของท่าทาง (0.0 - 1.0) เพื่อแนะนำความถูกต้องในการทำท่าทาง
*   **ท่าออกกำลังกายที่รองรับ**:
    *   **Squat (สควอท)**: วัดมุมเข่าและสะโพกเพื่อเช็กระดับความลึก
    *   **Push-ups (วิดพื้น)**: วัดมุมศอกและการทำแนวระนาบของลำตัว
    *   **Plank (แพลงก์)**: เช็กความขนานของหลังและสะโพกเพื่อความปลอดภัย
    *   **Dumbbell Curl (ดัมเบลเคิร์ล)**: วัดช่วงการเคลื่อนไหวของข้อศอกและแขนท่อนล่าง
    *   **Leg Raises (เลกเรส)**: ตรวจจับมุมขาและสะโพกสำหรับการบริหารหน้าท้องส่วนล่าง
    *   **Hip Raises / Glute Bridge (ฮิปเรส)**: ตรวจสอบการยกสะโพกขึ้นสุดเพื่อบริหารสะโพกและหลังส่วนล่าง

### 🧠 2. AI Adaptive Workout Plan Engine (ระบบปรับแผนตามความสามารถ)
*   **Personalized Onboarding**: ประเมินระดับความฟิตเบื้องต้น (Beginner, Intermediate, Advanced) เป้าหมายหลัก และวันที่สะดวกในการออกกำลังกาย
*   **Dynamic Upgrades & Downgrades**: ปรับโปรแกรมการฝึกอัตโนมัติหลังทำเสร็จ (Finished Workout)
    *   หากส่งคำตอบป้อนกลับว่า **"ง่ายเกินไป"** (Easy) บ่อยครั้ง หรือคะแนน Form Score สูง ระบบจะเพิ่มจำนวนครั้ง/เวลาขึ้น 10% หรือขยับขึ้นเป็นท่าระดับที่ยากขึ้น (เช่น จากท่าพื้นฐานไปสู่ท่า Intermediate/Advanced)
    *   หากผู้ใช้งานระบุว่า **"ยากเกินไป"** (Hard) บ่อยครั้ง หรือคะแนน Form Score ต่ำเกินไป ระบบจะปรับลดจำนวนครั้ง/เวลาลง 10% หรือแนะนำท่าทางระดับที่ง่ายขึ้นเพื่อป้องกันอาการบาดเจ็บ

### 📊 3. Interactive Progress Tracking & Analytics Dashboard
*   **Body Metrics Tracker**: บันทึกน้ำหนัก ส่วนสูง เปอร์เซ็นต์ไขมัน มวลกล้ามเนื้อ และคำนวณค่าดัชนีมวลกาย (BMI) ในแต่ละวัน
*   **Data Visualization**: แสดงกราฟแนวโน้มความเปลี่ยนแปลงของมวลร่างกาย อัตราการเผาผลาญแคลอรี และความสม่ำเสมอในการออกกำลังกายโดยใช้ **Recharts** และ **Chart.js**
*   **Workout History**: จัดเก็บข้อมูลบันทึกประวัติการเล่นอย่างละเอียด (Reps, Duration, Calories, Stability Score) ในแบบจำลอง MongoDB

### 🛡️ 4. Secure Authentication & User Access
*   **Firebase Authentication**: รองรับการลงทะเบียนและเข้าสู่ระบบผ่าน Email/Password พร้อมระบบยืนยันตัวตนผ่านอีเมล (Email Verification) และระบบกู้คืนรหัสผ่าน (Forgot Password)
*   **Role-Based Access Control (RBAC)**: แบ่งแยกสิทธิ์ระหว่าง **User (ผู้ใช้งานทั่วไป)** และ **Admin (ผู้ดูแลระบบ)** อย่างชัดเจน

### ⚙️ 5. Full-featured Admin Console
*   **Admin Dashboard**: แผงสรุปจำนวนผู้ใช้ในระบบ อัตราการใช้งาน และประวัติภาพรวม
*   **User Management**: ค้นหา ตรวจสอบรายชื่อ และดูความก้าวหน้าและประวัติการออกกำลังกายย้อนหลังของสมาชิกแต่ละคน
*   **Exercise & Program Database CRUD**: แอดมินสามารถเพิ่ม แก้ไข หรือลบท่าออกกำลังกาย และจัดการสร้างโปรแกรมการฝึกต่าง ๆ ผ่าน UI ได้โดยตรง

---

## 🛠️ เทคโนโลยีที่เลือกใช้ (Tech Stack)

### Frontend (หน้าบ้าน)
*   **Core**: React.js (Vite)
*   **Routing**: React Router DOM (v6)
*   **Styling**: Bootstrap 5, React Bootstrap, SCSS / Sass
*   **AI & Camera**: MediaPipe Pose, React Webcam
*   **Charts**: Recharts, Chart.js, React-Chartjs-2
*   **Components**: SweetAlert2 (กล่องข้อความโต้ตอบ), Lucide React, FontAwesome

### Backend (หลังบ้าน)
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: MongoDB & Mongoose (Object Data Modeling)
*   **File Handling**: Multer (จัดเก็บรูปภาพและสื่อที่อัปโหลด)
*   **Environment**: Dotenv, Cors

### Authentication
*   **Provider**: Firebase Auth (Client-side)

---

## 📁 โครงสร้างโฟลเดอร์ของโปรเจกต์ (Project Structure)

```text
backend-repo/
├── api/                   # Serverless function entrypoint สำหรับ Vercel
│   └── index.js
├── routes/                # Express API Routes
│   ├── analytics.js       # เส้นทาง API สำหรับวิเคราะห์และประเมินสรุปประวัติ
│   └── workoutSessions.js # เส้นทาง API ควบคุมเซสชันการออกกำลังกายและการสร้างล็อก
├── models/                # Mongoose Database Schemas
│   ├── Exercise.js        # เก็บรายละเอียดของแต่ละท่าออกกำลังกาย
│   ├── ExerciseLog.js     # บันทึกประวัติการออกกำลังกายทีละท่า
│   ├── WorkoutProgram.js  # แผนการฝึกหลัก (รวมท่าต่าง ๆ)
│   └── WorkoutSession.js  # เซสชันการออกกำลังกายในแต่ละครั้งของผู้ใช้
├── src/                   # โค้ดของ React Application (Frontend)
│   ├── auth/              # ส่วนจัดการสิทธิ์การเข้าถึง (ProtectedRoute, AdminRoute)
│   ├── components/        # ส่วนประกอบ UI ทั้งหมด
│   │   ├── Admin/         # แผงควบคุมระบบ (Dashboard, User & Exercise CRUD)
│   │   ├── Website/       # หน้าหลักและแบบฟอร์มบันทึกร่างกาย (Main, AddInfo)
│   │   ├── WorkoutPlay/   # ระบบเล่นออกกำลังกาย (WorkoutPlayer, Summary, History)
│   │   ├── LandingPage/   # หน้าต้อนรับ (Landing Page)
│   │   └── Onboarding/    # แบบสอบถามแรกเข้าของผู้ใช้งานใหม่
│   ├── context/           # React Context สำหรับเก็บสถานะ Login (UserAuthContext.jsx)
│   ├── PoseDetector.jsx   # ไฟล์วิเคราะห์ท่าทางกลางร่วมกับ MediaPipe
│   ├── main.jsx           # จุดเริ่มต้นหลักของหน้า React พร้อมตั้งค่า Router
│   └── App.css            # ไฟล์สไตล์หลักของตัวแอป
├── utils/                 # ฟังก์ชันเสริมหลังบ้าน เช่น การคำนวณแคลอรี (calculateCalories.cjs)
├── seed.cjs               # สคริปต์จำลองข้อมูลเริ่มต้นเข้า MongoDB (Database Seeder)
├── server.cjs             # เซิร์ฟเวอร์ Express.js หลักที่เปิด API Endpoints
├── vite.config.js         # ตั้งค่า Vite และระบบ HTTPS Local Proxy
├── vercel.json            # ไฟล์ตั้งค่าสำหรับ Deployment บน Vercel
└── package.json           # รายชื่อปลั๊กอินและ Dependencies ที่ใช้ในโครงการ
```

---

## 🚀 การติดตั้งและตั้งค่าเริ่มต้น (Installation & Setup)

### 📋 สิ่งที่ต้องเตรียม (Prerequisites)
1.  **Node.js** (แนะนำเวอร์ชัน 16.x ขึ้นไป)
2.  **MongoDB** (ติดตั้งแบบ Local Community Server หรือใช้บริการ MongoDB Atlas บน Cloud)
3.  **Firebase Account** (สำหรับสร้างโปรเจกต์ Auth & Firestore)
4.  **mkcert** (ไม่บังคับ - ใช้สำหรับการติดตั้ง HTTPS ในวง LAN เพื่อทดสอบกับโทรศัพท์มือถือ)

### 📥 1. โคลนและติดตั้งโมดูล
เปิด Terminal แล้วรันคำสั่งดังนี้ในโฟลเดอร์ของโปรเจกต์:

```bash
# ติดตั้ง dependencies ทั้งหมด
npm install
```

### ⚙️ 2. การกำหนดค่าตัวแปรสภาพแวดล้อม (Environment Variables)
สร้างไฟล์ชื่อ `.env` ไว้ที่ Root Directory ของโครงการ และกำหนดค่าต่าง ๆ ดังนี้:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/fitness_app
```

> [!NOTE]
> หากต้องการเชื่อมต่อ MongoDB บนระบบ Cloud (MongoDB Atlas) ให้เปลี่ยนค่า `MONGODB_URI` ให้เป็น URI Connection String ของเซิร์ฟเวอร์ Atlas ของคุณ

สำหรับฝั่ง Frontend ให้ระบุการตั้งค่า Firebase ในไฟล์ [firebase.js](file:///d:/Workk/%E0%B8%AA%E0%B8%A1%E0%B8%9A%E0%B8%B9%E0%B8%A3%E0%B8%A3/Summer/backend-repo/firebase.js) โดยตรง หรือย้ายไปควบคุมผ่านตัวแปรสภาพแวดล้อม:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

### 🗄️ 3. การเตรียมข้อมูลเบื้องต้นสำหรับฐานข้อมูล (Database Seeding)
รันสคริปต์นี้เพื่อลบข้อมูลเดิมและเติมข้อมูลท่าออกกำลังกายพื้นฐาน (Push-ups, Plank, Squats ฯลฯ) เข้าไปยังฐานข้อมูล MongoDB ของคุณ:

```bash
node seed.cjs
```

---

## 💻 วิธีการรันโครงการ (Running the Application)

โครงการนี้ใช้สคริปต์แบบแยกส่วนใน [package.json](file:///d:/Workk/%E0%B8%AA%E0%B8%A1%E0%B8%9A%E0%B8%B9%E0%B8%A3%E0%B8%A3/Summer/backend-repo/package.json) โดยรันฝั่งหลังบ้านและหน้าบ้านพร้อมกัน:

### 🟢 1. รันเซิร์ฟเวอร์ backend (Express)
```bash
npm start
```
*   ระบบจะรัน Backend API อยู่ที่ `http://localhost:5000` (หรือ URL ที่ตั้งใน `.env`)

### 🔵 2. รันหน้าบ้าน frontend (Vite React)
```bash
npm run dev
```
*   ระบบจะรันหน้าบ้านอยู่ที่ `https://localhost:5173` (เป็น HTTPS เนื่องจากมีความจำเป็นต้องเรียกใช้งานบราวเซอร์มีเดียในลักษณะปลอดภัยเพื่ออนุญาตให้เข้าใช้งานเว็บแคม)

---

## 🔒 ข้อมูลความปลอดภัยและการเชื่อมต่อกล้อง (HTTPS & Camera Setup)

> [!IMPORTANT]
> บราวเซอร์ยุคปัจจุบันจะไม่อนุญาตให้หน้าเว็บเข้าถึงกล้องถ่ายภาพ (`navigator.mediaDevices.getUserMedia`) บนอุปกรณ์ภายนอกหรือ IP อื่น เว้นแต่จะเข้าใช้งานผ่านโปรโตคอล **HTTPS** หรือเข้าใช้บนเครื่องเซิร์ฟเวอร์โดยตรง (`localhost`) เท่านั้น

### วิธีเข้าทดสอบบนโทรศัพท์มือถือผ่านเครือข่ายเดียวกัน (Local LAN)
1.  ตรวจสอบว่าคอมพิวเตอร์และโทรศัพท์มือถือต่อ Wi-Fi วงเดียวกัน
2.  หา IP ภายในวง LAN ของคอมพิวเตอร์ของคุณ (ตัวอย่าง: `10.198.200.52`)
3.  แก้ไขไฟล์ [vite.config.js](file:///d:/Workk/%E0%B8%AA%E0%B8%A1%E0%B8%9A%E0%B8%B9%E0%B8%A3%E0%B8%A3/Summer/backend-repo/vite.config.js) โดยนำ IP ของคุณไปกรอกที่ตัวแปร `BACKEND`:
    ```javascript
    const BACKEND = 'http://10.198.200.52:5000'
    ```
4.  โปรเจกต์นี้เปิดใช้ปลั๊กอิน `vite-plugin-mkcert` ไว้แล้ว ซึ่งจะสร้างใบรับรอง SSL/TLS ท้องถิ่นโดยอัตโนมัติ
5.  เปิดบราวเซอร์บนโทรศัพท์มือถือแล้วเข้าลิงก์: `https://[IP_เครื่องคอมพิวเตอร์]:5173` (เช่น `https://10.198.200.52:5173`)
6.  กดข้ามคำเตือนความปลอดภัย (Proceed to unsafe) บราวเซอร์จะสามารถเปิดกล้องและตรวจจับท่าทางได้ทันที!

---

## 🛠️ รายละเอียดการทำงานของโมเดลตรวจจับท่าทาง (Pose Estimation Mechanics)

ในการตรวจสอบความถูกต้องและนับรอบการออกกำลังกาย แต่ละท่าจะคำนวณผ่านมุมเชื่อมต่อที่อิงตามข้อต่อในพิกัด 3 มิติ (X, Y, Z, Visibility) ตัวอย่างหลักการคำนวณ:
*   **Squat**: วัดพิกัดของ Hip (สะโพก) - Knee (เข่า) - Ankle (ข้อเท้า)
    *   *สถานะลง (Down)*: มุมเข่าน้อยกว่าหรือเท่ากับ 100°
    *   *สถานะขึ้น (Up)*: มุมเข่ามากกว่า 160° หลังจากลงไปแล้ว จะนับเป็น 1 ครั้ง
*   **Push-up**: วัดพิกัดของ Shoulder (ไหล่) - Elbow (ข้อศอก) - Wrist (ข้อมือ)
    *   *สถานะลง (Down)*: มุมข้อศอกน้อยกว่าหรือเท่ากับ 90°
    *   *สถานะขึ้น (Up)*: มุมข้อศอกเหยียดตรงมากกว่า 160°
*   **Plank**: ตรวจสอบมุมสะโพก (Shoulder - Hip - Knee) ให้อยู่ในช่วง 165° - 180° (ลำตัวเหยียดตรง) หากอยู่นอกช่วงนี้ ระบบจะแจ้งเตือนว่ายกก้นสูงหรือหย่อนสะโพกเกินไป และจะเริ่มจับเวลาก็ต่อเมื่อทำท่าทางได้มั่นคงและผ่านเกณฑ์เท่านั้น

---

## 📄 ใบอนุญาตการใช้งาน (License)

โครงการนี้อยู่ภายใต้ใบอนุญาต **MIT License** - สามารถนำไปศึกษา พัฒนาต่อ หรือใช้งานในเชิงวิชาการ/พาณิชย์ได้โดยเสรี

---

*พัฒนาและดูแลระบบโดยทีมงานเพื่อส่งเสริมการออกกำลังกายที่บ้านอย่างมีประสิทธิภาพและปลอดภัยด้วยนวัตกรรม AI*
