const db = require('../db');

// Сегодняшняя дата в формате YYYY-MM-DD
function today() {
  return new Date().toISOString().slice(0, 10);
}

// Сохранить или обновить шаги за дату
function saveSteps({ userId, steps, date, source = 'android' }) {
  const day = date || today();

  const existing = db.prepare(
    'SELECT * FROM steps WHERE user_id = ? AND date = ?'
  ).get(userId, day);

  if (existing) {
    db.prepare(
      'UPDATE steps SET steps = ?, source = ? WHERE id = ?'
    ).run(steps, source, existing.id);
    return { ...existing, steps, source, updated: true };
  }

  const info = db.prepare(
    'INSERT INTO steps (user_id, date, steps, source) VALUES (?, ?, ?, ?)'
  ).run(userId, day, steps, source);

  return db.prepare('SELECT * FROM steps WHERE id = ?').get(info.lastInsertRowid);
}

// Прогресс пользователя за сегодня
function getTodayProgress(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;

  const row = db.prepare(
    'SELECT steps FROM steps WHERE user_id = ? AND date = ?'
  ).get(userId, today());

  const steps = row ? row.steps : 0;
  const goal = user.daily_goal;
  const percent = Math.min(100, Math.round((steps / goal) * 100));

  return { userId, date: today(), steps, goal, percent, achieved: steps >= goal };
}

module.exports = { saveSteps, getTodayProgress, today };