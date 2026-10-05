require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/db');

const rows = db.prepare(`
  SELECT s.id, s.user_id, u.name, s.date, s.steps, s.source
  FROM steps s
  JOIN users u ON u.id = s.user_id
  ORDER BY s.id DESC LIMIT 5
`).all();

console.log('Последние записи в steps:');
console.log(rows);