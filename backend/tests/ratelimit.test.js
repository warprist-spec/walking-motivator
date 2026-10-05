// Тесты rate-limit — Этап 9
const db = require('../src/db');
const rateLimit = require('../src/services/rateLimit');

// Чистим usage_log перед каждым тестом
beforeEach(() => {
  db.prepare('DELETE FROM usage_log').run();
});

afterAll(() => {
  db.prepare('DELETE FROM usage_log').run();
});

describe('rateLimit.checkUserLimit', () => {
  test('Тест 1: при первом вызове → { allowed: true, remaining: 5 }', () => {
    const r = rateLimit.checkUserLimit(1);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(5);
  });

  test('Тест 2: после 5 вызовов → { allowed: false, remaining: 0 }', () => {
    for (let i = 0; i < 5; i++) {
      rateLimit.recordUsage(1);
    }
    const r = rateLimit.checkUserLimit(1);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });
});

describe('rateLimit.checkServiceLimit', () => {
  test('Тест 3: при первом вызове → { allowed: true, remaining: 190 }', () => {
    const r = rateLimit.checkServiceLimit();
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(190);
  });
});

describe('rateLimit — сброс по дате', () => {
  test('Тест 4: счётчики вчера не влияют на сегодня', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yDate = yesterday.toISOString().slice(0, 10);

    // Записываем 5 использований «вчера» напрямую в БД
    for (let i = 0; i < 5; i++) {
      db.prepare(`
        INSERT INTO usage_log (user_id, date, kind, count) VALUES (?, ?, 'vision_user', 1)
        ON CONFLICT(user_id, date, kind) DO UPDATE SET count = count + 1
      `).run(1, yDate);
    }

    const r = rateLimit.checkUserLimit(1);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(5);
  });
});

describe('rateLimit.recordUsage', () => {
  test('Тест 5: увеличивает счётчик на 1', () => {
    rateLimit.recordUsage(1);
    const row = db.prepare(
      `SELECT count FROM usage_log WHERE user_id = 1 AND kind = 'vision_user'`
    ).get();
    expect(row.count).toBe(1);

    rateLimit.recordUsage(1);
    const row2 = db.prepare(
      `SELECT count FROM usage_log WHERE user_id = 1 AND kind = 'vision_user'`
    ).get();
    expect(row2.count).toBe(2);
  });
});