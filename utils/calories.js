function calculateCalories(weight, met, durationSec) {
  const calPerMin = (met * 3.5 * weight) / 200;
  return calPerMin * (durationSec / 60);
}

module.exports = { calculateCalories };
