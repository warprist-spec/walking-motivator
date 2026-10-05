// Тесты /api/screenshot — Этап 9
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

const hasKey =
  !!process.env.CHATANYWHERE_API_KEY &&
  !process.env.CHATANYWHERE_API_KEY.startsWith('sk-xxx');

describe('POST /api/screenshot — валидация', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM usage_log').run();
  });

  test('Тест 1: без файла → 400', async () => {
    const res = await request(app)
      .post('/api/screenshot')
      .field('userId', '1');
    expect(res.status).toBe(400);
  });

  test('Тест 2: без userId → 400', async () => {
    const res = await request(app)
      .post('/api/screenshot')
      .attach('image', Buffer.from('fake'), 'test.png');
    expect(res.status).toBe(400);
  });

  test('Тест 3: несуществующий userId → 404', async () => {
    const res = await request(app)
      .post('/api/screenshot')
      .field('userId', '999999')
      .attach('image', Buffer.from('fake'), 'test.png');
    expect(res.status).toBe(404);
  });

  test('Тест 4: исчерпан user-лимит → 429', async () => {
    // Создать юзера
    const email = `shot-limit-${Date.now()}@example.com`;
    const u = await request(app).post('/api/user').send({ email, name: 'Limit', daily_goal: 6000 });
    const userId = u.body.user.id;

    // Забить лимит
    for (let i = 0; i < 5; i++) {
      db.prepare(`
        INSERT INTO usage_log (user_id, date, kind, count)
        VALUES (?, date('now'), 'vision_user', 1)
        ON CONFLICT(user_id, date, kind) DO UPDATE SET count = count + 1
      `).run(userId);
    }

    const res = await request(app)
      .post('/api/screenshot')
      .field('userId', String(userId))
      .attach('image', Buffer.from('fake'), 'test.png');

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/лимит/i);

    // Чистим юзера
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });
});

describe.skip('POST /api/screenshot — реальный Vision (skip: экономим токены)', () => {
  let userId;
  let userEmail;

  beforeAll(async () => {
    userEmail = `shot-real-${Date.now()}@example.com`;
    const u = await request(app).post('/api/user').send({ email: userEmail, name: 'ShotTest', daily_goal: 6000 });
    userId = u.body.user.id;
  });

  afterAll(() => {
    db.prepare('DELETE FROM users WHERE email = ?').run(userEmail);
    db.prepare('DELETE FROM usage_log WHERE user_id = ?').run(userId);
  });

  test('Тест 5: реальный скриншот → 200 + { steps, confidence }', async () => {
    // 1×1 PNG (минимальный валидный, OCR вернёт null)
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const buffer = Buffer.from(pngBase64, 'base64');

    const res = await request(app)
      .post('/api/screenshot')
      .field('userId', String(userId))
      .attach('image', buffer, 'test.png');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('steps');
    expect(res.body).toHaveProperty('confidence');
    // 1×1 PNG без шагов → steps: null, message про ручной ввод
    // (это ожидаемо, промпт запрещает выдумывать)
  }, 30_000);

  test('Тест 6: невалидное изображение → steps: null, message', async () => {
    const res = await request(app)
      .post('/api/screenshot')
      .field('userId', String(userId))
      .attach('image', Buffer.from('not-an-image'), 'bad.png');

    expect(res.status).toBe(200);
    expect(res.body.steps).toBeNull();
    expect(res.body.message).toMatch(/введи вручную/i);
  }, 30_000);
});