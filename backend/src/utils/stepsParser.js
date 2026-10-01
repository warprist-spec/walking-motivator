// Извлечение числа шагов из сообщения пользователя
// Устойчиво к NBSP, узким пробелам, разным вариантам "шагов/steps".
// Приоритет у явно названного числа над данными из БД (Этап 7).

const MIN_STEPS = 100;
const MAX_STEPS = 100000;

// "шагов", "шаг", "шага", "steps", "step"
const STEP_WORD = '(?:шаг(?:ов|а)?|steps?)';

function extractStepsFromMessage(message) {
  if (!message || typeof message !== 'string') return null;

  // Нормализуем пробелы: NBSP (\u00A0), узкий NBSP (\u202F), тонкий (\u2009) → обычный пробел
  const normalized = message.replace(/[\u00A0\u202F\u2009]/g, ' ');

  const patterns = [
    // «прошёл 3000 шагов», «прошел 5 000 шагов», «walked 12000 steps»
    new RegExp(`(?:прош[её]л|прошла|пройдено|walked|did)\\s*([\\d\\s]{2,8})\\s*${STEP_WORD}`, 'i'),
    // «3000 шагов», «5 000 steps»
    new RegExp(`([\\d\\s]{2,8})\\s*${STEP_WORD}`, 'i'),
    // «8500» — голое число (только если вся строка — это число или число + пунктуация)
    /^\s*(\d[\d\s]{2,7})\s*[.!?]?\s*$/,
  ];

  for (const p of patterns) {
    const match = normalized.match(p);
    if (!match) continue;

    // Убираем все пробелы внутри числа (например, "5 000" → "5000")
    const raw = match[1].replace(/\s/g, '');
    const n = Number(raw);

    if (!Number.isFinite(n)) continue;
    if (n < MIN_STEPS || n > MAX_STEPS) continue;

    return n;
  }

  return null;
}
// Парсер фраз про срыв («пропал на неделю», «не ходил 3 дня»)
// Возвращает { detected: bool, missedDays: number|null }
// Парсер фраз про срыв («пропал на неделю», «не ходил 3 дня»)
// Возвращает { detected: bool, missedDays: number|null }
function extractSlipFromMessage(message) {
  if (!message || typeof message !== 'string') {
    return { detected: false, missedDays: null };
  }

  const normalized = message.replace(/[\u00A0\u202F\u2009]/g, ' ').toLowerCase();

  // Триггерные слова (без \b — работает для кириллицы)
  const triggers = [
    'пропал', 'пропала', 'забросил', 'забросила',
    'не ходил', 'не ходила', 'не отчитывался', 'не отчитывалась',
    'давно не', 'перестал', 'перестала', 'вернулся', 'вернулась',
  ];
  const detected = triggers.some(t => normalized.includes(t));
  if (!detected) {
    return { detected: false, missedDays: null };
  }

  // Попытка вытащить число дней: "3 дня", "7 дней"
  const numMatch = normalized.match(/(\d+)\s*(дн|день|дня|дней)/);
  if (numMatch) {
    return { detected: true, missedDays: Number(numMatch[1]) };
  }

  // Слова-числа
  const wordMap = [
    ['неделю', 7], ['неделя', 7], ['две недели', 14], ['месяц', 30],
    ['один день', 1], ['два дня', 2], ['три дня', 3],
    ['четыре дня', 4], ['пять дней', 5], ['шесть дней', 6],
  ];
  for (const [phrase, days] of wordMap) {
    if (normalized.includes(phrase)) {
      return { detected: true, missedDays: days };
    }
  }

  return { detected: true, missedDays: null };
}

module.exports = { extractStepsFromMessage, extractSlipFromMessage };