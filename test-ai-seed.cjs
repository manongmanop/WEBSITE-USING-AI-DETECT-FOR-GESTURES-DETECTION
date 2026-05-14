const mongoose = require('mongoose');

// เชื่อมต่อ Database
mongoose.connect('mongodb://127.0.0.1:27017/fitness_app').then(() => {
  console.log('MongoDB Connected for Seeding Data');
}).catch(err => console.log(err));

// ================= SCHEMA (ปรับปรุงให้มี sets) =================
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
      sets: { type: Number, default: 3 },
      reps: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
      rest: { type: Number, default: 10 }
    }
  ]
});

const WorkoutProgram = mongoose.models.WorkoutProgram || mongoose.model('WorkoutProgram', workoutProgramSchema, 'program');
const Exercise = mongoose.models.Exercise || mongoose.model('Exercise', new mongoose.Schema({}), 'exercises');

const seedAdaptivePrograms = async () => {
  try {
    const exList = await Exercise.find().limit(6);
    
    const ex1 = exList[0] ? exList[0]._id : new mongoose.Types.ObjectId();
    const ex2 = exList[5] ? exList[5]._id : new mongoose.Types.ObjectId();
    const ex3 = exList[2] ? exList[2]._id : new mongoose.Types.ObjectId();

    const mockWorkoutList = [
      { exercise: ex1, sets: 3, reps: 4, duration: 0, rest: 10, met: 5.0 }, 
      { exercise: ex2, sets: 3, reps: 0, duration: 15, rest: 10, met: 6.5 },
      { exercise: ex3, sets: 3, reps: 4, duration: 0, rest: 10, met: 4.0 }  
    ];

    const dummyPrograms = [
      {
        name: "[Test AI 1] โปรแกรมทดสอบ: อัปเลเวล",
        category: "เพิ่มกล้าม",
        difficultyLevel: 1, 
        DataFeedback: { easy: 12, medium: 2, hard: 0 },
        adaptiveHistory: [],
        workoutList: mockWorkoutList
      }
      // {
      //   name: "[Test AI 2] โปรแกรมทดสอบ: ลดเลเวล",
      //   category: "ลดไขมัน",
      //   difficultyLevel: 3,
      //   DataFeedback: { easy: 1, medium: 3, hard: 10 },
      //   adaptiveHistory: [],
      //   workoutList: mockWorkoutList
      // },
      // {
      //   name: "[Test AI 3] โปรแกรมทดสอบ: ระดับเสถียร",
      //   category: "ความแข็งแรง",
      //   difficultyLevel: 2,
      //   DataFeedback: { easy: 5, medium: 25, hard: 6 },
      //   adaptiveHistory: [],
      //   workoutList: mockWorkoutList
      // }
    ];

    await WorkoutProgram.deleteMany({ name: { $regex: 'Test AI' } });

    const result = await WorkoutProgram.insertMany(dummyPrograms);
    console.log("✅ เพิ่มข้อมูลชุดทดสอบ พร้อมระบบเซ็ตสำเร็จ!", result.length, "โปรแกรม");

    result.forEach((prog, i) => {
        console.log(`\n📌 โปรแกรมที่ ${i+1}: ${prog.name}`);
        console.log(`   - ID: ${prog._id}`);
    });

  } catch (e) {
    console.error("❌ Error:", e);
  } finally {
    process.exit(0);
  }
};

seedAdaptivePrograms();
