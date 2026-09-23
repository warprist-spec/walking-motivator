// Сценарии надстройки над system-промптом

function buildMorningPrompt(user, todaySteps) {
  const name = user?.name || 'друг';
  const goal = user?.daily_goal || 6000;
  return `
УТРЕННИЙ СЦЕНАРИЙ.
Поприветствуй ${name}, напомни дневную норму (${goal} шагов) и спроси про план на день.
Без давления. Одно короткое приветствие + один вопрос.
Сегодня уже: ${todaySteps ?? 0} шагов.
`.trim();
}

function buildDayPrompt(user, todaySteps) {
  const goal = user?.daily_goal || 6000;
  const steps = todaySteps ?? 0;
  const percent = Math.round((steps / goal) * 100);
  const low = percent < 40;
  return `
ДНЕВНОЙ СЦЕНАРИЙ.
${low ? 'Прошло меньше 40% нормы — мягко предложи микро-действие прямо сейчас.' : 'Поддержи темп, коротко отметь прогресс.'}
Сегодня: ${steps} из ${goal} (${percent}%).
`.trim();
}

function buildEveningPrompt(user, todaySteps, yesterdaySteps) {
  const goal = user?.daily_goal || 6000;
  const today = todaySteps ?? 0;
  const yesterday = yesterdaySteps ?? 0;
  const achieved = today >= goal;
  return `
ВЕЧЕРНИЙ СЦЕНАРИЙ.
Подведи итог дня.
Сегодня: ${today} шагов, вчера: ${yesterday} шагов, норма: ${goal}.
${achieved
  ? 'Цель выполнена — порадуйся конкретно, отметь, что именно сработало.'
  : 'Цель не выполнена — без стыда разбери причину и предложи одно микро-действие на завтра.'}
`.trim();
}

function buildSlipPrompt(user, missedDays) {
  const name = user?.name || 'друг';
  const days = missedDays ?? 0;
  return `
СЦЕНАРИЙ ВОЗВРАТА ПОСЛЕ СРЫВА.
${name} пропустил ${days} дн. подряд.
Правила: без стыда, без «надо было», без драматизации. Признай факт спокойно, предложи вернуться с минимального шага (например, 500 шагов или 10 минут).
Задача — вернуть в ритм, а не «наверстать упущенное».
`.trim();
}

module.exports = {
  buildMorningPrompt,
  buildDayPrompt,
  buildEveningPrompt,
  buildSlipPrompt,
};