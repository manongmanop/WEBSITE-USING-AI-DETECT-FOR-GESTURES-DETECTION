/**
 * calculateCalories
 * -----------------
 * คำนวณแคลอรี่ที่เผาไหม้จากท่าออกกำลังกาย
 *
 * สูตร: Calories = (MET × 3.5 × weight) / 200 × durationMin
 *   - MET   : ค่า Metabolic Equivalent of Task ของท่านั้นๆ
 *   - weight: น้ำหนักผู้ใช้ (กก.)
 *   - durationSec: ระยะเวลาที่ออกกำลัง (วินาที)
 *
 * อ้างอิง: American College of Sports Medicine (ACSM) Calorie Estimation Formula
 *
 * @param {number} weight     - น้ำหนักผู้ใช้ หน่วย กก. (default: 70)
 * @param {number} met        - ค่า MET ของท่าออกกำลังกาย (default: 5.0)
 * @param {number} durationSec - เวลาที่ออกกำลัง หน่วย วินาที
 * @returns {number} แคลอรี่ที่เผาไหม้ (kcal) ปัดเศษ 2 ตำแหน่ง
 */
function calculateCalories(weight, met, durationSec) {
  const safeWeight = Number(weight) || 70;
  const safeMet = Number(met) || 5.0;
  const safeDuration = Number(durationSec) || 0;

  const calPerMin = (safeMet * 3.5 * safeWeight) / 200;
  const result = calPerMin * (safeDuration / 60);
  return parseFloat(result.toFixed(2));
}

module.exports = { calculateCalories };
