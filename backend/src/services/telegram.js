// Telegram-уведомления для админа (fire-and-forget)
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const log = require('../utils/logger');

async function notifyNewUser(user, currentSteps = null) {

    try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!token || token === 'your_bot_token_here') {
      log.warn('[telegram] TELEGRAM_BOT_TOKEN не задан');
      return;
    }
    if (!chatId || chatId === 'your_chat_id_here') {
      log.warn('[telegram] TELEGRAM_ADMIN_CHAT_ID не задан');
      return;
    }

    const text = `👟 Новый пользователь
Имя: ${user.name || '—'}
Средние шаги: ${currentSteps ?? user.avg_steps ?? '—'}
Цель: ${user.daily_goal ?? '—'}`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.error(`[telegram] HTTP ${res.status}: ${body.slice(0, 200)}`);
      return;
    }

    log.info(`[telegram] Уведомление отправлено: user=${user.id}`);
  } catch (err) {
    log.error(`[telegram] Ошибка: ${err.message}`);
  }
}

module.exports = { notifyNewUser };