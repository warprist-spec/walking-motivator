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
});