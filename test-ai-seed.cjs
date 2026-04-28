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
  workoutList: [
    {
      exercise: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise" },
      reps: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
      rest: { type: Number, default: 0 }
    }
  ]
});

const WorkoutProgram = mongoose.models.WorkoutProgram || mongoose.model('WorkoutProgram', workoutProgramSchema, 'program');
// สร้าง Model สำรองไว้ดึงข้อมูลท่าที่มีอยู่แล้วในระบบ
const Exercise = mongoose.models.Exercise || mongoose.model('Exercise', new mongoose.Schema({}), 'exercises');

const seedAdaptivePrograms = async () => {
  try {
    // 1. ลองดึงข้อมูลท่าออกกำลังกายจริงๆ จากฐานข้อมูลมา 3 ท่า
    const exList = await Exercise.find().limit(3);
    
    // ถ้าไม่มีท่าในฐานข้อมูลเลย จะใช้ Dummy ID แทน (แต่หน้าเว็บจะหาท่าไม่เจอ)
    const ex1 = exList[0] ? exList[0]._id : new mongoose.Types.ObjectId();
    const ex2 = exList[1] ? exList[1]._id : new mongoose.Types.ObjectId();
    const ex3 = exList[2] ? exList[2]._id : new mongoose.Types.ObjectId();

    // สร้างชุดท่าออกกำลังกายสำหรับทดสอบ (มีทั้งแบบนับครั้งและจับเวลา)
    const mockWorkoutList = [
      { exercise: ex1, reps: 10, duration: 0, rest: 10 }, // ท่าแบบนับครั้ง
      { exercise: ex2, reps: 0, duration: 30, rest: 10 }, // ท่าแบบจับเวลา
      { exercise: ex3, reps: 15, duration: 0, rest: 10 }  // ท่าแบบนับครั้ง
    ];

    const dummyPrograms = [
      {
        name: "[Test AI 1] โปรแกรมทดสอบ: อัปเลเวล",
        category: "เพิ่มกล้าม",
        difficultyLevel: 1, 
        DataFeedback: { easy: 12, medium: 2, hard: 0 },
        adaptiveHistory: [],
        workoutList: mockWorkoutList // ใส่ท่าเข้าไปแล้ว!
      },
      {
        name: "[Test AI 2] โปรแกรมทดสอบ: ลดเลเวล",
        category: "ลดไขมัน",
        difficultyLevel: 3,
        DataFeedback: { easy: 1, medium: 3, hard: 10 },
        adaptiveHistory: [],
        workoutList: mockWorkoutList // ใส่ท่าเข้าไปแล้ว!
      },
      {
        name: "[Test AI 3] โปรแกรมทดสอบ: ระดับเสถียร",
        category: "ความแข็งแรง",
        difficultyLevel: 2,
        DataFeedback: { easy: 5, medium: 25, hard: 6 },
        adaptiveHistory: [],
        workoutList: mockWorkoutList // ใส่ท่าเข้าไปแล้ว!
      }
    ];

    // ล้างโปรแกรม Test เก่าทิ้งก่อน เพื่อไม่ให้รก
    await WorkoutProgram.deleteMany({ name: { $regex: 'Test AI' } });

    const result = await WorkoutProgram.insertMany(dummyPrograms);
    console.log("✅ เพิ่มข้อมูลชุดทดสอบ พร้อมท่าออกกำลังกาย สำเร็จ!", result.length, "โปรแกรม");

    result.forEach((prog, i) => {
        console.log(`\n📌 โปรแกรมที่ ${i+1}: ${prog.name}`);
        console.log(`   - ID เอาไว้ทดสอบยิง API: ${prog._id}`);
        console.log(`   - จำนวนท่าในโปรแกรม: ${prog.workoutList.length} ท่า`);
    });

  } catch (e) {
    console.error("❌ Error:", e);
  } finally {
    process.exit(0);
  }
};

seedAdaptivePrograms();
