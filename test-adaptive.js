const axios = require('axios');

/**
 * 🛠️ สคริปต์สำหรับทดสอบระบบ Adaptive Daily Plan (Demo for Professor)
 * วิธีใช้งาน:
 * 1. ตรวจสอบให้แน่ใจว่ารัน Server อยู่ (npm run start หรือ node server.cjs)
 * 2. แก้ไขค่า UID ด้านล่างให้ตรงกับบัญชีที่ใช้งานอยู่
 * 3. เปิดหน้าเว็บไซต์ทิ้งไว้ที่หน้าแรก (Home)
 * 4. รันคำสั่ง: node test-adaptive.js
 */

const UID = "t8Enu17J6PSZUG5BC2M21UtinH52"; // ✅ ผมใส่ UID เบื้องต้นจากฐานข้อมูลให้แล้วครับ
const API_URL = "http://localhost:5000";

async function simulateFeedback(type, count) {
    console.log(`\n--- 🤖 กำลังจำลองการส่ง Feedback: [${type.toUpperCase()}] จำนวน ${count} ครั้ง ---`);
    for (let i = 1; i <= count; i++) {
        try {
            const res = await axios.post(`${API_URL}/api/workout_sessions/finish_debug`, {
                uid: UID,
                feedback: type,
                programId: "dailyplan",
                duration: 600 // จำลองว่าออกกำลังกาย 10 นาที
            });
            console.log(`✅ ครั้งที่ ${i}: ส่งสำเร็จ (Status: ${res.status})`);
        } catch (err) {
            console.error(`❌ ครั้งที่ ${i}: เกิดข้อผิดพลาด - ${err.response?.data?.error || err.message}`);
        }
    }
}

async function runDemo() {
    console.log("🚀 เริ่มต้นการทดสอบ Adaptive Logic...");

    // ---------------------------------------------------------
    // 💡 ฉากที่ 1: การอัปเกรดระดับ (Upgrade)
    // เงื่อนไข: ส่ง "Easy" ติดกัน 3 ครั้งล่าสุด
    // ---------------------------------------------------------
    await simulateFeedback('easy', 3);
    console.log("\n✨ ผลลัพธ์: ระดับ Fitness Level ของคุณควรจะเพิ่มขึ้น 1 ระดับ");
    console.log("👉 กรุณารีเฟรชหน้าเว็บ หรือตรวจสอบว่า Daily Plan เปลี่ยนเป็นท่าที่ยากขึ้นหรือไม่");

    /*
    // ---------------------------------------------------------
    // 💡 ฉากที่ 2: การลดระดับ (Downgrade)
    // เงื่อนไข: ส่ง "Hard" ติดกัน 2 ครั้งล่าสุด
    // ---------------------------------------------------------
    // (หากต้องการทดสอบส่วนนี้ ให้ลบคอมเมนต์ออก)
    // await simulateFeedback('hard', 2);
    // console.log("\n✨ ผลลัพธ์: ระดับ Fitness Level ของคุณควรจะลดลง 1 ระดับ");
    */
}

runDemo();
