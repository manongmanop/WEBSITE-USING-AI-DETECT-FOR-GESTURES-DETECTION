const express = require('express');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
require('dotenv').config();
const { calculateCalories } = require('./utils/calculateCalories.cjs');
console.log("🚀 SERVER STARTING - VERSION: WITH_CALCULATE_CALORIES_UTIL"); // Unique Log
const PORT = process.env.PORT || 5000;
// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://exercise-backend-zzrm.onrender.com"
  ],
  credentials: true
}));
app.use(express.json());

// Base Route
app.get("/", (req, res) => {
  res.send("Exercise API is running 🚀");
});

const bodyMetricSchema = new Schema({
  // ID ของผู้ใช้ที่เป็นเจ้าของข้อมูลนี้ (เชื่อมกับ Collection 'users')
  userId: {
    type: Schema.Types.String,
    ref: 'User', // สมมติว่าคุณมีโมเดล User
    required: true,
    index: true // ทำ index เพื่อให้ค้นหาตาม userId ได้เร็วขึ้น
  },
  // วันที่และเวลาที่บันทึกข้อมูล
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  // น้ำหนัก (หน่วยเป็น กก.)
  weight: {
    type: Number,
    required: true
  },
  // ส่วนสูง (หน่วยเป็น ซม.)
  height: {
    type: Number,
    required: true
  },
  // ค่า BMI (คำนวณและเก็บไว้เลยเพื่อความเร็วในการดึงข้อมูล)
  bmi: {
    type: Number
  },
  // เปอร์เซ็นต์ไขมันในร่างกาย (ถ้ามี)
  fatPercentage: {
    type: Number
  },
  // มวลกล้ามเนื้อ (ถ้ามี, หน่วยเป็น กก.)
  muscleMass: {
    type: Number
  }
}, {
  // เพิ่ม field createdAt และ updatedAt อัตโนมัติ
  timestamps: true
});

// สร้าง Model จาก Schema
const BodyMetric = mongoose.model('BodyMetric', bodyMetricSchema);

const dailyPlanSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    default: () => new Date().toISOString().split('T')[0]
  },
  exercises: [
    {
      exerciseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exercise"
      },
      name: String,
      reps: Number,
      time: Number, // seconds
      met: Number
    }
  ],
  // 📊 summary
  totalDuration: Number, // seconds
  estimatedCalories: Number,
  // 📌 status
  status: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending"
  }
}, { timestamps: true });

dailyPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyPlan = mongoose.model('DailyPlan', dailyPlanSchema);

// --- WorkoutLog Schema & Route ---
const workoutLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  exerciseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exercise",
    required: true
  },
  // 📊 Performance
  reps: Number,
  duration: Number, // seconds
  calories: Number,
  // 🧠 Feedback (หัวใจ AI)
  feedback: {
    type: String,
    enum: ["easy", "medium", "hard"],
    required: true
  },
  // 🤖 รองรับ MediaPipe
  performance: {
    formScore: Number,   // 0 - 1
    stability: Number    // 0 - 1
  },
  // 📅 วัน (ใช้ string เพื่อ query ง่าย)
  date: {
    type: String, // YYYY-MM-DD
    required: true
  }
}, { timestamps: true });

const WorkoutLog = mongoose.model('WorkoutLog', workoutLogSchema);

app.post('/api/workout-log', async (req, res) => {
  try {
    const {
      userId,
      exerciseId,
      reps,
      duration,
      calories,
      feedback,
      performance
    } = req.body;

    const today = new Date().toISOString().split("T")[0];

    // ✅ save log
    const log = await WorkoutLog.create({
      userId,
      exerciseId,
      reps,
      duration,
      calories,
      feedback,
      performance,
      date: today
    });

    res.json(log);
  } catch (err) {
    console.error("WorkoutLog Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function: calculate new fitness level based on feedbacks
function updateFitnessLevel(currentLevel, feedbacks) {
  if (!feedbacks || feedbacks.length === 0) return currentLevel || 1;

  const easyCount = feedbacks.filter(f => f === 'easy').length;
  const hardCount = feedbacks.filter(f => f === 'hard').length;
  const current = parseInt(currentLevel) || 1;

  let newLevel = current;
  // If more than half the exercises were easy, increase the level (max 3)
  if (easyCount > feedbacks.length / 2) {
    newLevel = Math.min(3, current + 1);
  }
  // If more than half were hard, decrease the level (min 1)
  else if (hardCount > feedbacks.length / 2) {
    newLevel = Math.max(1, current - 1);
  }
  return newLevel;
}

function determineDifficultyLevel(diff) {
  if (diff === 'intermediate') return 2;
  if (diff === 'advanced') return 3;
  return 1; // beginner
}

function getDifficultyName(level) {
  if (level <= 1) return 'beginner';
  if (level === 2) return 'intermediate';
  return 'advanced';
}

app.post('/api/finish-workout', async (req, res) => {
  try {
    const { userId } = req.body;
    const today = new Date().toISOString().split("T")[0];

    // 1. ดึง logs ของผู้ใช้วันนี้ และ ของเก่า (ล่าสุด 10 ครั้ง เพื่อวิเคราะห์โจทย์ข้อ 2)
    const logsToday = await WorkoutLog.find({ userId, date: today });
    const recentLogs = await WorkoutLog.find({ userId }).sort({ createdAt: -1 }).limit(10);

    // 2. update fitnessLevel (อิงจากวันนี้เป็นหลัก หรือจะใช้ทั้งหมดก็ได้)
    // ตรงนี้เรายังใช้ logsToday.map(l => l.feedback) ตาม logic เดิมที่คุณให้มาในตอนแรก
    const feedbacks = logsToday.map(l => l.feedback);
    const user = await mongoose.model('User').findOne({ uid: userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const newLevel = updateFitnessLevel(user.fitnessLevel, feedbacks);
    user.fitnessLevel = newLevel;
    await user.save();

    // 3. update plan status for today
    await mongoose.model('DailyPlan').findOneAndUpdate(
      { userId, date: today },
      { status: "completed" }
    );

    // 4. วิเคราะห์ Performance และ Feedback แบบรายท่า (จัดรวม logs ตาม exerciseId)
    const logsByExercise = {};
    recentLogs.forEach(l => {
      const exId = l.exerciseId.toString();
      if (!logsByExercise[exId]) {
        logsByExercise[exId] = { easyCount: 0, hardCount: 0, formSum: 0, stabSum: 0, perfCount: 0 };
      }
      if (l.feedback === "easy") logsByExercise[exId].easyCount += 1;
      if (l.feedback === "hard") logsByExercise[exId].hardCount += 1;

      if (l.performance && l.performance.formScore != null) {
        logsByExercise[exId].formSum += l.performance.formScore;
        logsByExercise[exId].stabSum += l.performance.stability;
        logsByExercise[exId].perfCount += 1;
      }
    });

    const allExercises = await mongoose.model('Exercise').find();
    const workoutPlan = await mongoose.model('WorkoutPlan').findOne({ uid: userId });
    let planModified = false;

    if (workoutPlan) {
      workoutPlan.plans.forEach(planDay => {
        planDay.exercises.forEach(ex => {
          const exId = ex.exercise.toString();
          if (logsByExercise[exId]) {
            const stats = logsByExercise[exId];
            const perfScore = stats.perfCount > 0 ? ((stats.formSum + stats.stabSum) / 2) / stats.perfCount : null;

            const currentEx = allExercises.find(e => e._id.toString() === exId);
            if (!currentEx) return;
            const currentLevelDiff = determineDifficultyLevel(currentEx.difficulty);

            // CASE 1: เก่งเกิน (Upgrade)
            if (stats.easyCount >= 3 && (perfScore === null || perfScore > 0.7)) {
              const targetDiff = getDifficultyName(currentLevelDiff + 1);
              // หา movement เดิม (ใช้ muscles หรือ targetMuscle ร่วมกัน)
              const upgradeEx = allExercises.find(e =>
                e._id.toString() !== exId &&
                e.difficulty === targetDiff &&
                e.muscles.some(m => currentEx.muscles.includes(m))
              );

              if (upgradeEx) {
                ex.exercise = upgradeEx._id;
              } else {
                // Fallback: เพิ่ม reps/time 10%
                if (ex.performed.reps > 0) ex.performed.reps = Math.ceil(ex.performed.reps * 1.1);
                if (ex.performed.seconds > 0) ex.performed.seconds = Math.ceil(ex.performed.seconds * 1.1);
              }
              planModified = true;
            }
            // CASE 2: ยากเกิน (Downgrade)
            else if (stats.hardCount >= 2 && (perfScore !== null && perfScore < 0.5)) {
              const targetDiff = getDifficultyName(currentLevelDiff - 1);
              const downgradeEx = allExercises.find(e =>
                e._id.toString() !== exId &&
                e.difficulty === targetDiff &&
                e.muscles.some(m => currentEx.muscles.includes(m))
              );

              if (downgradeEx) {
                ex.exercise = downgradeEx._id;
              } else {
                // Fallback: ลด reps/time 10%
                if (ex.performed.reps > 0) ex.performed.reps = Math.max(1, Math.floor(ex.performed.reps * 0.9));
                if (ex.performed.seconds > 0) ex.performed.seconds = Math.max(1, Math.floor(ex.performed.seconds * 0.9));
              }
              planModified = true;
            }
            // CASE 3: พอดี
            else {
              // เพิ่ม reps/time +10% ให้พัฒนาขึ้นไปอีกนิด
              if (ex.performed.reps > 0) ex.performed.reps = Math.ceil(ex.performed.reps * 1.1);
              if (ex.performed.seconds > 0) ex.performed.seconds = Math.ceil(ex.performed.seconds * 1.1);
              planModified = true;
            }
          }
        });
      });

      if (planModified) {
        workoutPlan.markModified('plans');
        await workoutPlan.save();
      }
    }

    res.json({
      message: "Workout completed and plan adjusted successfully",
      newLevel,
      planModified
    });

  } catch (err) {
    console.error("FinishWorkout Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/metrics', async (req, res) => {
  // ในแอปจริง คุณควรจะดึง userId จาก Token ที่ผ่านการยืนยันตัวตนแล้ว
  // เช่น const userId = req.user.id;
  // แต่ในตัวอย่างนี้ เราจะรับจาก body ไปก่อน
  const { userId, weight, height, fatPercentage, muscleMass } = req.body;

  if (!userId || !weight || !height) {
    return res.status(400).json({ msg: 'กรุณากรอกข้อมูล userId, weight, และ height' });
  }

  try {
    // คำนวณ BMI
    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(2);

    const newMetric = new BodyMetric({
      userId,
      weight,
      height,
      bmi,
      fatPercentage,
      muscleMass
    });

    const savedMetric = await newMetric.save();
    res.status(201).json(savedMetric);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.get('/api/metrics', async (req, res) => {
  try {
    // ใช้ userId จาก query parameter หรือ body แทน
    const userId = req.query.userId; // เพิ่มบรรทัดนี้

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { range } = req.query;
    let startDate;
    const today = new Date();

    switch (range) {
      case '1m':
        startDate = new Date(new Date().setMonth(today.getMonth() - 1));
        break;
      case '3m':
        startDate = new Date(new Date().setMonth(today.getMonth() - 3));
        break;
      case '6m':
        startDate = new Date(new Date().setMonth(today.getMonth() - 6));
        break;
      case '1y':
        startDate = new Date(new Date().setFullYear(today.getFullYear() - 1));
        break;
      case 'all':
      default:
        startDate = null;
        break;
    }

    const query = { userId };
    if (startDate) {
      query.date = { $gte: startDate };
    }

    const metrics = await BodyMetric.find(query).sort({ date: 'asc' });
    res.json(metrics);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// --- Routes ---
app.post('/api/workoutplan', async (req, res) => {
  try {
    const { uid, plans } = req.body;

    if (!uid || !plans) {
      return res.status(400).json({ error: 'UID and plans are required' });
    }

    // ตรวจสอบว่าผู้ใช้มีแผนอยู่แล้วหรือไม่
    const existingPlan = await WorkoutPlan.findOne({ uid });
    if (existingPlan) {
      // ถ้ามีแล้ว ให้อัปเดตแทน
      existingPlan.plans = plans;
      existingPlan.updatedAt = new Date();
      const updatedPlan = await existingPlan.save();
      return res.json(updatedPlan);
    }

    // สร้างแผนใหม่
    const newPlan = new WorkoutPlan({
      uid,
      plans,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedPlan = await newPlan.save();
    res.status(201).json(savedPlan);

  } catch (error) {
    console.error('Error creating workout plan:', error);
    res.status(500).json({ error: 'ไม่สามารถสร้างแผนการออกกำลังกายได้' });
  }
});
// GET workout plan ของผู้ใช้
app.get('/api/workoutplan/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const workoutPlan = await WorkoutPlan.findOne({ uid }).populate('plans.exercises.exercise');
    if (!workoutPlan) {
      return res.status(404).json({ error: 'Workout plan not found' });
    }

    res.json(workoutPlan);

  } catch (error) {
    console.error('Error fetching workout plan:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงแผนการออกกำลังกายได้' });
  }
});


// DELETE workout plan ของผู้ใช้
app.delete('/api/workoutplan/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const deletedPlan = await WorkoutPlan.findOneAndDelete({ uid });
    if (!deletedPlan) {
      return res.status(404).json({ error: 'Workout plan not found' });
    }

    // อัปเดต user profile ให้ workoutPlanId เป็น null
    await User.findOneAndUpdate(
      { uid },
      { workoutPlanId: null, updatedAt: new Date() }
    );

    res.json({ message: 'Workout plan deleted successfully' });

  } catch (error) {
    console.error('Error deleting workout plan:', error);
    res.status(500).json({ error: 'ไม่สามารถลบแผนการออกกำลังกายได้' });
  }
});


// PATCH - อัปเดตเฉพาะความก้าวหน้า (completed) ของ exercise ใน workout plan
app.patch('/api/workoutplan/:uid/progress', async (req, res) => {
  try {
    const { uid } = req.params;
    const { day, exerciseIndex, completed } = req.body;

    if (day === undefined || exerciseIndex === undefined || completed === undefined) {
      return res.status(400).json({ message: 'ต้องระบุ day, exerciseIndex, และ completed' });
    }

    const workoutPlan = await WorkoutPlan.findOne({ uid });
    if (!workoutPlan) return res.status(404).json({ message: 'ไม่พบ workout plan ของผู้ใช้' });

    const dayPlan = workoutPlan.plans.find(p => p.day === day);
    if (!dayPlan) return res.status(404).json({ message: `ไม่พบข้อมูลของวัน ${day}` });

    if (exerciseIndex >= dayPlan.exercises.length || exerciseIndex < 0) {
      return res.status(400).json({ message: 'exerciseIndex ไม่ถูกต้อง' });
    }

    // อัปเดตค่า completed
    dayPlan.exercises[exerciseIndex].completed = completed;
    await workoutPlan.save();

    const populatedPlan = await WorkoutPlan.findOne({ uid }).populate('plans.exercises.exercise');
    res.status(200).json(populatedPlan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - เพิ่มท่าออกกำลังกายในวันที่ระบุ
// POST - เพิ่มท่าออกกำลังกายในวันที่ระบุ (UPDATED: เก็บเฉพาะ reference + performed ว่าง)
app.post('/api/workoutplan/:uid/day/:day/exercise', async (req, res) => {
  try {
    const { uid, day } = req.params;
    const { exercise } = req.body;

    if (!exercise) return res.status(400).json({ message: 'ต้องระบุ exercise ID' });

    const exerciseExists = await Exercise.findById(exercise);
    if (!exerciseExists) return res.status(404).json({ message: 'ไม่พบ exercise ที่ระบุ' });

    let workoutPlan = await WorkoutPlan.findOne({ uid });
    if (!workoutPlan) {
      workoutPlan = new WorkoutPlan({
        uid,
        plans: [
          { day: 'monday', exercises: [] },
          { day: 'tuesday', exercises: [] },
          { day: 'wednesday', exercises: [] },
          { day: 'thursday', exercises: [] },
          { day: 'friday', exercises: [] },
          { day: 'saturday', exercises: [] },
          { day: 'sunday', exercises: [] }
        ]
      });
    }

    let dayPlan = workoutPlan.plans.find(p => p.day === day);
    if (!dayPlan) {
      dayPlan = { day, exercises: [] };
      workoutPlan.plans.push(dayPlan);
    }

    dayPlan.exercises.push({ exercise, performed: {} });
    await workoutPlan.save();

    const populatedPlan = await WorkoutPlan.findOne({ uid }).populate('plans.exercises.exercise');
    res.status(201).json(populatedPlan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// DELETE - ลบท่าออกกำลังกายในวันที่ระบุ
app.delete('/api/workoutplan/:uid/day/:day/exercise/:index', async (req, res) => {
  try {
    const { uid, day, index } = req.params;

    const workoutPlan = await WorkoutPlan.findOne({ uid });
    if (!workoutPlan) return res.status(404).json({ message: 'ไม่พบ workout plan ของผู้ใช้' });

    const dayPlan = workoutPlan.plans.find(p => p.day === day);
    if (!dayPlan) return res.status(404).json({ message: `ไม่พบข้อมูลของวัน ${day}` });

    // ตรวจสอบ index
    const exerciseIndex = parseInt(index);
    if (isNaN(exerciseIndex) || exerciseIndex < 0 || exerciseIndex >= dayPlan.exercises.length) {
      return res.status(400).json({ message: 'index ไม่ถูกต้อง' });
    }

    // ลบท่าออกกำลังกาย
    dayPlan.exercises.splice(exerciseIndex, 1);

    await workoutPlan.save();

    const populatedPlan = await WorkoutPlan.findOne({ uid }).populate('plans.exercises.exercise');
    res.status(200).json(populatedPlan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT - แก้ไขท่าออกกำลังกายในวันที่ระบุ
// PUT - แก้ไขท่าในวันนั้นโดย index (UPDATED: ไม่ใช้ sets/reps/weight/completed แล้ว)
app.put('/api/workoutplan/:uid/day/:day/exercise/:index', async (req, res) => {
  try {
    const { uid, day, index } = req.params;
    const { exercise } = req.body;

    if (!exercise) return res.status(400).json({ message: 'ต้องระบุ exercise ID' });

    const exerciseExists = await Exercise.findById(exercise);
    if (!exerciseExists) return res.status(404).json({ message: 'ไม่พบ exercise ที่ระบุ' });

    const workoutPlan = await WorkoutPlan.findOne({ uid });
    if (!workoutPlan) return res.status(404).json({ message: 'ไม่พบ workout plan ของผู้ใช้' });

    const dayPlan = workoutPlan.plans.find(p => p.day === day);
    if (!dayPlan) return res.status(404).json({ message: `ไม่พบข้อมูลของวัน ${day}` });

    const i = parseInt(index, 10);
    if (Number.isNaN(i) || i < 0 || i >= dayPlan.exercises.length) {
      return res.status(400).json({ message: 'index ไม่ถูกต้อง' });
    }

    // เก็บ performed เดิมไว้
    const current = dayPlan.exercises[i];
    dayPlan.exercises[i] = { exercise, performed: current?.performed || {} };

    await workoutPlan.save();

    const populatedPlan = await WorkoutPlan.findOne({ uid }).populate('plans.exercises.exercise');
    res.status(200).json(populatedPlan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// สร้างโฟลเดอร์ uploads อัตโนมัติ
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// กำหนดที่เก็บไฟล์สำหรับ Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

// กำหนด filter สำหรับไฟล์ที่อนุญาต
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('ไม่อนุญาตให้อัปโหลดไฟล์ประเภทนี้! กรุณาอัปโหลดเฉพาะรูปภาพ, วิดีโอ หรือไฟล์เสียง'), false);
  }
};

// ตั้งค่า Multer
const upload = multer({
  storage, fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  }
});

// เชื่อมต่อกับ MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fitness_app';
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB Connected to:', process.env.MONGODB_URI ? 'Atlas/Cloud' : 'Local'))
  .catch(err => console.log('MongoDB Connection Error:', err));

// --- เพิ่มส่วน User Schema และ Routes ---
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  caloriesBurned: { type: Number, default: 0 },
  workoutsDone: { type: Number, default: 0 },
  weeklyGoal: { type: Number, default: 3 },
  workoutPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutPlan', default: null },

  // ✅ Onboarding Fields
  fitnessLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  primaryGoal: { type: String, default: '' },
  preferredDays: [{ type: String }], // e.g. ["Monday", "Wednesday"]

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema, 'users');

// API Routes สำหรับ User
// POST: สร้างหรืออัปเดตผู้ใช้ (ใช้สำหรับตอน login/register)
app.post('/api/users', async (req, res) => {
  try {
    const {
      uid,
      caloriesBurned = 0,
      workoutsDone = 0,
      weeklyGoal = 3,
      workoutPlanId = null,
      fitnessLevel = 'Beginner',
      primaryGoal = '',
      preferredDays = []
    } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'UID is required' });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่แล้วหรือไม่
    const existingUser = await User.findOne({ uid });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // สร้างผู้ใช้ใหม่
    const newUser = new User({
      uid,
      caloriesBurned,
      workoutsDone,
      weeklyGoal,
      workoutPlanId,
      fitnessLevel,
      primaryGoal,
      preferredDays,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'ไม่สามารถสร้างผู้ใช้ได้' });
  }
});

// PUT: อัปเดตข้อมูลผู้ใช้ (ใช้สำหรับ Onboarding หรือแก้ไขโปรไฟล์)
app.put('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const updateData = req.body;

    // ป้องกันการแก้ไข uid
    delete updateData.uid;

    const updatedUser = await User.findOneAndUpdate(
      { uid },
      {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      },
      { new: true } // คืนค่าข้อมูลใหม่หลังอัปเดต
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้' });
  }
});

// ================== AI Plan Engine ==================
// ================== AI Plan Engine v2 ==================

// helper สำหรับปรับความยาก (v2)
function adjustIntensity(exercise, levelLabel) {
  let multiplier = 1;
  const level = levelLabel.toLowerCase();

  if (level === "intermediate") multiplier = 1.25;
  if (level === "advanced") multiplier = 1.5;

  // ✅ กำหนดค่าพื้นฐานที่สมเหตุสมผล (ไม่เอา 1 ครั้ง หรือ 10 วิ)
  // ถ้าใน DB น้อยกว่าเกณฑ์ ให้ใช้เกณฑ์ขั้นต่ำ (8 ครั้ง / 30 วินาที)
  const baseReps = Math.max(exercise.reps || 8, 8);
  const baseSeconds = Math.max(exercise.time || exercise.duration || 30, 30);

  return {
    exercise: exercise._id,
    performed: {
      reps: exercise.type === 'reps' ? Math.round(baseReps * multiplier) : 0,
      seconds: exercise.type === 'time' ? Math.round(baseSeconds * multiplier) : 0
    }
  };
}

// helper สำหรับสุ่มอาร์เรย์ (v2)
function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// helper สำหรับสร้างแผน (v2)
async function generateWorkoutPlanInternal(uid) {
  const User = mongoose.model('User');
  const Exercise = mongoose.model('Exercise');
  const WorkoutPlan = mongoose.model('WorkoutPlan');
  const DailyPlan = mongoose.model('DailyPlan');

  console.log(`[PlanEngine-v2] Starting generation for UID: ${uid}`);

  const user = await User.findOne({ uid });
  if (!user) throw new Error("User not found");

  const level = user.fitnessLevel || "Beginner";
  const difficulty = level.toLowerCase();

  // 1. นอร์มัลไลเซชันชื่อวัน (ให้ตรงกับ Frontend)
  let preferredDays = (user.preferredDays || []).map(d => d.trim().toLowerCase());
  if (preferredDays.length === 0) {
    console.warn("[PlanEngine-v2] No preferredDays set, falling back to M/W/F");
    preferredDays = ["monday", "wednesday", "friday"];
  }

  // 2. ดึงท่าออกกำลังกาย (Case-insensitive)
  let exercises = await Exercise.find({
    difficulty: new RegExp(`^${difficulty}$`, "i")
  });

  console.log(`[PlanEngine-v2] Target level '${difficulty}' found ${exercises.length} exercises.`);

  // 3. Smart Fallback: ถ้าไม่มีท่าในระดับนั้น ให้ดึงทั้งหมดมาแทน
  if (exercises.length === 0) {
    console.warn(`[PlanEngine-v2] No exercises found for ${difficulty}. Falling back to ALL.`);
    exercises = await Exercise.find({});
  }

  if (exercises.length === 0) {
    throw new Error("No exercises available in database.");
  }

  // 4. จัดกลุ่มตามกล้ามเนื้อ (ใช้ muscle แรกในลิสต์)
  const groupedByMuscle = {};
  exercises.forEach(ex => {
    const mainMuscle = (ex.muscles && ex.muscles.length > 0) ? ex.muscles[0] : "General";
    if (!groupedByMuscle[mainMuscle]) groupedByMuscle[mainMuscle] = [];
    groupedByMuscle[mainMuscle].push(ex);
  });
  const muscleGroups = Object.keys(groupedByMuscle);

  // 5. สร้างแผน 7 วัน
  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const plans = [];

  let workoutDayCounter = 0;

  daysOfWeek.forEach((day) => {
    const dailyExercises = [];

    if (preferredDays.includes(day)) {
      // หมุนเวียนกลุ่มกล้ามเนื้อ
      const targetMuscle = muscleGroups[workoutDayCounter % muscleGroups.length];
      const pool = groupedByMuscle[targetMuscle];

      // สุ่มและเลือก 3 ท่าต่อวัน (หรือมากกว่าตามระดับ)
      const numToPick = difficulty === 'beginner' ? 3 : (difficulty === 'intermediate' ? 4 : 5);
      const shuffledPool = shuffleArray(pool);
      const selected = shuffledPool.slice(0, numToPick);

      // ถ้าท่าไม่พอในกลุ่มนี้ ให้ดึงจากกองกลางมาเสริม
      if (selected.length < numToPick) {
        const others = exercises.filter(ex => !selected.map(s => s._id.toString()).includes(ex._id.toString()));
        const backup = shuffleArray(others).slice(0, numToPick - selected.length);
        selected.push(...backup);
      }

      selected.forEach(ex => {
        dailyExercises.push(adjustIntensity(ex, level));
      });

      workoutDayCounter++;
    }

    plans.push({
      day: day,
      exercises: dailyExercises
    });
  });

  // 6. บันทึกลงฐานข้อมูล
  await WorkoutPlan.findOneAndDelete({ uid });
  const newWP = await WorkoutPlan.create({ uid, plans });

  // 7. ล้าง DailyPlan ในอนาคต (Pending) เพื่อให้เห็นการเปลี่ยนแปลงทันที
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD ใน local time
  await DailyPlan.deleteMany({
    userId: uid,
    date: { $gte: todayStr },
    status: 'pending'
  });

  console.log(`[PlanEngine-v2] Success! Plan generated with ${workoutDayCounter} workout days.`);
  return newWP;
}

app.post('/api/users/:uid/generate-plan', async (req, res) => {
  try {
    const { uid } = req.params;
    const newPlan = await generateWorkoutPlanInternal(uid);
    res.json({ message: "Plan Generated v2", plan: newPlan });
  } catch (err) {
    console.error("Plan Generation v2 Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/daily-plan/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { date: queryDate } = req.query; // ✅ รองรับการระบุวันที่ (YYYY-MM-DD)
    const todayStr = new Date().toLocaleDateString('en-CA');
    const targetDate = queryDate || todayStr;

    // 1. ดึง WorkoutPlan เสมอเพื่อเอาชื่อวันที่มีท่า (Active Days) มาแสดงแถบ Header
    const workoutPlan = await mongoose.model('WorkoutPlan')
      .findOne({ uid })
      .populate('plans.exercises.exercise');

    if (!workoutPlan) {
      return res.status(404).json({ error: "No Workout Plan Found" });
    }

    const availableWorkoutDays = workoutPlan.plans
      .filter(p => p.exercises && p.exercises.length > 0)
      .map(p => p.day);

    const DailyPlan = mongoose.model('DailyPlan');
    const existingPlan = await DailyPlan.findOne({ userId: uid, date: targetDate }).populate('exercises.exerciseId');

    if (existingPlan) {
      // ✅ ส่ง availableWorkoutDays กลับไปด้วยแม้จะมีแผนอยู่แล้ว
      return res.json({ ...existingPlan.toObject(), availableWorkoutDays });
    }

    // ถ้าไม่มี ให้สร้างจาก Template ของ "วันตามเป้าหมาย" (ใช้ local components เพื่อกัน timezone shift)
    const [y, m, d] = targetDate.split('-').map(Number);
    const targetDayName = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todaysTemplate = workoutPlan.plans.find(p => p.day === targetDayName);

    if (!todaysTemplate || !todaysTemplate.exercises.length) {
      // วันพักผ่อน (Rest Day) ไม่มีท่า
      return res.json({
        date: targetDate,
        status: "completed",
        exercises: [],
        totalDuration: 0,
        estimatedCalories: 0,
        availableWorkoutDays
      });
    }

    // แปลงเข้า DailyPlan Schema
    let totalDuration = 0;
    let estimatedCalories = 0;
    const exercisesForPlan = todaysTemplate.exercises.map(exItem => {
      const ex = exItem.exercise;
      if (!ex) return null;

      let time = exItem.performed.seconds || (ex.duration) || 30;
      let mets = (ex.met && ex.met.base) ? ex.met.base : 5;

      totalDuration += time;
      // แคลคร่าวๆ: (MET * 70kg * time) / 3600
      estimatedCalories += (mets * 70 * time) / 3600;

      return {
        exerciseId: ex._id,
        name: ex.name,
        reps: exItem.performed.reps || ex.reps || 0,
        time: time,
        met: mets
      };
    }).filter(e => e !== null);

    const newDailyPlan = await DailyPlan.create({
      userId: uid,
      date: targetDate,
      exercises: exercisesForPlan,
      totalDuration,
      estimatedCalories,
      status: "pending"
    });

    // ส่ง availableWorkoutDays กลับไปด้วย
    res.json({ ...newDailyPlan.toObject(), availableWorkoutDays });
  } catch (err) {
    console.error("Daily Plan Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== API: Daily Plan Overview (14 Days) ==================
app.get('/api/daily-plan/overview/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const daysArr = [];
    const today = new Date();

    // 1. ดึง WorkoutPlan มาเช็คตาราง (Active Days)
    const workoutPlan = await mongoose.model('WorkoutPlan').findOne({ uid });
    const availableDays = workoutPlan?.plans
      .filter(p => p.exercises && p.exercises.length > 0)
      .map(p => p.day) || [];

    // 2. ดึง DailyPlan ที่มีอยู่แล้วในช่วง -7 ถึง +7 วัน
    const startDate = new Date();
    startDate.setDate(today.getDate() - 7);
    const endDate = new Date();
    endDate.setDate(today.getDate() + 7);

    const existingPlans = await mongoose.model('DailyPlan').find({
      userId: uid,
      date: {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0]
      }
    }).lean();

    const planMap = new Map();
    existingPlans.forEach(p => planMap.set(p.date, p.status));

    // 3. สร้างข้อมูล 15 วัน
    for (let i = -7; i <= 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD ใน local time

      // คำนวณ dayName แบบ timezone-safe
      const [y_part, m_part, d_part] = dateStr.split('-').map(Number);
      const dayName = new Date(y_part, m_part - 1, d_part).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      let status = planMap.get(dateStr);

      if (!status) {
        // ถ้ายังไม่มีใน DB ให้เช็คว่าเป็นวันพักผ่อนหรือไม่
        const isWorkoutDay = availableDays.includes(dayName);
        status = isWorkoutDay ? 'pending' : 'rest';
      }

      daysArr.push({
        date: dateStr,
        dayNum: d.getDate(),
        dayNameShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDayName: dayName,
        status, // completed, pending, rest
        isToday: i === 0
      });
    }

    res.json({ days: daysArr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ API สำหรับสลับแผน (Swap Workout)
app.post('/api/daily-plan/:uid/swap', async (req, res) => {
  try {
    const { uid } = req.params;
    const { targetDay } = req.body; // เช่น "monday"
    const today = new Date().toLocaleDateString('en-CA');

    const workoutPlan = await mongoose.model('WorkoutPlan')
      .findOne({ uid })
      .populate('plans.exercises.exercise');

    if (!workoutPlan) return res.status(404).json({ error: "Workout plan not found" });

    const selectedTemplate = workoutPlan.plans.find(p => p.day === targetDay.toLowerCase());
    if (!selectedTemplate || !selectedTemplate.exercises.length) {
      return res.status(400).json({ error: "Selected day has no exercises" });
    }

    // คำนวณ Stats ใหม่
    let totalDuration = 0;
    let estimatedCalories = 0;
    const exercisesForPlan = selectedTemplate.exercises.map(exItem => {
      const ex = exItem.exercise;
      if (!ex) return null;
      let time = exItem.performed.seconds || ex.duration || 30;
      let mets = (ex.met && ex.met.base) ? ex.met.base : 5;
      totalDuration += time;
      estimatedCalories += (mets * 70 * time) / 3600;
      return {
        exerciseId: ex._id,
        name: ex.name,
        reps: exItem.performed.reps || ex.reps || 0,
        time: time,
        met: mets
      };
    }).filter(e => e !== null);

    // Upsert เข้า DailyPlan
    const updatedDailyPlan = await mongoose.model('DailyPlan').findOneAndUpdate(
      { userId: uid, date: today },
      {
        exercises: exercisesForPlan,
        totalDuration,
        estimatedCalories,
        status: "pending" // รีเซ็ตสถานะเป็น pending เพื่อให้เล่นได้
      },
      { upsert: true, new: true }
    ).populate('exercises.exerciseId');

    res.json(updatedDailyPlan);
  } catch (err) {
    console.error("Swap Plan Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ API สำหรับกำหนดวันพัก (Set as Rest Day)
app.post('/api/daily-plan/:uid/set-rest', async (req, res) => {
  try {
    const { uid } = req.params;
    const { date } = req.body; // YYYY-MM-DD

    const DailyPlan = mongoose.model('DailyPlan');
    const updatedDailyPlan = await DailyPlan.findOneAndUpdate(
      { userId: uid, date: date },
      {
        exercises: [],
        totalDuration: 0,
        estimatedCalories: 0,
        status: "rest" // กำหนดเป็นวันพัก
      },
      { upsert: true, new: true }
    );

    res.json(updatedDailyPlan);
  } catch (err) {
    console.error("Set Rest Day Error:", err);
    res.status(500).json({ error: err.message });
  }
});
// GET: ดึงข้อมูลผู้ใช้ตาม UID
// GET /api/users/:uid
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' });
  }
});

// GET: ดึงข้อมูลผู้ใช้งานทั้งหมด (สำหรับ Admin)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้งานกรุณาลองใหม่' });
  }
});

// DELETE: ลบผู้ใช้งาน (สำหรับ Admin)
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // (Optional) ลบ WorkoutPlan หรือประวัติที่เกี่ยวข้องกับผู้ใช้นี้เพิ่มเติม
    // await WorkoutPlan.deleteMany({ uid: deletedUser.uid });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'ไม่สามารถลบผู้ใช้งานได้' });
  }
});


// PUT: อัปเดตสถิติผู้ใช้ (ใช้เมื่อทำ workout เสร็จ)
app.put('/api/users/:uid/stats', async (req, res) => {
  try {
    const { caloriesToAdd, workoutsToAdd } = req.body;
    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      {
        $inc: {
          caloriesBurned: caloriesToAdd || 0,
          workoutsDone: workoutsToAdd || 0
        }
      },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.put('/api/users/:uid/workoutPlan', async (req, res) => {
  const { workoutPlanId } = req.body;
  const user = await User.findOneAndUpdate(
    { uid: req.params.uid },
    { workoutPlanId },
    { new: true }
  );
  res.json(user);
});

// --- สิ้นสุดส่วน User Schema และ Routes ---

// แก้ไข Exercise Schema ให้สอดคล้องกัน
const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  // Legacy fields (kept for backward compatibility)
  imageUrl: { type: String },
  videoUrl: { type: String, default: null },
  image: { type: String },
  video: { type: String }, // ✅ Added missing field to ensure MongoDB saves it
  audioUrl: { type: String, default: null }, // 🔊 Pre-recorded TTS audio

  // New nested fields
  media: {
    imageUrl: { type: String },
    videoUrl: { type: String },
    audioUrl: { type: String }
  },
  met: {
    base: { type: Number, default: 5.0 },
    min: { type: Number, default: 4.0 },
    max: { type: Number, default: 6.0 },
    source: { type: String, default: "Compendium of Physical Activities" },
    mappedFrom: { type: String, default: "Weight training (general)" }
  },

  type: { type: String, enum: ['reps', 'time'], required: true },
  duration: { type: Number }, // for time-based exercises (in seconds)
  time: { type: Number }, // alternative field for time
  minutes: { type: Number }, // alternative field for minutes
  reps: { type: Number }, // target reps for rep-based exercises
  muscles: [{ type: String }],
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  equipment: [{ type: String }],
  instructions: [{ type: String }],
  tips: [{ type: String }] // ✅ reverted to array of strings
}, { timestamps: true });

const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes for Exercises

// GET - ดึงข้อมูล Exercise ทั้งหมด
app.get('/api/exercises', async (req, res) => {
  try {
    const exercises = await Exercise.find({});
    res.json(exercises);

  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลท่าออกกำลังกายได้' });
  }
});

// GET - ดึงข้อมูล Exercise ตาม _id
app.get('/api/exercises/:id', async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ message: 'ไม่พบข้อมูล Exercise ที่ระบุ' });
    }
    res.json(exercise);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// ตัวอย่าง Express
app.post("/api/exercises/byIds", async (req, res) => {
  try {
    const { ids } = req.body;
    const exercises = await Exercise.find({ _id: { $in: ids } });
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// แก้ไข POST - เพิ่มข้อมูลใหม่พร้อมอัปโหลดไฟล์
app.post('/api/exercises', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, type, description, duration, reps, muscles } = req.body;

    let imageUrl = null;
    let videoUrl = null;
    let imagePath = null;
    let videoPath = null;

    // ตรวจสอบไฟล์รูปภาพ
    if (req.files && req.files.image && req.files.image[0]) {
      imagePath = req.files.image[0].path; // path เต็ม
      imageUrl = `/uploads/${req.files.image[0].filename}`; // URL สำหรับเข้าถึง
    }

    // ตรวจสอบไฟล์วิดีโอ
    if (req.files && req.files.video && req.files.video[0]) {
      videoPath = req.files.video[0].path; // path เต็ม
      videoUrl = `/uploads/${req.files.video[0].filename}`; // URL สำหรับเข้าถึง
    }

    // Parse MET string if exists
    let parsedMet = {
      base: 5.0, min: 4.0, max: 6.0,
      source: "Compendium of Physical Activities", mappedFrom: "Weight training (general)"
    };
    if (req.body.met) {
      try { parsedMet = JSON.parse(req.body.met); } catch (e) { }
    }

    // สร้าง Exercise ใหม่
    const exercise = new Exercise({
      name,
      type,
      description,
      tips: req.body.tips ? (Array.isArray(req.body.tips) ? req.body.tips : (typeof req.body.tips === 'string' && req.body.tips.startsWith('[') ? JSON.parse(req.body.tips) : [req.body.tips])) : [],
      duration: duration ? Number(duration) : undefined,
      reps: reps ? Number(reps) : undefined,
      muscles: muscles ? (Array.isArray(muscles) ? muscles : JSON.parse(muscles)) : [],
      difficulty: req.body.difficulty || "beginner",
      met: parsedMet,
      media: {
        imageUrl: imageUrl,
        videoUrl: videoUrl
      },
      // Legacy
      image: imagePath,
      imageUrl: imageUrl,
      videoUrl: videoUrl
    });

    const newExercise = await exercise.save();
    res.status(201).json(newExercise);

  } catch (err) {
    console.error('Error creating exercise:', err);
    res.status(400).json({ message: err.message });
  }
});

// แก้ไข PUT - อัพเดทข้อมูลพร้อมอัปโหลดไฟล์
app.put('/api/exercises/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, type, description, duration, reps, muscles } = req.body;

    // หาข้อมูลเดิม
    const existing = await Exercise.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลการฝึก' });
    }

    let parsedMet = existing.met;
    if (req.body.met) {
      try { parsedMet = JSON.parse(req.body.met); } catch (e) { }
    }

    const updateData = {
      name: name ?? existing.name,
      type: type ?? existing.type,
      description: description ?? existing.description,
      duration: (duration !== undefined ? Number(duration) : existing.duration),
      reps: (reps !== undefined ? Number(reps) : existing.reps),
      muscles: muscles ? (Array.isArray(muscles) ? muscles : JSON.parse(muscles)) : existing.muscles,
      difficulty: req.body.difficulty ?? existing.difficulty,
      tips: req.body.tips !== undefined ? (Array.isArray(req.body.tips) ? req.body.tips : (typeof req.body.tips === 'string' && req.body.tips.startsWith('[') ? JSON.parse(req.body.tips) : [req.body.tips])) : existing.tips,
      met: parsedMet
    };

    // Prepare media object fallback by creating a fresh object to prevent Mongoose reference caching
    updateData.media = {
      imageUrl: existing.media?.imageUrl || existing.imageUrl || existing.image,
      videoUrl: existing.media?.videoUrl || existing.videoUrl || existing.video,
      audioUrl: existing.media?.audioUrl || existing.audioUrl || null
    };
    updateData.audioUrl = existing.audioUrl || null;

    // อัพเดทรูปภาพหากมีการอัปโหลดใหม่
    if (req.files && req.files.image && req.files.image[0]) {
      updateData.image = req.files.image[0].path;
      const newImageUrl = `/uploads/${req.files.image[0].filename}`;
      updateData.imageUrl = newImageUrl;
      updateData.media.imageUrl = newImageUrl;

      if (existing.image && fs.existsSync(existing.image)) {
        try { fs.unlinkSync(existing.image); } catch (e) { console.error("[Admin-Edit] Image unlink error:", e); }
      }
    }

    // อัพเดทวิดีโอหากมีการอัปโหลดใหม่
    if (req.files && req.files.video && req.files.video[0]) {
      console.log("[Admin-Edit] Processing new video:", req.files.video[0].filename);
      updateData.video = req.files.video[0].path;
      const newVideoUrl = `/uploads/${req.files.video[0].filename}`;
      updateData.videoUrl = newVideoUrl;
      updateData.media.videoUrl = newVideoUrl;

      if (existing.video && fs.existsSync(existing.video)) {
        try { fs.unlinkSync(existing.video); } catch (e) { console.error("[Admin-Edit] Video unlink error:", e); }
      }
    }

    // อัพเดทไฟล์เสียงหากมีการอัปโหลดใหม่
    if (req.files && req.files.audio && req.files.audio[0]) {
      console.log("[Admin-Edit] Processing new audio:", req.files.audio[0].filename);
      const newAudioUrl = `/uploads/${req.files.audio[0].filename}`;
      updateData.audioUrl = newAudioUrl;
      updateData.media.audioUrl = newAudioUrl;

      // ลบไฟล์เสียงเดิม
      const oldAudioPath = existing.audioUrl ? path.join('.', existing.audioUrl) : null;
      if (oldAudioPath && fs.existsSync(oldAudioPath)) {
        try { fs.unlinkSync(oldAudioPath); } catch (e) { console.error("[Admin-Edit] Audio unlink error:", e); }
      }
    }

    console.log("[Admin-Edit] Final updateData object:", JSON.stringify(updateData, null, 2));
    const exercise = await Exercise.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (exercise) {
      console.log("[Admin-Edit] DB update successful. New videoUrl in DB:", exercise.videoUrl);
    } else {
      console.error("[Admin-Edit] findByIdAndUpdate failed (returned null)!");
    }

    res.json(exercise);

  } catch (err) {
    console.error('Error updating exercise:', err);
    res.status(400).json({ message: err.message });
  }
});

// แก้ไข DELETE - ลบข้อมูลพร้อมไฟล์
app.delete('/api/exercises/:id', async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลการฝึก' });
    }

    // ลบไฟล์จริงออกจาก server
    if (exercise.image && fs.existsSync(exercise.image)) {
      fs.unlinkSync(exercise.image);
    }
    if (exercise.video && fs.existsSync(exercise.video)) {
      fs.unlinkSync(exercise.video);
    }

    await Exercise.findByIdAndDelete(req.params.id);
    res.json({ message: 'ลบข้อมูลเรียบร้อย' });

  } catch (err) {
    console.error('Error deleting exercise:', err);
    res.status(500).json({ message: err.message });
  }
});

// WorkoutProgram Schema และ Routes (ไม่เปลี่ยนแปลง)
const workoutProgramSchema = new Schema({
  name: String,
  description: String,
  duration: String,
  caloriesBurned: Number,
  image: String,
  category: {
    type: String,
    enum: [
      'ความแข็งแรง', 'คาร์ดิโอ', 'ความยืดหยุ่น', 'HIIT',
      'โปรแกรมช่วงบน', 'โปรแกรมช่วงล่าง', 'โปรแกรมหน้าท้อง',
      'ลดไขมัน', 'เพิ่มกล้าม', 'กระชับก้น & ขา'
    ],
    default: 'ความแข็งแรง'
  },
  difficultyLevel: {
    type: Number,
    default: 1
  },
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
      exercise: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise", required: true },
      sets: { type: Number, default: 3 },
      reps: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
      rest: { type: Number, default: 30 },
      weight: { type: String, default: "Bodyweight" },
      met: { type: Number, default: 0 }
    }
  ]
});

const WorkoutProgram = mongoose.model('WorkoutProgram', workoutProgramSchema, 'program');

// ================== ProgramFeedback (Schema + Model) ================= //
const programFeedbackSchema = new mongoose.Schema({
  uid: String,
  programId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkoutProgram" },
  level: { type: String, enum: ['easy', 'medium', 'hard'], required: true }
}, { timestamps: true });
const ProgramFeedback = mongoose.model("ProgramFeedback", programFeedbackSchema, "program_feedbacks");


// WorkoutProgram Routes
app.get('/api/workout_programs', async (req, res) => {
  try {
    const { category } = req.query;
    let filter = {};
    if (category && category !== 'ทั้งหมด') filter.category = category;
    const programs = await WorkoutProgram.find(filter).populate('workoutList.exercise').lean();

    // Normalize Data
    const formattedPrograms = programs.map(p => ({
      ...p,
      workoutList: p.workoutList.map(item => ({
        _id: item.exercise?._id,
        name: item.exercise?.name,
        image: item.exercise?.image,
        imageUrl: item.exercise?.imageUrl,
        type: item.exercise?.type,
        value: item.exercise?.value,
        muscles: item.exercise?.muscles, // ✅ Ensure muscles is passed to frontend
        sets: item.sets,
        reps: item.reps,
        duration: item.duration,
        rest: item.rest
      }))
    }));
    res.json(formattedPrograms);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ใน Backend - ปรับ API ให้ populate ข้อมูล exercise
app.get("/api/workout_programs/:id", async (req, res) => {
  try {
    const program = await WorkoutProgram.findById(req.params.id)
      .populate({ path: "workoutList.exercise", select: "name description tips type value time duration image video caloriesBurned muscles audioUrl media met difficulty" })
      .lean();
    if (!program) return res.status(404).json({ message: "Program not found" });

    const workoutList = (program.workoutList || []).map((item, order) => {
      const ex = item.exercise || {};
      const targetValue = ex.value ?? ex.time ?? ex.duration ?? 0;
      return {
        _id: item._id, order, exercise: String(ex._id),
        name: ex.name, type: ex.type, value: Number(targetValue),
        image: (ex.image || "").replace(/\\/g, "/"),
        video: (ex.video || "").replace(/\\/g, "/"),
        description: ex.description, tips: ex.tips, caloriesBurned: ex.caloriesBurned,
        muscles: ex.muscles, // ✅ Ensure muscles is passed to frontend
        audioUrl: ex.audioUrl || null, // 🔊 Pre-recorded audio
        media: ex.media || null,       // 🔊 media.audioUrl fallback
        sets: item.sets,
        reps: item.reps,
        duration: item.duration,
        rest: item.rest
      };
    });
    const image = (program.image || "").replace(/\\/g, "/");
    res.json({ ...program, image, workoutList });
  } catch (err) { res.status(500).json({ message: "Server error" }); }
});
app.post('/api/workout_programs', upload.single('image'), async (req, res) => {
  try {
    const categoryMap = {
      'upper-body': 'โปรแกรมช่วงบน',
      'lower-body': 'โปรแกรมช่วงล่าง',
      'core': 'โปรแกรมหน้าท้อง',
      'fat-loss': 'ลดไขมัน',
      'muscle-gain': 'เพิ่มกล้าม',
      'booty-legs': 'กระชับก้น & ขา'
    };

    let reqCategory = req.body.category || 'โปรแกรมช่วงบน';
    if (categoryMap[reqCategory.toLowerCase()]) {
      reqCategory = categoryMap[reqCategory.toLowerCase()];
    }

    const newProgram = new WorkoutProgram({
      name: req.body.name,
      description: req.body.description,
      duration: req.body.duration,
      caloriesBurned: req.body.caloriesBurned,
      category: reqCategory, // เพิ่ม category field
      image: req.file ? `/uploads/${req.file.filename}` : '', // แก้ไขให้ใช้ URL
      workoutList: (() => {
        if (!req.body.workoutList) return [];
        let dataStr = typeof req.body.workoutList === 'string' ? req.body.workoutList.trim() : JSON.stringify(req.body.workoutList);
        if (dataStr.startsWith('exercises:')) {
          dataStr = dataStr.replace(/^exercises:\s*/, '').trim();
        }
        try {
          const parsed = JSON.parse(dataStr);
          // หากส่งมาเป็น { "exercises": [...] } (แบบตัวอย่างล่าสุด) ให้ดึง array ข้างในออกมา
          if (parsed && Array.isArray(parsed.exercises)) {
            return parsed.exercises;
          }
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error("Error parsing workoutList:", e);
          return [];
        }
      })()
    });

    const savedProgram = await newProgram.save();
    res.status(201).json(savedProgram);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/workout_programs/:id/add-workout', async (req, res) => {
  try {
    const programId = req.params.id;
    const newWorkout = req.body.workout;

    const updatedProgram = await WorkoutProgram.findByIdAndUpdate(
      programId,
      { $push: { workoutList: newWorkout } },
      { new: true }
    ).populate({
      path: 'workoutList.exercise',
      select: 'name image imageUrl type value'
    });

    res.json(updatedProgram);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/workout_programs/:id', upload.single('image'), async (req, res) => {
  try {
    const categoryMap = {
      'upper-body': 'โปรแกรมช่วงบน',
      'lower-body': 'โปรแกรมช่วงล่าง',
      'core': 'โปรแกรมหน้าท้อง',
      'fat-loss': 'ลดไขมัน',
      'muscle-gain': 'เพิ่มกล้าม',
      'booty-legs': 'กระชับก้น & ขา'
    };

    // Fetch existing program first so we can preserve fields not sent in this request
    const existing = await WorkoutProgram.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Workout program not found' });

    let reqCategory = req.body.category || existing.category || 'โปรแกรมช่วงบน';
    if (categoryMap[reqCategory.toLowerCase()]) {
      reqCategory = categoryMap[reqCategory.toLowerCase()];
    }

    // Parse workoutList if sent, otherwise keep existing
    let parsedWorkoutList = existing.workoutList;
    if (req.body.workoutList !== undefined) {
      let dataStr = typeof req.body.workoutList === 'string'
        ? req.body.workoutList.trim()
        : JSON.stringify(req.body.workoutList);
      if (dataStr.startsWith('exercises:')) {
        dataStr = dataStr.replace(/^exercises:\s*/, '').trim();
      }
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed && Array.isArray(parsed.exercises)) {
          parsedWorkoutList = parsed.exercises;
        } else {
          parsedWorkoutList = Array.isArray(parsed) ? parsed : existing.workoutList;
        }
      } catch (e) {
        console.error("Error parsing workoutList in PUT:", e);
        parsedWorkoutList = existing.workoutList; // preserve on parse error
      }
    }

    const updatedData = {
      name: req.body.name || existing.name,
      description: req.body.description !== undefined ? req.body.description : existing.description,
      duration: req.body.duration || existing.duration,
      caloriesBurned: req.body.caloriesBurned !== undefined ? req.body.caloriesBurned : existing.caloriesBurned,
      category: reqCategory,
      // Only update image if a new file was uploaded; otherwise preserve existing
      image: req.file ? `/uploads/${req.file.filename}` : existing.image,
      workoutList: parsedWorkoutList,
    };

    const updatedProgram = await WorkoutProgram.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    );

    if (!updatedProgram) {
      return res.status(404).json({ error: 'Workout program not found' });
    }

    res.json(updatedProgram);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// API endpoint สำหรับดึงรายการหมวดหมู่ทั้งหมด
app.get('/api/categories', async (req, res) => {
  try {
    const categories = ['ทั้งหมด', 'ความแข็งแรง', 'คาร์ดิโอ', 'ความยืดหยุ่น', 'HIIT'];
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint สำหรับอัปเดต category ของโปรแกรมที่มีอยู่
app.patch('/api/workout_programs/:id/category', async (req, res) => {
  try {
    const { category } = req.body;

    if (!['ความแข็งแรง', 'คาร์ดิโอ', 'ความยืดหยุ่น', 'HIIT'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const updatedProgram = await WorkoutProgram.findByIdAndUpdate(
      req.params.id,
      { category },
      { new: true, runValidators: true }
    );

    if (!updatedProgram) {
      return res.status(404).json({ error: 'Workout program not found' });
    }

    res.json(updatedProgram);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/workout_programs/:id', async (req, res) => {
  try {
    const program = await WorkoutProgram.findByIdAndDelete(req.params.id);
    if (!program) {
      return res.status(404).json({ error: 'Workout program not found' });
    }
    res.json({ message: 'ลบโปรแกรมเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== Workout History (replaces "Recent") ==================
// ================== Histories (collection: histories) ==================
const historySchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true },
  sessionId: { type: String, index: true }, // ✅ เพิ่ม field sessionId เพื่อใช้เชื่อมโยงตอน update feedback
  programId: { type: String },
  programName: { type: String, default: "" },
  totalSeconds: { type: Number, default: 0 },
  caloriesBurned: { type: Number, default: 0 },
  feedbackLevel: { type: String, default: "" },
  feedback: { type: String, default: "" }, // ✅ Added per user request
  weight: { type: Number, default: null }, // ✅ เพิ่ม field น้ำหนัก
  totalExercises: { type: Number, default: 0 },
  finishedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const History = mongoose.models.History || mongoose.model("History", historySchema, "histories");

// 🆕 DailyHistory Collection (แยกส่วนรายวันตาม User Request)
const DailyHistory = mongoose.models.DailyHistory || mongoose.model("DailyHistory", historySchema, "daily_histories");


// ================== CRUD API ==================

// Create

app.get('/api/workout-plans/templates/:level', async (req, res) => {
  try {
    const { level } = req.params;

    // ตัวอย่างแผนการออกกำลังกายสำหรับแต่ละระดับ
    const templatePlans = {
      beginner: [
        {
          _id: "template_beginner_1",
          name: "แผนเริ่มต้นสำหรับมือใหม่",
          level: "beginner",
          description: "แผนการออกกำลังกายที่เหมาะสำหรับผู้เริ่มต้น",
          plans: [
            {
              day: "sunday",
              exercises: []
            },
            {
              day: "monday",
              exercises: [
                {
                  exercise: "687605170f6991e1457e6727", // Push-ups
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605360f6991e1457e6728", // Squats
                  performed: { reps: 0 }
                },
                {
                  exercise: "687602db0f6991e1457e6722", // Plank
                  performed: { seconds: 0 }
                }
              ]
            },
            {
              day: "tuesday",
              exercises: []
            },
            {
              day: "wednesday",
              exercises: [
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "thursday",
              exercises: []
            },
            {
              day: "friday",
              exercises: [
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687602db0f6991e1457e6722",
                  performed: { seconds: 0 }
                }
              ]
            },
            {
              day: "saturday",
              exercises: []
            }
          ]
        }
      ],
      normal: [
        {
          _id: "template_normal_1",
          name: "แผนกลางสำหรับระดับปานกลาง",
          level: "normal",
          description: "แผนการออกกำลังกายระดับกลางที่เน้นความสมดุล",
          plans: [
            {
              day: "sunday",
              exercises: []
            },
            {
              day: "monday",
              exercises: [
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604fa0f6991e1457e6726",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687602db0f6991e1457e6722",
                  performed: { seconds: 0 }
                }
              ]
            },
            {
              day: "tuesday",
              exercises: [
                {
                  exercise: "687605170f6991e1457e6727",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605360f6991e1457e6728",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "wednesday",
              exercises: []
            },
            {
              day: "thursday",
              exercises: [
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687602db0f6991e1457e6722",
                  performed: { seconds: 0 }
                }
              ]
            },
            {
              day: "friday",
              exercises: [
                {
                  exercise: "687604fa0f6991e1457e6726",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605170f6991e1457e6727",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "saturday",
              exercises: []
            }
          ]
        }
      ],
      professional: [
        {
          _id: "template_professional_1",
          name: "แผนสำหรับระดับสูง",
          level: "professional",
          description: "แผนการออกกำลังกายที่ท้าทายสำหรับผู้มีประสบการณ์",
          plans: [
            {
              day: "sunday",
              exercises: [
                {
                  exercise: "687602db0f6991e1457e6722", // Active recovery
                  performed: { seconds: 0 }
                }
              ]
            },
            {
              day: "monday",
              exercises: [
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604fa0f6991e1457e6726",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605170f6991e1457e6727",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687602db0f6991e1457e6722",
                  performed: { seconds: 0 }
                }
              ]
            },
            {
              day: "tuesday",
              exercises: [
                {
                  exercise: "687605360f6991e1457e6728",
                  performed: { reps: 0 }
                },
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "wednesday",
              exercises: [
                {
                  exercise: "687602db0f6991e1457e6722",
                  performed: { seconds: 0 }
                },
                {
                  exercise: "687604fa0f6991e1457e6726",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "thursday",
              exercises: [
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605170f6991e1457e6727",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605360f6991e1457e6728",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "friday",
              exercises: [
                {
                  exercise: "687604fa0f6991e1457e6726",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687602db0f6991e1457e6722",
                  performed: { seconds: 0 }
                },
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "saturday",
              exercises: [
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605170f6991e1457e6727",
                  performed: { reps: 0 }
                }
              ]
            }
          ]
        }
      ]
    };

    const plans = templatePlans[level] || [];
    res.json(plans);

  } catch (error) {
    console.error('Error fetching workout plan templates:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงแผนการออกกำลังกายได้' });
  }
});
// --- WorkoutPlan Schema (UPDATED) ---
const workoutPlanSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  plans: [{
    day: { type: String, required: true },
    exercises: [{
      exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
      performed: {
        reps: { type: Number, default: 0 },
        seconds: { type: Number, default: 0 }
      }
    }]
  }]
}, { timestamps: true });
const WorkoutPlan = mongoose.model('WorkoutPlan', workoutPlanSchema);
// ================== Submit Feedback ==================

// ================== Adaptive Difficulty Logic ==================
function adjustDifficulty(program) {
  // รองรับทั้ง schema เดิมและที่ให้มาใหม่
  const stats = program.DataFeedback || program.feedbackStats || { easy: 0, medium: 0, hard: 0 };
  const { easy, medium, hard } = stats;
  const total = (easy || 0) + (medium || 0) + (hard || 0);

  if (total < 10) return program.difficultyLevel || 1; // data ยังน้อย

  const easyRate = easy / total;
  const hardRate = hard / total;
  const currentDiff = program.difficultyLevel || 1;

  if (easyRate > 0.6) return currentDiff + 1;
  if (hardRate > 0.4) return Math.max(1, currentDiff - 1);

  return currentDiff;
}

app.patch("/api/workout_programs/:id/feedback", async (req, res) => {
  try {
    const { id } = req.params;
    const { level, uid } = req.body;
    console.log(`📝 Received Feedback: ID=${id}, Level=${level}, UID=${uid}`);

    if (!['easy', 'medium', 'hard'].includes(level)) {
      return res.status(400).json({ error: "Invalid level" });
    }

    if (id === "dailyplan") {
      console.log("ℹ️ Daily Plan Feedback (Skipping DB Update)");
      return res.json({ ok: true, msg: "Feedback received for daily plan (Transient)" });
    }

    // 💡 ป้องกันสแปม: 1 คนโหวตแต่ละระดับความยาก (easy, medium, hard) ได้ระดับละ 1 ครั้งต่อโปรแกรม
    if (uid) {
      const ProgramFeedback = mongoose.model("ProgramFeedback");
      // เช็กว่าเคยโหวต "เลเวลนี้" ให้โปรแกรมนี้ไปหรือยัง (เปลี่ยนใจไปโหวตเลเวลอื่นได้)
      const existingFeedback = await ProgramFeedback.findOne({ uid, programId: id, level });
      if (existingFeedback) {
        console.log(`⚠️ Spam prevented: User ${uid} already gave '${level}' feedback to program ${id}`);
        // ถือว่าสำเร็จแต่ไม่เอาไปบวกเพิ่ม (Idempotent) เพื่อไม่ให้ Frontend พัง
        return res.json({ ok: true, msg: "Already submitted this feedback level" });
      }

      // บันทึกไว้ว่าคนนี้โหวตโปรแกรมนี้ไปแล้ว
      await ProgramFeedback.create({ uid, programId: id, level });
    }

    const incField = `DataFeedback.${level}`;
    let updated = await WorkoutProgram.findByIdAndUpdate(
      id,
      { $inc: { [incField]: 1 } },
      { new: true, upsert: false } // upsert: false เพราะต้องมี program อยู่แล้ว
    );

    if (!updated) return res.status(404).json({ error: "Workout program not found" });

    // ✅ Adaptive Logic Trigger
    const newDifficulty = adjustDifficulty(updated);
    if (newDifficulty !== (updated.difficultyLevel || 1)) {
      const oldDiff = updated.difficultyLevel || 1;
      const isLevelUp = newDifficulty > oldDiff;
      console.log(`🚀 Program ${id} difficulty automatically adjusted: ${oldDiff} -> ${newDifficulty}`);

      // ปรับแก้ reps / duration อัตโนมัติ
      const newWorkoutList = updated.workoutList.map(item => {
        // แปลงให้อยู่ในรูป Object ธรรมดาเพื่อเซฟกลับ
        const obj = item.toObject ? item.toObject() : item;
        let r = obj.reps || 0;
        let d = obj.duration || 0;
        let m = obj.met || 0;

        if (isLevelUp) {
          if (r > 0) r += 3;
          if (d > 0) d += 10;
          if (m > 0) m = Number((m + 0.5).toFixed(1)); // อัปเลเวลเพิ่ม MET 0.5
        } else {
          if (r > 0) r = Math.max(1, r - 2); // จำนวนครั้งห้ามต่ำกว่า 1
          if (d > 0) d = Math.max(5, d - 5); // เวลาห้ามต่ำกว่า 5 วินาที
          if (m > 0) m = Math.max(1.0, Number((m - 0.5).toFixed(1))); // ลด MET 0.5 ต่ำสุดคือ 1.0
        }

        return { ...obj, reps: r, duration: d, met: m };
      });

      updated = await WorkoutProgram.findByIdAndUpdate(id, {
        $set: {
          difficultyLevel: newDifficulty,
          workoutList: newWorkoutList,
          // ✅ เมื่อปรับเลเวลแล้ว ให้รีเซ็ตค่า Feedback เพื่อเริ่มเก็บใหม่สำหรับเลเวลใหม่
          DataFeedback: { easy: 0, medium: 0, hard: 0 }
        },
        $push: {
          adaptiveHistory: {
            date: new Date(),
            difficultyLevel: newDifficulty,
            reason: `Feedback triggered adjustment (Level ${oldDiff} -> ${newDifficulty})`
          }
        }
      }, { new: true });
      try {
        const ProgramFeedback = mongoose.model("ProgramFeedback");
        await ProgramFeedback.deleteMany({ programId: id });
      } catch (cleanErr) {
      }
    }

    console.log("✅ Feedback Updated:", updated.DataFeedback);
    res.json({ ok: true, DataFeedback: updated.DataFeedback, difficultyLevel: updated.difficultyLevel });
  } catch (err) {
    console.error("❌ Feedback Error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ================== Stats Dashboard Endpoint ==================
app.get("/api/stats/dashboard/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    // 1. Fetch User Data for Summary Stats (Total Calories, Goal) - workoutsDone removed
    const user = await User.findOne({ uid }).lean();

    // Default values if user fields are missing
    const totalCalories = user?.caloriesBurned || 0;
    const weeklyGoal = user?.weeklyGoal || 3;

    // 2. Fetch history for Weekly Progress & Heatmap (sorted by date)
    // ✅ Merge both History and DailyHistory for full stats
    const [historiesStandard, historiesDaily] = await Promise.all([
      History.find({ uid }).lean(),
      DailyHistory.find({ uid }).lean()
    ]);
    const histories = [...historiesStandard, ...historiesDaily].sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt));

    // ✅ Count workouts directly from history as requested
    const totalWorkouts = histories.length;

    // 3. Weekly Progress Calculation
    const now = new Date();
    // Get start of week (Monday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weeklyWorkouts = histories.filter(h => {
      const d = new Date(h.finishedAt);
      return d >= startOfWeek && d <= endOfWeek;
    });

    const workoutsDoneThisWeek = weeklyWorkouts.length;

    // Map workouts to day of week (0-6, Mon-Sun)
    const weeklyWorkoutDays = weeklyWorkouts.map(h => {
      const d = new Date(h.finishedAt).getDay();
      return d === 0 ? 6 : d - 1;
    });

    // 4. Heatmap Data
    const heatmapMap = {};
    histories.forEach(h => {
      const d = new Date(h.finishedAt);
      const dateStr = d.toISOString().split('T')[0];
      heatmapMap[dateStr] = (heatmapMap[dateStr] || 0) + 1;
    });

    const heatmap = Object.keys(heatmapMap).map(date => ({
      date,
      count: heatmapMap[date],
      intensity: heatmapMap[date] >= 2 ? 2 : 1
    }));

    res.json({
      summary: {
        totalWorkouts, // From User collection
        totalCalories, // From User collection
        weeklyGoal     // From User collection
      },
      weekly: {
        total: workoutsDoneThisWeek,
        goal: weeklyGoal,
        percent: Math.min((workoutsDoneThisWeek / weeklyGoal) * 100, 100),
        days: weeklyWorkoutDays,
        remainingDays: 7 - ((now.getDay() === 0 ? 7 : now.getDay()))
      },
      heatmap
    });

  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== Workout History (CRUD) ==================
app.patch("/api/histories/:sessionId/feedback", async (req, res) => {
  const { sessionId } = req.params;
  const { feedback, weight } = req.body; // Expect 'feedback' and 'weight'

  console.log(`� [Feedback] Session: ${sessionId}, Feedback: ${feedback}, Weight: ${weight}`);

  const updateFields = {};
  if (feedback) updateFields.feedback = feedback;

  // ✅ Validate Weight: Must be a positive integer only (No decimals, No negatives)
  if (weight !== undefined && weight !== null && weight !== "") {
    const numWeight = Number(weight);
    if (Number.isInteger(numWeight) && numWeight > 0) {
      updateFields.weight = numWeight;
    } else {
      console.log(`⚠️ Invalid weight received: ${weight} (Must be positive integer)`);
    }
  }

  // Also update feedbackLevel for backward compatibility if needed, or just leave it.
  // The user requested 'feedback', so we focus on that.

  try {
    const updated = await History.findOneAndUpdate(
      { sessionId },
      { $set: updateFields },
      { new: true }
    );

    // 2. ✅ Adaptive Fitness Level Logic
    if (feedback && (feedback === 'easy' || feedback === 'hard')) {
      try {
        const lastHistories = await History.find({ uid: updated.uid })
          .sort({ finishedAt: -1 })
          .limit(10);

        const user = await User.findOne({ uid: updated.uid });
        if (user) {
          let currentLevel = 1; // Default
          if (user.fitnessLevel === 'Intermediate') currentLevel = 2;
          if (user.fitnessLevel === 'Advanced') currentLevel = 3;

          const recentFeedbacks = lastHistories.map(h => h.feedback).filter(Boolean);

          let newLevel = currentLevel;

          // Logic: Easy 3 ครั้งล่าสุด -> Upgrade
          const last3 = recentFeedbacks.slice(0, 3);
          if (last3.length === 3 && last3.every(f => f === 'easy') && currentLevel < 3) {
            newLevel++;
            console.log(`🚀 Upgrading user ${user.uid} to level ${newLevel}`);
          }

          // Logic: Hard 2 ครั้งล่าสุด -> Downgrade
          const last2 = recentFeedbacks.slice(0, 2);
          if (last2.length === 2 && last2.every(f => f === 'hard') && currentLevel > 1) {
            newLevel--;
            console.log(`📉 Downgrading user ${user.uid} to level ${newLevel}`);
          }

          if (newLevel !== currentLevel) {
            const levelNames = ['Beginner', 'Intermediate', 'Advanced'];
            await User.findOneAndUpdate(
              { uid: user.uid },
              { fitnessLevel: levelNames[newLevel - 1] }
            );

            // ✅ เปลี่ยนแผนทันทีเพื่อให้ Daily Plan อัปเดตความยาก
            console.log(`✨ Re-generating plan for user ${user.uid} due to level shift`);
            await generateWorkoutPlanInternal(user.uid);
          }
        }
      } catch (adaptErr) {
        console.error("❌ Adaptive Level Error:", adaptErr);
      }
    }

    res.json(updated);
  } catch (err) {
    console.error("❌ History Feedback Error:", err);
    res.status(500).json({ error: err.message });
  }
});
// --- API สำหรับทดสอบ Adaptive Logic (Simulation) ---
app.post("/api/workout_sessions/finish_debug", async (req, res) => {
  try {
    const { uid, feedback, programId = "dailyplan", duration = 300 } = req.body;
    if (!uid || !feedback) return res.status(400).json({ error: "uid and feedback required" });

    // สร้างประวัติปลอม
    const historyEntry = await History.create({
      uid,
      sessionId: `debug_${Date.now()}`,
      programId,
      programName: "Simulation Run",
      calories: 10 + Math.random() * 20,
      secondsUsed: duration,
      finishedAt: new Date(),
      feedback: feedback,
      status: 'completed'
    });

    // เรียก Adaptive Logic (ลอกมาจาก API หน้าหลัก)
    const user = await User.findOne({ uid });
    if (user) {
      const [hStandard, hDaily] = await Promise.all([
        History.find({ uid }).sort({ finishedAt: -1 }).limit(10).lean(),
        DailyHistory.find({ uid }).sort({ finishedAt: -1 }).limit(10).lean()
      ]);
      const lastHistories = [...hStandard, ...hDaily]
        .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))
        .slice(0, 10);
      let currentLevel = 1;
      if (user.fitnessLevel === 'Intermediate') currentLevel = 2;
      if (user.fitnessLevel === 'Advanced') currentLevel = 3;

      const recentFeedbacks = lastHistories.map(h => h.feedback).filter(Boolean);
      let newLevel = currentLevel;
      const last3 = recentFeedbacks.slice(0, 3);
      if (last3.length === 3 && last3.every(f => f === 'easy') && currentLevel < 3) newLevel++;
      const last2 = recentFeedbacks.slice(0, 2);
      if (last2.length === 2 && last2.every(f => f === 'hard') && currentLevel > 1) newLevel--;

      if (newLevel !== currentLevel) {
        const levelNames = ['Beginner', 'Intermediate', 'Advanced'];
        await User.findOneAndUpdate({ uid }, { fitnessLevel: levelNames[newLevel - 1] });
        await generateWorkoutPlanInternal(uid);
        console.log(`Debug Level Shift: ${user.fitnessLevel} -> ${levelNames[newLevel - 1]}`);
      }
    }

    // ดึงค่าล่าสุดมาตอบกลับ
    const updatedUser = await User.findOne({ uid });
    res.json({
      message: "Simulation success",
      newLevelInDb: updatedUser?.fitnessLevel,
      currentLevelLabel: updatedUser?.fitnessLevel === 'Beginner' ? 'ผู้เริ่มต้น' : (updatedUser?.fitnessLevel === 'Intermediate' ? 'ปานกลาง' : 'ขั้นสูง')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE: บันทึกประวัติ (default 0 ได้เลย)
app.post("/api/histories", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.sessionId) return res.status(400).json({ error: "sessionId required" });

    const doc = await History.findOneAndUpdate(
      { sessionId: body.sessionId },
      { $setOnInsert: body },
      { upsert: true, new: true }
    );

    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get("/api/histories/latest/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const latest = await History.findOne({ uid }).sort({ finishedAt: -1, createdAt: -1 }).lean();
    if (!latest) return res.status(404).json({ error: "no history" });
    console.log("🔍 [DEBUG] Latest History Fetch:", latest);
    res.json(latest);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// READ ALL: (admin ใช้ดูทั้งหมด)
app.get("/api/histories", async (_req, res) => {
  try {
    const items = await History.find({}).sort({ finishedAt: -1, createdAt: -1 }).lean();
    return res.json(items);
  } catch (err) {
    console.error("[histories] list error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// READ BY USER: ดูประวัติของผู้ใช้ (รวมจากทั้ง 2 แหล่ง)
app.get("/api/histories/user/:uid", async (req, res) => {
  try {
    const [items1, items2] = await Promise.all([
      History.find({ uid: req.params.uid }).lean(),
      DailyHistory.find({ uid: req.params.uid }).lean()
    ]);
    const items = [...items1, ...items2].sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATE: แก้รายการ history (ถ้าต้องใช้)
app.put("/api/histories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const updated = await History.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(body.programName !== undefined ? { programName: String(body.programName || "") } : {}),
          ...(body.totalSeconds !== undefined ? { totalSeconds: Number(body.totalSeconds || 0) } : {}),
          ...(body.caloriesBurned !== undefined ? { caloriesBurned: Number(body.caloriesBurned || 0) } : {}),
          ...(body.feedbackLevel !== undefined ? { feedbackLevel: String(body.feedbackLevel || "") } : {}),
          ...(body.totalExercises !== undefined ? { totalExercises: Number(body.totalExercises || 0) } : {}),
          ...(body.finishedAt !== undefined ? { finishedAt: new Date(body.finishedAt) } : {}),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "history not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[histories] update error:", err);
    return res.status(400).json({ error: err.message });
  }
});

// DELETE: ลบรายการ history
app.delete("/api/histories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await History.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "history not found" });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[histories] delete error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ================== WorkoutSession (Schema + Model) ==================
const workoutSessionExerciseSchema = new mongoose.Schema({
  exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise", required: true },
  name: { type: String, default: "" },

  // เป้าหมายของท่านั้น (มาจาก exercise.type)
  target: {
    type: { type: String, enum: ["reps", "time"], required: true }, // reps | time
    value: { type: Number, required: true }, // reps = จำนวนครั้ง, time = วินาที (แนะนำให้เก็บเป็นวินาทีให้ชัดเจน)
  },

  order: { type: Number, default: 0 },
}, { _id: false });

const workoutSessionLogSchema = new mongoose.Schema({
  order: Number,
  exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise" },
  name: String,
  target: { type: Object },
  performed: {
    reps: { type: Number, default: 0 },
    seconds: { type: Number, default: 0 },
  },
  status: { type: String, default: "completed" },
  calories: { type: Number, default: 0 }
}, { _id: false });

const workoutSessionSchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true },
  origin: {
    kind: { type: String, default: "program" },
    programId: { type: mongoose.Schema.Types.Mixed } // ✅ ยืดหยุ่นให้รองรับทั้ง ObjectId และ String "dailyplan"
  },
  snapshot: {
    programName: String,
    exercises: []
  },
  logs: [workoutSessionLogSchema],
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null }
}, { timestamps: true });
const WorkoutSession = mongoose.model("WorkoutSession", workoutSessionSchema, "workout_sessions");
// ================== API: Start Session ==================
app.post("/api/workout_sessions/start", async (req, res) => {
  try {
    const { uid, origin, snapshot } = req.body;

    // เงื่อนไขในการค้นหา: User เดิม, Program เดิม, และ "ยังไม่จบ" (finishedAt: null)
    const filter = {
      uid,
      "origin.programId": origin.programId,
      finishedAt: null
    };

    // ข้อมูลที่จะใช้สร้าง ถ้าหาไม่เจอ
    const update = {
      $setOnInsert: { // $setOnInsert ทำงานเฉพาะตอนสร้างใหม่เท่านั้น
        uid,
        origin,
        snapshot,
        logs: [],
        startedAt: new Date()
      }
    };

    // ใช้ findOneAndUpdate พร้อม upsert: true
    // - ถ้าเจอ: จะคืนค่าเดิมกลับมา
    // - ถ้าไม่เจอ: จะสร้างใหม่ให้ทันที (Atomic Operation) ป้องกันการชนกัน
    const session = await WorkoutSession.findOneAndUpdate(
      filter,
      update,
      {
        new: true,   // คืนค่า document หลังอัปเดต (หรือสร้างใหม่)
        upsert: true, // ถ้าไม่มีให้สร้างใหม่
        setDefaultsOnInsert: true // ใช้ default value จาก Schema
      }
    );

    console.log(`✅ Session Active: ${session._id} (Is New: ${session.createdAt === session.updatedAt})`);

    return res.status(201).json({ _id: session._id });

  } catch (err) {
    console.error("Start Session Error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ================== API: Log Exercise ==================
app.post("/api/workout_sessions/:id/log-exercise", async (req, res) => {
  try {
    const { id } = req.params;
    const logData = req.body;

    // 1. ดึงค่าออกมาให้ชัดเจน
    const seconds = Math.max(0, Number(logData.performed?.seconds || 0));
    const reps = Math.max(0, Number(logData.performed?.reps || 0));

    // 2. คำนวณแคลอรี่
    //    ถ้า client ส่ง calories มาแล้ว (คำนวณด้วย MET + น้ำหนักจริงของผู้ใช้) → ใช้ค่านั้นเลย
    //    ถ้าไม่มี → fallback ด้วย calculateCalories() บน server (ใช้ค่า default: MET=5, weight=70)
    let calories;
    if (logData.calories !== undefined && logData.calories !== null && Number(logData.calories) > 0) {
      calories = parseFloat(Number(logData.calories).toFixed(2));
      console.log(`🔥 Using client-provided calories: ${calories} kcal`);
    } else {
      // Fallback: MET default 5.0, weight default 70 kg
      calories = calculateCalories(70, 5.0, seconds);
      console.log(`🔥 Fallback server-calculated calories: ${calories} kcal`);
    }

    // 3. สร้าง Object Log ที่ถูกต้องตาม Schema เป๊ะๆ
    const newLog = {
      order: logData.order,
      exerciseId: mongoose.Types.ObjectId.isValid(logData.exerciseId) ? logData.exerciseId : null, // 🛡️ กัน Error 500 ถ้าเป็นรหัสที่ไม่ใช่ ObjectId
      name: logData.name,
      target: logData.target,
      performed: {
        reps: reps,
        seconds: seconds // บันทึกวินาทีที่ถูกต้องแน่นอน
      },
      status: logData.status,
      calories: calories,
      startedAt: logData.startedAt,
      endedAt: logData.endedAt
    };

    console.log(`📝 Logging Order ${logData.order}: ${seconds}s, ${calories} kcal (ID: ${id})`);

    // 4. ลบอันเก่า (ถ้ามี) แล้วเพิ่มอันใหม่
    const updatedSession = await WorkoutSession.findByIdAndUpdate(id, {
      $pull: { logs: { order: logData.order } }
    }, { new: true });

    if (!updatedSession) {
      console.log(`❌ Session not found during log: ${id}`);
      return res.status(404).json({ error: "Session not found" });
    }

    await WorkoutSession.findByIdAndUpdate(id, {
      $push: { logs: newLog }
    });

    res.json({ success: true, calories });
  } catch (err) {
    console.error("Log Error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ================== API: Finish Session ==================
app.patch("/api/workout_sessions/:id/finish", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🏁 Finishing Session ID: ${id}`);

    // 1. ค้นหา Session ก่อน
    const session = await WorkoutSession.findById(id);

    // ✅ FIX: เช็คก่อนเลยว่าเจอไหม ถ้าไม่เจอให้เด้งออกทันที กัน Error
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Debug: ปริ้นท์ Log หลังจากมั่นใจว่า session มีอยู่จริง
    console.log("---- Session Logs Debug ----");
    if (session.logs) {
      session.logs.forEach(l => console.log(`Order ${l.order}: ${l.performed?.seconds}s`));
    }
    console.log("----------------------------");

    // 🔥 FIX: ถ้า Session นี้จบไปแล้ว (มี finishedAt) ให้หยุดเลย ไม่ต้องสร้าง History ซ้ำ
    if (session.finishedAt) {
      console.log("⚠️ Session already finished. Skipping history creation.");
      return res.json({ msg: "Session already finished", sessionId: session._id });
    }

    // 2. ถ้ายังไม่จบ -> อัปเดต finishedAt
    session.finishedAt = new Date();
    await session.save();

    // 3. คำนวณผลรวม (แยก Active และ Rest ตามที่คุณต้องการ)
    const totals = session.logs.reduce((acc, log) => {
      const s = Number(log.performed?.seconds) || 0;
      const c = Number(log.calories) || 0;
      acc.seconds += s;
      acc.activeCalories += c;
      return acc;
    }, { seconds: 0, activeCalories: 0 });

    // --- คำนวณ Rest Calories (MET 1.5) ---
    // activeTime = ผลรวมของวินาทีในท่ายืด/ออกกำลังกาย
    // totalSessionTime = เวลาที่ใช้ทั้งหมดตั้งแต่เริ่มจนจบเซสชัน
    const totalSessionSeconds = (session.finishedAt - session.startedAt) / 1000;
    const restSeconds = Math.max(0, totalSessionSeconds - totals.seconds);

    // ดึงน้ำหนักผู้ใช้ (Fallback 70kg)
    const user = await mongoose.model('User').findOne({ uid: session.uid });
    const weight = user?.weight || 70;

    // สูตร: calories = (MET * 3.5 * weight) / 200 * durationMinutes
    const restCalories = (1.5 * 3.5 * weight) / 200 * (restSeconds / 60);

    totals.calories = Math.ceil(totals.activeCalories + restCalories);
    totals.restSeconds = Math.round(restSeconds);

    console.log(`∑ Totals: Active=${totals.seconds}s, Rest=${totals.restSeconds}s, ActiveCal=${totals.activeCalories.toFixed(2)}, RestCal=${restCalories.toFixed(2)}, Final=${totals.calories}kcal`);

    // [Production Guard] ถ้าออกกำลังกายไม่ถึง 60 วินาที จะไม่บันทึกประวัติ และทำการลบ session ออกไปเลย
    if (totals.seconds < 60) {
      console.log("⚠️ Session too short (<60s). Skipping history creation and deleting session.");
      await WorkoutSession.findByIdAndDelete(id);
      return res.json({
        sessionId: null,
        aborted: true,
        msg: "Session discarded because it was less than 60 seconds",
        totals
      });
    }

    // 4. สร้าง History ถาวร
    const historyData = {
      uid: session.uid,
      sessionId: session._id, // ✅ บันทึก sessionId ลงไปด้วย
      programId: session.origin?.programId,
      programName: session.snapshot?.programName || "Unknown Program",
      totalSeconds: totals.seconds,
      caloriesBurned: totals.calories,
      totalExercises: session.logs.length,
      finishedAt: session.finishedAt
    };

    const isDailyPlan = session.origin?.programId === "dailyplan";
    const TargetModel = isDailyPlan ? DailyHistory : History;

    const newHistory = await TargetModel.create(historyData);
    console.log(`✅ History Created in ${isDailyPlan ? 'DailyHistory' : 'History'}:`, newHistory._id);

    // 5. อัปเดต User Stats
    await User.findOneAndUpdate(
      { uid: session.uid },
      {
        $inc: {
          caloriesBurned: totals.calories,
          workoutsDone: 1
        }
      }
    );

    // 6. ✅ ถ้าเป็น Daily Plan ให้ไปอัปเดตสถานะของแผนวันวันนี้เป็น "completed"
    if (session.origin?.programId === "dailyplan") {
      const today = new Date().toISOString().split("T")[0];
      try {
        await mongoose.model('DailyPlan').findOneAndUpdate(
          { userId: session.uid, date: today },
          { status: "completed" }
        );
        console.log(`✅ DailyPlan status marked as completed for ${session.uid}`);
      } catch (dpErr) {
        console.error("❌ Failed to update DailyPlan status:", dpErr);
      }
    }

    res.json({
      sessionId: session._id,
      historyId: newHistory._id,
      msg: "Session finished and History saved",
      totals
    });

  } catch (err) {
    console.error("❌ Finish Session Error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ================== API: Latest Summary (Program) ==================
// const { calculateCalories } = require('./utils/calories');

app.get("/api/__summary_internal/program/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    // 💡 ค้นหาจากทั้ง History (โปรแกรมปกติ) และ DailyHistory (แผนรายวัน) เพื่อหาความเคลื่อนไหวล่าสุด
    const [standardLatest, dailyLatest] = await Promise.all([
      mongoose.model("History").findOne({ uid }).sort({ finishedAt: -1 }).lean(),
      mongoose.model("DailyHistory").findOne({ uid }).sort({ finishedAt: -1 }).lean()
    ]);

    // เลือกตัวที่ใหม่ที่สุดจากทั้งสอง Collection
    let latest = null;
    if (standardLatest && dailyLatest) {
      latest = standardLatest.finishedAt > dailyLatest.finishedAt ? standardLatest : dailyLatest;
    } else {
      latest = standardLatest || dailyLatest;
    }

    if (!latest) {
      console.log(`❌ No History found in any collection for UID: ${uid}`);
      return res.status(404).json({ error: "ไม่พบประวัติการเล่น" });
    }

    // ตรวจสอบว่าเป็น Daily Plan หรือไม่ โดยเช็คจาก collection หรือ programId
    // (หมายเหตุ: latest อาจจะไม่มี programId ถ้าเป็นประวัติเก่ามากๆ แต่ DailyHistory จะมี "dailyplan")
    const isDailyPlan = latest.programId === "dailyplan" || latest.sessionId?.includes("daily");
    // ^ sessionId อาจจะไม่ชัวร์ แต่ programId "dailyplan" ชัวร์กว่า

    // ==========================================
    // 💡 คำนวณแคลอรี่แบบประมวลผลสด (On-the-fly)
    // ==========================================
    let activeCalories = latest.caloriesBurned || 0;
    const totalSecs = latest.totalSeconds || 0;
    if (totalSecs > 0) {
      const userDoc = await User.findOne({ uid }).lean();
      const weight = userDoc?.weight || 70; // น้ำหนักตั้งต้นถ้าไม่มีข้อมูลผู้ใช้

      let metValue = 5.0; // ตั้งต้นค่า MET เฉลี่ย

      if (!isDailyPlan && latest.programId) {
        // ถ้าเป็นโปรแกรมปกติ ลองดึงข้อมูลท่าทั้งหมดมาหาค่า MET เฉลี่ย
        try {
          const prog = await WorkoutProgram.findById(latest.programId).populate("workoutList.exercise");
          // ถ้ามีท่าและท่ามีค่า met.base ก็เฉลี่ยออกมา
          if (prog && prog.workoutList && prog.workoutList.length > 0) {
            const metSum = prog.workoutList.reduce((sum, item) => {
              if (item.exercise && item.exercise.met && item.exercise.met.base) {
                return sum + item.exercise.met.base;
              }
              return sum + 5.0; // default 5.0 per exercise if unknown
            }, 0);
            metValue = metSum / prog.workoutList.length;
          }
        } catch (e) {
          console.log("Could not load program to calculate exact MET, using default MET:", e.message);
        }
      }

      // นำความรู้คำนวณสดมาใช้คำนวณแคลอรี่ใหม่
      activeCalories = calculateCalories(weight, metValue, totalSecs);

      // (Optional) บันทึกกลับลงฐานข้อมูลเพื่อให้ตรงกัน ถ้ายอดต่างกันมากๆ ค่อยเซฟ
      if (Math.abs((latest.caloriesBurned || 0) - activeCalories) > 1) {
        const ModelToUpdate = (latest._id === dailyLatest?._id) ? mongoose.model("DailyHistory") : mongoose.model("History");
        await ModelToUpdate.findByIdAndUpdate(latest._id, { caloriesBurned: activeCalories });
      }
    }

    // 💡 ดึงรายชื่อท่าจาก WorkoutSession เพื่อส่งไปโชว์ที่ Frontend
    let exerciseList = [];
    if (latest.sessionId) {
      try {
        const sessionDoc = await mongoose.model("WorkoutSession").findById(latest.sessionId).lean();
        if (sessionDoc) {
          if (sessionDoc.logs && sessionDoc.logs.length > 0) {
            exerciseList = sessionDoc.logs.map(l => ({ name: l.name, status: l.status || "completed" }));
          } else if (sessionDoc.snapshot && sessionDoc.snapshot.exercises) {
            exerciseList = sessionDoc.snapshot.exercises.map(ex => ({ name: ex.name, status: "pending" }));
          }
        }
      } catch (sessErr) {
        console.error("Error fetching session for summary:", sessErr);
      }
    }

    res.json({
      uid,
      sessionId: latest.sessionId,
      historyId: latest._id,
      programName: latest.programName || (isDailyPlan ? "ภารกิจรายวัน" : "โปรแกรมออกกำลังกาย"),
      totalExercises: latest.totalExercises || 0,
      doneExercises: latest.totalExercises || 0,
      exercises: exerciseList, // ✅ ส่งรายชื่อท่ากลับไปด้วย
      totals: {
        seconds: totalSecs,
        calories: activeCalories
      },
      finishedAt: latest.finishedAt,
      isDailyPlan
    });
  } catch (e) {
    console.error("❌ Summary API Error:", e);
    res.status(500).json({ error: e.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

