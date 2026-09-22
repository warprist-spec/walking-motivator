-- Walking Motivator — схема БД (MVP)

CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id        TEXT UNIQUE,               -- telegram id (если есть)
  email        TEXT UNIQUE,               -- email с лендинга
  name         TEXT,
  timezone     TEXT DEFAULT 'Europe/Berlin',
  daily_goal   INTEGER DEFAULT 6000,      -- цель по шагам
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS steps (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  date         TEXT NOT NULL,             -- YYYY-MM-DD
  steps        INTEGER NOT NULL,
  source       TEXT DEFAULT 'android',    -- android | screenshot | manual
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_steps_user_date ON steps(user_id, date);

CREATE TABLE IF NOT EXISTS messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  role         TEXT NOT NULL,             -- user | assistant | system
  content      TEXT NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at);

CREATE TABLE IF NOT EXISTS goals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  target_steps  INTEGER NOT NULL,
  effective_from TEXT NOT NULL,           -- YYYY-MM-DD
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);