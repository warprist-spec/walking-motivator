// Rate-limit для Vision: user-лимит и service-лимит через SQLite
const db = require('../db');

const USER_DAILY_LIMIT = 5;
const SERVICE_DAILY_LIMIT = 190;

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Проверка user-лимита
function checkUserLimit(userId) {
  const row = db.prepare(
    `SELECT count FROM usage_log
     WHERE user_id = ? AND date = ? AND kind = 'vision_user'`
  ).get(userId, today());

  const used = row ? row.count : 0;
  const remaining = Math.max(0, USER_DAILY_LIMIT - used);
  return { allowed: remaining > 0, remaining };
}

// Проверка service-лимита (сумма по всем юзерам за сегодня)
function checkServiceLimit() {
  const row = db.prepare(
    `SELECT COALESCE(SUM(count), 0) AS total FROM usage_log
     WHERE date = ? AND kind = 'vision_service'`
  ).get(today());

  const used = row ? row.total : 0;
  const remaining = Math.max(0, SERVICE_DAILY_LIMIT - used);
  return { allowed: remaining > 0, remaining };
}

// Записать +1 в user-лимит и service-лимит
function recordUsage(userId) {
  const date = today();

  db.prepare(`
    INSERT INTO usage_log (user_id, date, kind, count)
    VALUES (?, ?, 'vision_user', 1)
    ON CONFLICT(user_id, date, kind) DO UPDATE SET count = count + 1
  `).run(userId, date);

  db.prepare(`
    INSERT INTO usage_log (user_id, date, kind, count)
    VALUES (0, ?, 'vision_service', 1)
    ON CONFLICT(user_id, date, kind) DO UPDATE SET count = count + 1
  `).run(date);
}

// Для тестов: удалить user-запись за сегодня
function resetUserLimit(userId) {
  db.prepare(
    `DELETE FROM usage_log WHERE user_id = ? AND kind = 'vision_user'`
  ).run(userId);
}

module.exports = {
  checkUserLimit,
  checkServiceLimit,
  recordUsage,
  resetUserLimit,
  USER_DAILY_LIMIT,
  SERVICE_DAILY_LIMIT,
};