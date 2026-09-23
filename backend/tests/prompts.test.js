// Тесты промптов — Этап 6
const path = require('path');

const promptsPath = '../src/prompts/system';
const scenariosPath = '../src/prompts/scenarios';

describe('prompts/system.js', () => {
  test('Тест 1: buildSystemPrompt возвращает непустую строку > 100 символов', () => {
    const { buildSystemPrompt } = require(promptsPath);
    const user = { name: 'Alex', daily_goal: 5000 };
    const out = buildSystemPrompt(user, 1200);

    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(100);
  });

  test('Тест 2: промпт содержит запреты', () => {
    const { buildSystemPrompt } = require(promptsPath);
    const out = buildSystemPrompt({ name: 'Alex', daily_goal: 5000 }, 1200);

    expect(out).toContain('не стыдить');
    expect(out).toContain('не пусто хвалить');
    expect(out).toContain('не давать медицинских советов');
  });

  test('Тест 3: промпт подставляет данные пользователя', () => {
    const { buildSystemPrompt } = require(promptsPath);
    const out = buildSystemPrompt({ name: 'Alex', daily_goal: 5000 }, 1200);

    expect(out).toContain('Alex');
    expect(out).toContain('5000');
    expect(out).toContain('1200');
  });

  test('Тест 5: в промпте есть примеры хороших ответов', () => {
    const { buildSystemPrompt } = require(promptsPath);
    const out = buildSystemPrompt({ name: 'Alex', daily_goal: 5000 }, 1200);

    expect(/Пример|Например/i.test(out)).toBe(true);
  });
});

describe('prompts/scenarios.js', () => {
  test('Тест 4: сценарные функции существуют и работают', () => {
    const s = require(scenariosPath);

    expect(typeof s.buildMorningPrompt).toBe('function');
    expect(typeof s.buildDayPrompt).toBe('function');
    expect(typeof s.buildEveningPrompt).toBe('function');
    expect(typeof s.buildSlipPrompt).toBe('function');

    const user = { name: 'Alex', daily_goal: 5000 };

    expect(s.buildMorningPrompt(user, 100).length).toBeGreaterThan(0);
    expect(s.buildDayPrompt(user, 100).length).toBeGreaterThan(0);

    const evening = s.buildEveningPrompt(user, 1200, 4800);
    expect(evening).toContain('4800');

    const slip = s.buildSlipPrompt(user, 3);
    expect(slip).toContain('3');
  });
});