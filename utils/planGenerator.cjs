function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDailyPlan(user, exercises) {
  // เลือก 3–5 ท่า
  const count = Math.floor(Math.random() * 3) + 3;

  // สุ่มเรียงลำดับ
  let shuffled = [...exercises].sort(() => 0.5 - Math.random());
  let selected = shuffled.slice(0, count);

  let plan = selected.map(ex => {
    if (ex.type === "time") {
      return {
        _id: ex._id,
        name: ex.name,
        type: "time",
        time: 15, // 15 sec default
        met: ex.met?.base || 5.0,
        imageUrl: ex.media?.imageUrl || ex.imageUrl || null,
      };
    }
    return {
      _id: ex._id,
      name: ex.name,
      type: "reps",
      reps: 8,
      met: ex.met?.base || 5.0,
      imageUrl: ex.media?.imageUrl || ex.imageUrl || null,
    };
  });

  return plan;
}

module.exports = { generateDailyPlan };
