require('dotenv').config();
const db = require('../src/db');

const patterns = [
  'chat-test-%', 'streak-chat-%', 'st-%@e.com',
  'habit-test-%', 'slip-test-%', 'escalate-test-%', 'ping-test-%',
  '%@example.com', '%@e.com',
  'tg-test-%', 'tg-dup-%', 'tg-null-%', 'tg-live-%', '%@test.ru',
];

let total = 0;
for (const p of patterns) {
  const r = db.prepare('DELETE FROM users WHERE email LIKE ?').run(p);
  total += r.changes;
  console.log(`Удалено по ${p}: ${r.changes}`);
}

db.prepare('DELETE FROM messages WHERE user_id NOT IN (SELECT id FROM users)').run();
db.prepare('DELETE FROM steps WHERE user_id NOT IN (SELECT id FROM users)').run();

console.log(`\nВсего удалено: ${total}`);
console.log('Осталось users:', db.prepare('SELECT COUNT(*) AS c FROM users').get().c);