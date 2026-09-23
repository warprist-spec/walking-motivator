// Тесты stepsParser.js — Этап 7
const { extractStepsFromMessage } = require('../src/utils/stepsParser');

describe('stepsParser.extractStepsFromMessage', () => {
  test('Тест 1: «прошёл 3000 шагов» → 3000', () => {
    expect(extractStepsFromMessage('прошёл 3000 шагов')).toBe(3000);
  });

  test('Тест 2: «8500» (голое число) → 8500', () => {
    expect(extractStepsFromMessage('8500')).toBe(8500);
  });

  test('Тест 3: «прошёл 5 000 шагов» (с пробелом-разделителем) → 5000', () => {
    expect(extractStepsFromMessage('прошёл 5 000 шагов')).toBe(5000);
  });

  test('Тест 4: «walked 12000 steps» → 12000', () => {
    expect(extractStepsFromMessage('walked 12000 steps')).toBe(12000);
  });

  test('Тест 5: «прошёл 30 минут» → null', () => {
    expect(extractStepsFromMessage('прошёл 30 минут')).toBeNull();
  });

  test('Тест 6: «500% от нормы» → null', () => {
    expect(extractStepsFromMessage('500% от нормы')).toBeNull();
  });

  test('Тест 7: пустая строка → null', () => {
    expect(extractStepsFromMessage('')).toBeNull();
  });

  test('Тест 8: null / undefined → null', () => {
    expect(extractStepsFromMessage(null)).toBeNull();
    expect(extractStepsFromMessage(undefined)).toBeNull();
  });

  test('Тест 9: «я прошёл 500 км» → null (км, не шаги)', () => {
    expect(extractStepsFromMessage('я прошёл 500 км')).toBeNull();
  });
});