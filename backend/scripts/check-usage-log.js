require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Таблицы:', tables);

const usage = db.prepare("SELECT COUNT(*) AS c FROM usage_log").get();
console.log('Записей в usage_log:', usage.c);