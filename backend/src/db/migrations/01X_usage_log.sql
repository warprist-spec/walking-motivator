-- Rate-limit: счётчики использования Vision (user + service)
CREATE TABLE IF NOT EXISTS usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  date TEXT NOT NULL,
  kind TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date, kind)
);

CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_log(date, kind);