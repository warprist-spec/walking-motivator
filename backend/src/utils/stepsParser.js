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

module.exports = { extractStepsFromMessage };