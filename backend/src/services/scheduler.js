// Планировщик: cron-джобы для утро / день / вечер
const cron = require('node-cron');
const db = require('../db');
const { generateProactiveMessage } = require('./chat');
const {
  isInSlip,
  shouldPingDay,
  getMissedDays,
} = require('./habit');
const log = require('../utils/logger');

// --- Хелпер: получить всех пользователей ---
function getAllUsers() {
  return db.prepare('SELECT id, timezone FROM users').all();
}

// --- Хелпер: ISO-таймстемп в таймзоне пользователя ---
function isoTimestamp(tz) {
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: tz || 'UTC',
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date()) + ' ' + (tz || 'UTC');
  } catch {
    return new Date().toISOString();
  }
}

// --- Хелпер: логирование джоба ---
function logJob(name, tz, total, messaged, skipped) {
  log.info(`[scheduler] ${isoTimestamp(tz)} ${name} check: ${total} users, ${messaged} messaged, ${skipped} skipped`);
}

// --- Утро ---
async function runMorningCheck() {
  const users = getAllUsers();
  let messaged = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      await generateProactiveMessage(user.id, 'morning');
      messaged++;
    } catch (err) {
      log.error(`[scheduler] morning check: user=${user.id} failed: ${err.message}`);
      skipped++;
    }
  }

  logJob('morning', process.env.AI_TIMEZONE, users.length, messaged, skipped);
}

// --- День ---
async function runDayCheck() {
  const users = getAllUsers();
  let messaged = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      if (!shouldPingDay(user.id, db)) {
        skipped++;
        continue;
      }
      await generateProactiveMessage(user.id, 'day');
      messaged++;
    } catch (err) {
      log.error(`[scheduler] day check: user=${user.id} failed: ${err.message}`);
      skipped++;
    }
  }

  logJob('day', process.env.AI_TIMEZONE, users.length, messaged, skipped);
}

// --- Вечер ---
async function runEveningCheck() {
  const users = getAllUsers();
  let messaged = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      if (isInSlip(user.id, db)) {
        // Отдельный сценарий: возврат после срыва
        await generateProactiveMessage(user.id, 'slip');
      } else {
        await generateProactiveMessage(user.id, 'evening');
      }
      messaged++;
    } catch (err) {
      log.error(`[scheduler] evening check: user=${user.id} failed: ${err.message}`);
      skipped++;
    }
  }

  logJob('evening', process.env.AI_TIMEZONE, users.length, messaged, skipped);
}

// --- Регистрация cron-задач ---
function registerJobs() {
  const tz = process.env.AI_TIMEZONE || 'Europe/Berlin';
  const morningHour = Number(process.env.AI_MORNING_HOUR || 8);
  const dayHour = Number(process.env.AI_DAY_HOUR || 15);
  const eveningHour = Number(process.env.AI_EVENING_HOUR || 21);

  cron.schedule(`0 ${morningHour} * * *`, runMorningCheck, { timezone: tz });
  cron.schedule(`0 ${dayHour} * * *`, runDayCheck, { timezone: tz });
  cron.schedule(`0 ${eveningHour} * * *`, runEveningCheck, { timezone: tz });

  log.info(`[scheduler] jobs registered: morning=${morningHour}, day=${dayHour}, evening=${eveningHour}, tz=${tz}`);
}

module.exports = {
  registerJobs,
  runMorningCheck,
  runDayCheck,
  runEveningCheck,
};