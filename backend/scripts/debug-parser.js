// Diagnostic utility: проверка парсинга шагов из текста.
// Используется при отладке stepsParser и — начиная с Этапа 9 — при отладке Vision-парсера.
// // Диагностика парсера шагов
const { extractStepsFromMessage } = require('../src/utils/stepsParser');

const samples = [
  'Сегодня прошёл только 3000 шагов, чувствую себя виноватым',
  '3000 шагов',
  'только 3000 шагов',
  'прошёл 3000 шагов',
];

for (const s of samples) {
  console.log('\n----');
  console.log('Строка:', JSON.stringify(s));
  console.log('Длина:', s.length);
  console.log('Парсер:', extractStepsFromMessage(s));

  // Показать коды первых 40 символов
  const codes = [];
  for (let i = 0; i < Math.min(40, s.length); i++) {
    codes.push(`${s[i]}=${s.charCodeAt(i)}`);
  }
  console.log('Коды:', codes.join(' '));
}