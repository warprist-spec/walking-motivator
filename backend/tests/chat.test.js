// Интеграционные тесты /api/chat — Этап 6
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

const hasKey =
  !!process.env.CHATANYWHERE_API_KEY &&
  !process.env.CHATANYWHERE_API_KEY.startsWith('sk-xxx');

describe('POST /api/chat — валидация', () => {
  test('Тест 1: 404 при несуществующем userId', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ userId: 99999, message: 'привет' });

    expect(res.status).toBe(404);
  });

  test('Тест 2: 400 при пустом message', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ userId: 1, message: '' });

    expect(res.status).toBe(400);
  });
});

(hasKey ? describe : describe.skip)('POST /api/chat — реальные вызовы', () => {
  let userId;
  let messagesBefore;
  let messagesAfter;

  beforeAll(async () => {
    // Уникальный email, чтобы не конфликтовать с существующими
    const email = `chat-test-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/user')
      .send({ email, name: 'ChatTest', daily_goal: 6000 });

    expect(res.status).toBe(201);
    userId = res.body.user.id;

    messagesBefore = db.prepare(
      'SELECT COUNT(*) AS c FROM messages WHERE user_id = ?'
    ).get(userId).c;
  });

  test('Тест 3: успешный ответ AI', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ userId, message: 'Привет, я готов начать' });

    expect(res.status).toBe(200);
    expect(typeof res.body.reply).toBe('string');
    expect(res.body.reply.length).toBeGreaterThan(0);

    expect(res.body.context).toBeDefined();
    expect(res.body.context.currentNorm).toBe(6000);
    expect(typeof res.body.context.todaySteps).toBe('number');
    expect(res.body.context.streak).toBe(0);

    // Запоминаем кол-во сообщений ПОСЛЕ первого вызова
    messagesAfter = db.prepare(
      'SELECT COUNT(*) AS c FROM messages WHERE user_id = ?'
    ).get(userId).c;
  }, 60_000);

  test('Тест 4: сообщения сохраняются в БД', () => {
    // Без нового вызова AI — проверяем результат Теста 3
    expect(messagesAfter - messagesBefore).toBe(2); // user + assistant
  });
  // --- Тест 5: context.streak — не всегда 0 (Этап 7) ---

(hasKey ? describe : describe.skip)('POST /api/chat — реальный streak', () => {
  let userId;

  beforeAll(async () => {
    const email = `streak-chat-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/user')
      .send({ email, name: 'StreakChat', daily_goal: 5000 });

    userId = res.body.user.id;

    // Готовим данные: 3 дня подряд выполнено
    const d = (n) => {
      const x = new Date();
      x.setDate(x.getDate() - n);
      return x.toISOString().slice(0, 10);
    };
    db.prepare('INSERT INTO steps (user_id, date, steps) VALUES (?, ?, ?)').run(userId, d(0), 6000);
    db.prepare('INSERT INTO steps (user_id, date, steps) VALUES (?, ?, ?)').run(userId, d(1), 5500);
    db.prepare('INSERT INTO steps (user_id, date, steps) VALUES (?, ?, ?)').run(userId, d(2), 5000);
  });

  test('Тест 5: context.streak отражает реальные данные', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ userId, message: 'Привет' });

    expect(res.status).toBe(200);
    expect(res.body.context.streak).toBeGreaterThanOrEqual(3);
  }, 60_000);
});
(hasKey ? describe : describe.skip)('startingSteps priority', () => {
  let userId;
  beforeAll(async () => {
    const res = await request(app).post('/api/user')
      .send({ email: `st-${Date.now()}@e.com`, name: 'ST', daily_goal: 7000 });
    userId = res.body.user.id;
    const d = new Date().toISOString().slice(0, 10);
    db.prepare('INSERT INTO steps (user_id, date, steps) VALUES (?, ?, ?)').run(userId, d, 9000);
  });

  test('startingSteps > БД', async () => {
    const r = await request(app).post('/api/chat')
      .send({ userId, message: 'Привет', startingSteps: 3000 });
    expect(r.body.context.todaySteps).toBe(3000);
  }, 60000);

  test('startingSteps > парсер', async () => {
    const r = await request(app).post('/api/chat')
      .send({ userId, message: 'прошёл 5000 шагов', startingSteps: 3000 });
    expect(r.body.context.todaySteps).toBe(3000);
  }, 60000);
});
});