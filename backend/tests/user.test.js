// Тесты /api/user — уведомления в Telegram
const request = require('supertest');

jest.mock('../src/services/telegram', () => ({
  notifyNewUser: jest.fn(async () => {}),
}));

const app = require('../src/app');
const db = require('../src/db');
const { notifyNewUser } = require('../src/services/telegram');

describe('POST /api/user — Telegram', () => {
  const createdEmails = [];

  afterAll(() => {
    for (const email of createdEmails) {
      db.prepare('DELETE FROM users WHERE email = ?').run(email);
    }
  });

  beforeEach(() => {
    notifyNewUser.mockClear();
    test('Тест 3: current_steps = null не падает', async () => {
  const email = `tg-null-${Date.now()}@example.com`;
  createdEmails.push(email);

  const res = await request(app)
    .post('/api/user')
    .send({ email, name: 'TG Null', daily_goal: 6000 });

  expect(res.status).toBe(201);

  await new Promise(r => setImmediate(r));

  expect(notifyNewUser).toHaveBeenCalledTimes(1);
  const arg = notifyNewUser.mock.calls[0][0];
  expect(arg.avg_steps).toBeUndefined();
});
  });

  test('Тест 1: notifyNewUser вызывается при создании', async () => {
    const email = `tg-test-${Date.now()}@example.com`;
    createdEmails.push(email);

    const res = await request(app)
      .post('/api/user')
      .send({ email, name: 'TG Test', daily_goal: 6000, current_steps: 3000 });

    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);

    await new Promise(r => setImmediate(r));

    expect(notifyNewUser).toHaveBeenCalledTimes(1);
    const arg = notifyNewUser.mock.calls[0][0];
    expect(arg.email).toBe(email);
    expect(arg.name).toBe('TG Test');
    expect(arg.daily_goal).toBe(6000);
    expect(arg.avg_steps).toBe(3000);
  });

  test('Тест 2: notifyNewUser НЕ вызывается при повторном запросе', async () => {
    const email = `tg-dup-${Date.now()}@example.com`;
    createdEmails.push(email);

    await request(app)
      .post('/api/user')
      .send({ email, name: 'TG Dup', daily_goal: 6000 });

    notifyNewUser.mockClear();

    await request(app)
      .post('/api/user')
      .send({ email, name: 'TG Dup', daily_goal: 6000 });

    await new Promise(r => setImmediate(r));

    expect(notifyNewUser).not.toHaveBeenCalled();
  });
});