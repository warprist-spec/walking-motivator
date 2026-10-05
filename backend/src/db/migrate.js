// Применяет schema.sql + все миграции из migrations/ по порядку
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');
const db = require('./index');

// 1. Базовая схема
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);
console.log('✅ schema.sql применён');

// 2. Миграции из migrations/ в алфавитном порядке
const migrationsDir = path.join(__dirname, 'migrations');
if (fs.existsSync(migrationsDir)) {
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec(sql);
    console.log(`✅ ${file} применён`);
  }
} else {
  console.log('ℹ️  Папка migrations/ не найдена — пропущено');
}

console.log('📁 База данных:', db.name);