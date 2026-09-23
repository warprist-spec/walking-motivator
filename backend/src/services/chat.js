// Логика диалога с AI: сборка промпта, вызов ChatAnywhere, сохранение истории
const db = require('../db');
const { client, MODEL } = require('./openai');
const { buildSystemPrompt } = require('../prompts/system');
const {
  buildMorningPrompt,
  buildDayPrompt,
  buildEveningPrompt,
  buildSlipPrompt,
} = require('../prompts/scenarios');
const { getStreak, getMissedDays } = require('./habit');
const { extractStepsFromMessage } = require('../utils/stepsParser');
const log = require('../utils/logger');

function getTodaySteps(userId) {
  const row = db.prepare(
    "SELECT steps FROM steps WHERE user_id = ? AND date = date('now')"
  ).get(userId);
  return row ? row.steps : 0;
}

function getYesterdaySteps(userId) {
  const row = db.prepare(
    "SELECT steps FROM steps WHERE user_id = ? AND date = date('now', '-1 day')"
  ).get(userId);
  return row ? row.steps : 0;
}

function getRecentHistory(userId, limit = 10) {
  return db.prepare(
    'SELECT role, content FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT ?'
  ).all(userId, limit).reverse();
}

function saveMessage(userId, role, content) {
  db.prepare(
    'INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)'
  ).run(userId, role, content);
}

function buildScenarioPrompt(user, scenario, todaySteps) {
  switch (scenario) {
    case 'morning': return buildMorningPrompt(user, todaySteps);
    case 'day':     return buildDayPrompt(user, todaySteps);
    case 'evening': return buildEveningPrompt(user, todaySteps, getYesterdaySteps(user.id));
    case 'slip': {
      const missed = getMissedDays(user.id, db);
      return buildSlipPrompt(user, missed);
    }
    default:        return '';
  }
}

async function generateReply(userId, userMessage, scenario = null, startingSteps = null) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  // Приоритет: startingSteps > парсер из message > БД
  const parsedSteps = extractStepsFromMessage(userMessage);
  const dbSteps = getTodaySteps(userId);
  const effectiveSteps = startingSteps ?? parsedSteps ?? dbSteps;

  const systemBase = buildSystemPrompt(user, effectiveSteps);
  const scenarioPrompt = buildScenarioPrompt(user, scenario, effectiveSteps);
  const history = getRecentHistory(userId, 10);

  const systemContent = scenarioPrompt
    ? `${systemBase}\n\n${scenarioPrompt}`
    : systemBase;

  const messages = [
    { role: 'system', content: systemContent },
    ...history,
    { role: 'user', content: userMessage },
  ];

  saveMessage(userId, 'user', userMessage);

  log.info(`AI-запрос: user=${userId} scenario=${scenario || 'default'} history=${history.length} starting=${startingSteps ?? '—'} parsed=${parsedSteps ?? '—'} db=${dbSteps} effective=${effectiveSteps}`);

  const res = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: Number(process.env.OPENAI_TEMPERATURE) || 0.7,
    max_tokens: 300,
  });

  const reply = res.choices?.[0]?.message?.content?.trim() || '';
  saveMessage(userId, 'assistant', reply);

  return {
    reply,
    context: {
      currentNorm: user.daily_goal,
      todaySteps: effectiveSteps,
      streak: getStreak(userId, db),
    },
    model: res.model,
    tokens: res.usage || null,
  };
}

async function generateProactiveMessage(userId, scenario) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const todaySteps = getTodaySteps(userId);
  const systemBase = buildSystemPrompt(user, todaySteps);
  const scenarioPrompt = buildScenarioPrompt(user, scenario, todaySteps);
  const history = getRecentHistory(userId, 10);

  const messages = [
    { role: 'system', content: `${systemBase}\n\n${scenarioPrompt}` },
    ...history,
    { role: 'user', content: '[SYSTEM] Сгенерируй одно короткое входящее сообщение для пользователя по сценарию выше. Без префиксов.' },
  ];

  log.info(`AI-proactive: user=${userId} scenario=${scenario} history=${history.length}`);

  const res = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: Number(process.env.OPENAI_TEMPERATURE) || 0.7,
    max_tokens: 300,
  });

  const reply = res.choices?.[0]?.message?.content?.trim() || '';
  saveMessage(userId, 'assistant', reply);
  return reply;
}

module.exports = {
  generateReply,
  generateProactiveMessage,
  getTodaySteps,
  getRecentHistory,
};