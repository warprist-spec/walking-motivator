// Чистые функции расчёта привычек: streak, slip, escalation
// Принимают db как зависимость — легко тестируются с моком.

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function getStepsOn(db, userId, dateStr) {
  const row = db.prepare(
    'SELECT steps FROM steps WHERE user_id = ? AND date = ?'
  ).get(userId, dateStr);
  return row ? row.steps : null;
}

function getGoal(db, userId) {
  const row = db.prepare('SELECT daily_goal FROM users WHERE id = ?').get(userId);
  return row ? row.daily_goal : 0;
}

// --- getStreak ---
function getStreak(userId, db, today = new Date()) {
  const goal = getGoal(db, userId);
  if (!goal) return 0;

  const todayStr = toDateStr(today);
  const todaySteps = getStepsOn(db, userId, todayStr);

  const cursor = new Date(today);

  // Если сегодня НЕ закрыт — начинаем со вчера
  if (todaySteps === null || todaySteps < goal) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const dateStr = toDateStr(cursor);
    const steps = getStepsOn(db, userId, dateStr);

    if (steps === null || steps < goal) break;

    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// --- getMissedDays ---
function getMissedDays(userId, db, today = new Date()) {
  const goal = getGoal(db, userId);
  if (!goal) return 0;

  const firstRow = db.prepare(
    'SELECT date FROM steps WHERE user_id = ? ORDER BY date ASC LIMIT 1'
  ).get(userId);

  if (!firstRow) return 0;

  const firstDate = firstRow.date;
  const threshold = goal * 0.5;
  const cursor = new Date(today);

  let missed = 0;
  for (let i = 0; i < 365; i++) {
    const dateStr = toDateStr(cursor);
    if (dateStr < firstDate) break;

    const steps = getStepsOn(db, userId, dateStr);
    const isMissed = steps === null || steps < threshold;
    if (!isMissed) break;

    missed++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return missed;
}

// --- isInSlip ---
function isInSlip(userId, db, today = new Date()) {
  return getMissedDays(userId, db, today) >= 2;
}

// --- shouldEscalateNorm ---
function shouldEscalateNorm(userId, db, today = new Date()) {
  const goal = getGoal(db, userId);
  if (!goal) return false;

  const cursor = new Date(today);
  let successDays = 0;

  for (let i = 0; i < 7; i++) {
    const dateStr = toDateStr(cursor);
    const steps = getStepsOn(db, userId, dateStr);
    if (steps !== null && steps >= goal) successDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return successDays >= 4;
}

// --- shouldPingDay ---
function shouldPingDay(userId, db, now = new Date()) {
  const hour = Number(process.env.AI_DAY_HOUR || 15);
  if (now.getHours() !== hour) return false;

  const goal = getGoal(db, userId);
  if (!goal) return false;

  const todayStr = toDateStr(now);
  const todaySteps = getStepsOn(db, userId, todayStr) || 0;

  return todaySteps < goal * 0.4;
}

module.exports = {
  getStreak,
  isInSlip,
  getMissedDays,
  shouldEscalateNorm,
  shouldPingDay,
};