// Применяет schema.sql к базе
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');
const db = require('./index');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

console.log('✅ Миграция выполнена. Таблицы созданы (или уже существовали).');
console.log('📁 База данных:', db.name);