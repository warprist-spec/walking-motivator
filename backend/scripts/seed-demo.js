// Seed демо-данных для user=1 — для ручной проверки Этапа 7
require('dotenv').config();

const db = require('../src/db');

const userId = 1;
const user = db.prepare('SELECT id, name, daily_goal FROM users WHERE id = ?').get(userId);
if (!user) {
  console.error('User=1 не найден. Создай его сначала через POST /api/user');
  process.exit(1);
}

console.log('Пользователь:', user);

// Чистим последние 10 дней, чтобы не было конфликтов
db.prepare(
  "DELETE FROM steps WHERE user_id = ? AND date >= date('now', '-10 days')"
).run(userId);

// Готовим серию: 3 дня подряд норма выполнена (включая сегодня)
const data = [
  { daysAgo: 0, steps: 9000 },
  { daysAgo: 1, steps: 8000 },
  { daysAgo: 2, steps: 7500 },
  { daysAgo: 3, steps: 1000 },  // срыв
  { daysAgo: 4, steps: 7000 },
];

for (const d of data) {
  const date = new Date();
  date.setDate(date.getDate() - d.daysAgo);
  const dateStr = date.toISOString().slice(0, 10);
  db.prepare('INSERT INTO steps (user_id, date, steps) VALUES (?, ?, ?)')
    .run(userId, dateStr, d.steps);
  console.log('inserted', dateStr, d.steps);
}

console.log('\nГотово. Проверка:');
console.log(
  db.prepare('SELECT date, steps FROM steps WHERE user_id = ? ORDER BY date DESC LIMIT 7').all(userId)
);