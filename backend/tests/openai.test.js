// Тесты AI-слоя: ChatAnywhere (OpenAI-совместимый API)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const { execFileSync } = require('child_process');

// Модуль, который мы ещё не создали. Тесты должны падать до его появления.
const aiModulePath = '../src/services/openai';

// Проверка: есть ли реальный ключ. Иначе — skip тестов 3 и 4.
const hasKey =
  !!process.env.CHATANYWHERE_API_KEY &&
  !process.env.CHATANYWHERE_API_KEY.startsWith('sk-xxx');

// --- Тест 1 и Тест 2: структура модуля (не требуют ключа) ---

describe('openai.js — экспорт client и MODEL', () => {
  test('Тест 1: openai.js экспортирует client и MODEL', () => {
    const mod = require(aiModulePath);

    expect(mod).toBeDefined();
    expect(mod.client).toBeDefined();
    expect(typeof mod.client.chat?.completions?.create).toBe('function');

    expect(typeof mod.MODEL).toBe('string');
    expect(mod.MODEL.length).toBeGreaterThan(0);
  });

  test('Тест 2: client инициализирован с baseURL из env', () => {
    const mod = require(aiModulePath);

    const expected =
      process.env.OPENAI_BASE_URL || 'https://api.chatanywhere.tech/v1';

    expect(mod.client.baseURL).toBe(expected);
  });
});

// --- Тест 3: реальный вызов ChatAnywhere (skip без ключа) ---

(hasKey ? describe : describe.skip)('ChatAnywhere — реальный вызов', () => {
  test(
    'Тест 3: реальный ответ от ChatAnywhere',
    async () => {
      const { client, MODEL } = require(aiModulePath);

      const res = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'user', content: 'Скажи "работает" одним словом' },
        ],
        max_tokens: 10,
      });

      const reply = res.choices?.[0]?.message?.content;
      expect(typeof reply).toBe('string');
      expect(reply.length).toBeGreaterThan(0);
      expect(res.model).toContain(MODEL);
    },
    20_000
  );
});

// --- Тест 4: standalone-скрипт (skip без ключа) ---

(hasKey ? describe : describe.skip)('test-openai.js — standalone скрипт', () => {
  test(
    'Тест 4: test-openai.js завершается с кодом 0',
    () => {
      const script = path.join(__dirname, '..', 'test-openai.js');

      // execFileSync бросит исключение, если exit code !== 0
      const output = execFileSync('node', [script], {
        cwd: path.join(__dirname, '..'),
        timeout: 25_000,
        encoding: 'utf8',
      });

      expect(typeof output).toBe('string');
    },
    30_000
  );
});