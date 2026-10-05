// Утилита: очистка таблицы usage_log (идемпотентная)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/db');

const result = db.prepare('DELETE FROM usage_log').run();
console.log(`✅ usage_log очищен. Удалено записей: ${result.changes}`);
console.log('Осталось записей:', db.prepare('SELECT COUNT(*) AS c FROM usage_log').get().c);