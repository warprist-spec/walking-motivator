// Обёртка над встроенным node:sqlite (Node.js 22.5+)
// Скрывает отличия от better-sqlite3, чтобы остальной код работал без изменений.
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || './data/app.db';
const fullPath = path.isAbsolute(DB_PATH)
  ? DB_PATH
  : path.join(__dirname, '..', '..', DB_PATH);

// Гарантируем, что папка для БД существует
fs.mkdirSync(path.dirname(fullPath), { recursive: true });

const raw = new DatabaseSync(fullPath);

// Включаем WAL и внешние ключи через PRAGMA (в node:sqlite нет метода pragma)
raw.exec('PRAGMA journal_mode = WAL;');
raw.exec('PRAGMA foreign_keys = ON;');

// Обёртка, которая приводит lastInsertRowid из BigInt к Number
function wrapStatement(stmt) {
  const originalRun = stmt.run.bind(stmt);
  return {
    get: (...args) => stmt.get(...args),
    all: (...args) => stmt.all(...args),
    run: (...args) => {
      const result = originalRun(...args);
      if (result && typeof result.lastInsertRowid === 'bigint') {
        result.lastInsertRowid = Number(result.lastInsertRowid);
      }
      return result;
    },
  };
}

// Публичный объект с тем же интерфейсом, что был у better-sqlite3
const db = {
  prepare: (sql) => wrapStatement(raw.prepare(sql)),
  exec: (sql) => raw.exec(sql),
  name: fullPath,
};

module.exports = db;