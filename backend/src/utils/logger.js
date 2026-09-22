// Минимальный логгер
const level = process.env.LOG_LEVEL || 'info';
const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const current = levels[level] ?? 2;

module.exports = {
  error: (...a) => current >= 0 && console.error('[ERROR]', ...a),
  warn:  (...a) => current >= 1 && console.warn('[WARN]', ...a),
  info:  (...a) => current >= 2 && console.log('[INFO]', ...a),
  debug: (...a) => current >= 3 && console.log('[DEBUG]', ...a),
};