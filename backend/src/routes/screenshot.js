// POST /api/screenshot — приём скриншота шагомера → OCR → запись шагов
const express = require('express');
const multer = require('multer');
const db = require('../db');
const log = require('../utils/logger');
const { recognizeSteps } = require('../services/vision');
const { checkUserLimit, checkServiceLimit, recordUsage } = require('../services/rateLimit');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const MIN_CONFIDENCE = 0.6;

router.post('/', upload.single('image'), async (req, res) => {
  // 1. Проверка файла
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'Файл image обязателен' });
  }

  // 2. Проверка userId
  const userId = Number(req.body.userId);
  if (!userId || !Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'userId обязателен' });
  }

  // 3. Пользователь существует?
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // 4. User-лимит
  const userLimit = checkUserLimit(userId);
  if (!userLimit.allowed) {
    return res.status(429).json({
      error: 'Лимит скриншотов на сегодня исчерпан. Введи шаги вручную.',
      remaining: 0,
    });
  }

  // 5. Service-лимит
  const serviceLimit = checkServiceLimit();
  if (!serviceLimit.allowed) {
    return res.status(503).json({
      error: 'Сервис временно недоступен. Введи шаги вручную.',
      remaining: 0,
    });
  }

  // 6. OCR
  const base64 = req.file.buffer.toString('base64');
  let recognized;
  try {
    recognized = await recognizeSteps(base64);
  } catch (err) {
    log.error(`[screenshot] Vision ошибка: ${err.message}`);
    recordUsage(userId); // запрос всё равно потратил токены
    return res.status(502).json({
      error: 'Vision временно недоступен. Попробуй позже или введи шаги вручную.',
      details: err.message,
    });
  }

  // 7. Проверка результата
  const { steps, date, confidence } = recognized;
  const isReliable = steps !== null && confidence >= MIN_CONFIDENCE;

  if (!isReliable) {
    recordUsage(userId);
    log.info(`[screenshot] user=${userId} не распознан: steps=${steps} conf=${confidence}`);
    return res.json({
      steps: null,
      date: date || null,
      confidence: confidence || 0,
      message: 'Не смог прочитать. Введи вручную.',
    });
  }

  // 8. Записываем шаги
  const day = date || new Date().toISOString().slice(0, 10);

  const existing = db.prepare(
    'SELECT id FROM steps WHERE user_id = ? AND date = ?'
  ).get(userId, day);

  if (existing) {
    db.prepare('UPDATE steps SET steps = ?, source = ? WHERE id = ?')
      .run(steps, 'screenshot', existing.id);
  } else {
    db.prepare(
      'INSERT INTO steps (user_id, date, steps, source) VALUES (?, ?, ?, ?)'
    ).run(userId, day, steps, 'screenshot');
  }

  recordUsage(userId);
  log.info(`[screenshot] user=${userId} распознано: ${steps} шагов (conf=${confidence})`);

  res.json({
    steps,
    date: day,
    confidence,
    model: recognized.model,
  });
});

// Обработка ошибок multer (превышение размера, неверное поле)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл слишком большой (макс. 5 МБ)' });
    }
    return res.status(400).json({ error: `Multer: ${err.message}` });
  }
  next(err);
});

module.exports = router;