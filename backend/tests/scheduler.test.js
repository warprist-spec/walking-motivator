// Тесты scheduler.js — Этап 7
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const schedulerPath = '../src/services/scheduler';

// Мокаем node-cron до require scheduler
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

// Мокаем chat, чтобы джобы не вызывали реальный AI
jest.mock('../src/services/chat', () => ({
  generateProactiveMessage: jest.fn(async () => 'mocked reply'),
}));

// Мокаем db — возвращаем список пользователей
jest.mock('../src/db', () => {
  const users = [{ id: 1 }, { id: 2 }];
  return {
    prepare: jest.fn((sql) => ({
      all: () => users,
      get: () => null,
      run: () => ({ changes: 1 }),
    })),
    exec: jest.fn(),
  };
});

describe('scheduler.registerJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_MORNING_HOUR = '8';
    process.env.AI_DAY_HOUR = '15';
    process.env.AI_EVENING_HOUR = '21';
  });

  test('Тест 1: registerJobs — функция, не падает', () => {
    const { registerJobs } = require(schedulerPath);
    expect(typeof registerJobs).toBe('function');
    expect(() => registerJobs()).not.toThrow();
  });

  test('Тест 2: cron.schedule вызван 3 раза с правильными часами', () => {
    const cron = require('node-cron');
    const { registerJobs } = require(schedulerPath);
    registerJobs();

    expect(cron.schedule).toHaveBeenCalledTimes(3);

    const calls = cron.schedule.mock.calls.map((c) => c[0]);
    expect(calls).toContain('0 8 * * *');
    expect(calls).toContain('0 15 * * *');
    expect(calls).toContain('0 21 * * *');
  });

  test('Тест 3: у каждого джоба есть функция-обработчик', () => {
    const cron = require('node-cron');
    const { registerJobs } = require(schedulerPath);
    registerJobs();

    cron.schedule.mock.calls.forEach((call) => {
      expect(typeof call[1]).toBe('function');
    });
  });
});