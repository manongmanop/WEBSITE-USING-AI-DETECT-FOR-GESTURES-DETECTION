const axios = require('axios');

/**
 * 🛠️ สคริปต์ทดสอบ Global Adaptive Feedback สำหรับโปรแกรมออกกำลังกาย
 * Logic: 
 * - ถ้า Easy > 60% ระบบจะเพิ่มความยาก (Upgrade)
 * - ถ้า Hard > 40% ระบบจะลดความยาก (Downgrade)
 * *หมายเหตุ: ต้องมี Feedback รวมกันอย่างน้อย 10 ครั้ง ระบบถึงจะเริ่มคำนวณ*
 */
 
const PROGRAM_ID = "68764eb050ed469ab179b122"; // ✅ ID โปรแกรมตัวอย่าง
const API_URL = "http://localhost:5000";

async function sendGlobalFeedback(level, count) {
    console.log(`\n--- 🌎 จำลองผู้ใช้ ${count} คน ส่ง Feedback ระดับ [${level.toUpperCase()}] ---`);
    for (let i = 1; i <= count; i++) {
        try {
            // สุ่ม UID ปลอมเพื่อให้ผ่านระบบป้องกันสแปม (Spam prevention ใน server.cjs)
            const fakeUid = `user_fake_${Math.random().toString(36).substring(7)}`;
            const res = await axios.patch(`${API_URL}/api/workout_programs/${PROGRAM_ID}/feedback`, {
                uid: fakeUid,
                level: level
            });
            
            // เช็คว่ามีการปรับระดับความยากเกิดขึ้นหรือไม่จาก response
            if (res.data.msg && res.data.msg.includes("difficulty automatically adjusted")) {
                console.log(`🚀 [ครั้งที่ ${i}] สำเร็จ! ตรวจพบการปรับระดับความยากอัตโนมัติ!`);
            } else {
                console.log(`✅ [ครั้งที่ ${i}] บันทึกสำเร็จ`);
            }
        } catch (err) {
            console.error(`❌ ครั้งที่ ${i}: เกิดข้อผิดพลาด - ${err.response?.data?.error || err.message}`);
        }
    }
}

async function runGlobalTest() {
    console.log("🚀 เริ่มต้นการทดสอบ Global Adaptive Program...");

    // 💡 ฉากที่ 1: ทำให้โปรแกรมยากขึ้น (Upgrade)
    // ส่ง Easy 7 ครั้ง (ให้เกิน 60% ของ 10 ครั้งแรก)
    await sendGlobalFeedback('easy', 7);
    
    // ส่ง Medium 3 ครั้ง (เพื่อให้ครบ 10 ครั้งเพื่อเริ่มการคำนวณตาม Logic ใน server.cjs)
    await sendGlobalFeedback('medium', 4); // ส่งเผื่อไว้ให้ครบเกณฑ์ total < 10

    console.log("\n✨ ผลลัพธ์: หาก Feedback รวมเกิน 10 ครั้ง และ Easy เกิน 60%");
    console.log("👉 โปรแกรมจะเพิ่มจำนวนครั้ง (Reps) และเวลา (Duration) ในฐานข้อมูลให้อัตโนมัติ");
    console.log("👉 สามารถตรวจสอบได้จาก Log ในหน้าจอ Server ครับ");
}

runGlobalTest();
