// Тесты habit.js — Этап 7
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('../src/db');
const habit = require('../src/services/habit');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function createUser(prefix, goal = 5000) {
  const email = `${prefix}-${Date.now()}-${Math.random()}@example.com`;
  const info = db.prepare(`
    INSERT INTO users (email, name, timezone, daily_goal)
    VALUES (?, 'TestUser', 'Europe/Berlin', ?)
  `).run(email, goal);
  return Number(info.lastInsertRowid);
}

function addSteps(userId, daysBack, steps) {
  db.prepare('INSERT INTO steps (user_id, date, steps) VALUES (?, ?, ?)')
    .run(userId, daysAgo(daysBack), steps);
}

function clearSteps(userId) {
  db.prepare('DELETE FROM steps WHERE user_id = ?').run(userId);
}

// --- getStreak ---

describe('habit.getStreak', () => {
  let userId;

  beforeEach(() => {
    userId = createUser('streak');
  });

  test('Тест 1: 0 при отсутствии данных', () => {
    expect(habit.getStreak(userId, db)).toBe(0);
  });

  test('Тест 2: 3 при трёх днях подряд (включая сегодня)', () => {
    addSteps(userId, 0, 6000);
    addSteps(userId, 1, 5500);
    addSteps(userId, 2, 5000);

    expect(habit.getStreak(userId, db)).toBe(3);
  });

  test('Тест 3: 0, если вчера не выполнено (даже если сегодня закрыто)', () => {
    addSteps(userId, 0, 6000); // сегодня
    addSteps(userId, 1, 1000); // вчера — провал
    addSteps(userId, 2, 6000); // позавчера

    expect(habit.getStreak(userId, db)).toBe(1); // только сегодня
  });

  test('Тест 4: до вчера, если сегодня ещё не закрыт', () => {
    addSteps(userId, 0, 1000); // сегодня — мало
    addSteps(userId, 1, 6000); // вчера — норма
    addSteps(userId, 2, 6000); // позавчера — норма

    expect(habit.getStreak(userId, db)).toBe(2); // вчера + позавчера
  });

  test('Тест 5: 0, если вчера и сегодня не закрыты', () => {
    addSteps(userId, 0, 1000);
    addSteps(userId, 1, 1000);
    addSteps(userId, 2, 6000);

    expect(habit.getStreak(userId, db)).toBe(0);
  });
});

// --- isInSlip ---

describe('habit.isInSlip', () => {
  let userId;

  beforeEach(() => {
    userId = createUser('slip');
  });

  test('Тест 6: false, если нет данных', () => {
    expect(habit.isInSlip(userId, db)).toBe(false);
  });

  test('Тест 7: true при 2 днях подряд < 50%', () => {
    addSteps(userId, 0, 1000); // < 2500
    addSteps(userId, 1, 1000);

    expect(habit.isInSlip(userId, db)).toBe(true);
  });

  test('Тест 8: false при 1 дне < 50%', () => {
    addSteps(userId, 0, 1000);
    addSteps(userId, 1, 6000);

    expect(habit.isInSlip(userId, db)).toBe(false);
  });

  test('Тест 9: true при 2 днях без данных', () => {
    // Оба дня вообще без записей (но есть более старые данные, чтобы не сработал getStreak=0 автоматом)
    addSteps(userId, 5, 6000);

    expect(habit.isInSlip(userId, db)).toBe(true);
  });
});

// --- getMissedDays ---

describe('habit.getMissedDays', () => {
  let userId;

  beforeEach(() => {
    userId = createUser('missed');
  });

  test('Тест 10: 0, если сегодня норма', () => {
    addSteps(userId, 0, 6000);

    expect(habit.getMissedDays(userId, db)).toBe(0);
  });

  test('Тест 11: 4, если 4 дня подряд < 50%', () => {
    addSteps(userId, 0, 1000);
    addSteps(userId, 1, 1000);
    addSteps(userId, 2, 1000);
    addSteps(userId, 3, 1000);

    expect(habit.getMissedDays(userId, db)).toBe(4);
  });

  test('Тест 12: прерывается при первом успешном дне', () => {
    addSteps(userId, 0, 1000);
    addSteps(userId, 1, 1000);
    addSteps(userId, 2, 6000); // успешный
    addSteps(userId, 3, 1000);

    expect(habit.getMissedDays(userId, db)).toBe(2);
  });
});

// --- shouldEscalateNorm ---

describe('habit.shouldEscalateNorm', () => {
  let userId;

  beforeEach(() => {
    userId = createUser('escalate');
  });

  test('Тест 13: false при 3 из 7', () => {
    addSteps(userId, 0, 6000);
    addSteps(userId, 1, 6000);
    addSteps(userId, 2, 6000);
    addSteps(userId, 3, 1000);
    addSteps(userId, 4, 1000);
    addSteps(userId, 5, 1000);
    addSteps(userId, 6, 1000);

    expect(habit.shouldEscalateNorm(userId, db)).toBe(false);
  });

  test('Тест 14: true при 4 из 7', () => {
    addSteps(userId, 0, 6000);
    addSteps(userId, 1, 6000);
    addSteps(userId, 2, 6000);
    addSteps(userId, 3, 6000);
    addSteps(userId, 4, 1000);
    addSteps(userId, 5, 1000);
    addSteps(userId, 6, 1000);

    expect(habit.shouldEscalateNorm(userId, db)).toBe(true);
  });
});

// --- shouldPingDay ---

describe('habit.shouldPingDay', () => {
  let userId;
  const goal = 7000;

  beforeEach(() => {
    userId = createUser('ping', goal);
    process.env.AI_DAY_HOUR = '15';
  });

  test('Тест 15: true — 15:00 и < 40% нормы', () => {
    addSteps(userId, 0, 2000); // < 2800
    const now = new Date();
    now.setHours(15, 0, 0, 0);

    expect(habit.shouldPingDay(userId, db, now)).toBe(true);
  });

  test('Тест 16: false — шаги ≥ 40%', () => {
    addSteps(userId, 0, 3000); // ≥ 2800
    const now = new Date();
    now.setHours(15, 0, 0, 0);

    expect(habit.shouldPingDay(userId, db, now)).toBe(false);
  });

  test('Тест 17: false — не 15:00', () => {
    addSteps(userId, 0, 2000);
    const now = new Date();
    now.setHours(12, 0, 0, 0);

    expect(habit.shouldPingDay(userId, db, now)).toBe(false);
  });
});