const mongoose = require('mongoose');

// เชื่อมต่อ Database (ควรเช็ก URL ให้ตรงกับในแอปของคุณ)
mongoose.connect('mongodb://127.0.0.1:27017/fitness_app').then(() => {
  console.log('MongoDB Connected for Seeding Data');
}).catch(err => console.log(err));

// ================= SCHEMA (จำลองโครงสร้างจาก server.cjs) =================
const workoutProgramSchema = new mongoose.Schema({
  name: String,
  category: String,
  difficultyLevel: { type: Number, default: 1 },
  DataFeedback: {
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 },
  },
  adaptiveHistory: [
    {
      date: { type: Date, default: Date.now },
      difficultyLevel: Number,
      reason: String
    }
  ],
  workoutList: Array
});

const WorkoutProgram = mongoose.models.WorkoutProgram || mongoose.model('WorkoutProgram', workoutProgramSchema, 'program');

const seedAdaptivePrograms = async () => {
  try {
    // ล้างข้อมูลเพื่อทดสอบง่าย (ถ้าไม่อยากให้ลบ คอมเมนต์บรรทัดนี้ได้เลยครับ)
    // await WorkoutProgram.deleteMany({ name: { $regex: 'Test AI' } });

    const dummyPrograms = [
      {
        name: "[Test AI 1] โปรแกรมทดสอบ: อัปเลเวล",
        category: "เพิ่มกล้าม",
        difficultyLevel: 1, 
        // 👇 ข้อมูลโหวตว่าจำลองว่าคนโหวต "ง่าย" มา 10 ครั้ง 
        DataFeedback: {
          easy: 12,  
          medium: 2,
          hard: 0
        },
        adaptiveHistory: [],
        workoutList: [] // จะใส่ dummy ObjectId ก็ได้ครับ
      },
      {
        name: "[Test AI 2] โปรแกรมทดสอบ: ลดเลเวล",
        category: "ลดไขมัน",
        difficultyLevel: 3,
        // 👇 ข้อมูลโหวตจำลองว่าคนโหวต "ยาก" ซะส่วนใหญ่
        DataFeedback: {
          easy: 1,
          medium: 3,
          hard: 10
        },
        adaptiveHistory: [],
        workoutList: []
      },
      {
        name: "[Test AI 3] โปรแกรมทดสอบ: ระดับเสถียร",
        category: "ความแข็งแรง",
        difficultyLevel: 2,
        // 👇 คนโหวตปานกลางเยอะสุด AI จะไม่ปรับเลเวล
        DataFeedback: {
          easy: 5,
          medium: 25,
          hard: 6
        },
        adaptiveHistory: [],
        workoutList: []
      }
    ];

    const result = await WorkoutProgram.insertMany(dummyPrograms);
    console.log("✅ เพิ่มข้อมูลชุดทดสอบ Adaptive Logic สำเร็จ!", result.length, "โปรแกรม");

    result.forEach((prog, i) => {
        console.log(`\n📌 โปรแกรมที่ ${i+1}: ${prog.name}`);
        console.log(`   - ID เอาไว้ทดสอบยิง API: ${prog._id}`);
        console.log(`   - เลเวลปัจจุบัน: ${prog.difficultyLevel}`);
        console.log(`   - DataFeedback:`, prog.DataFeedback);
    });

  } catch (e) {
    console.error("❌ Error:", e);
  } finally {
    process.exit(0);
  }
};

seedAdaptivePrograms();
