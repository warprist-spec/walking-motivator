const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { saveSteps, getTodayProgress } = require('../services/steps');
const log = require('../utils/logger');

const router = express.Router();

// Валидация входных данных
const StepsSchema = z.object({
  userId: z.number().int().positive(),
  steps: z.number().int().min(0).max(200000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  source: z.enum(['android', 'screenshot', 'manual']).default('android'),
});

// Проверка секрета webhook
function checkSecret(req, res, next) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected || expected === 'change_me_long_random_string') {
    return next(); // в dev-режиме пропускаем, если секрет не задан
  }
  const got = req.headers['x-webhook-secret'];
  if (got !== expected) {
    log.warn('Неверный webhook secret от', req.ip);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /api/steps — сохранить шаги
router.post('/', checkSecret, (req, res) => {
  const parsed = StepsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }

  // Проверим, что пользователь существует
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(parsed.data.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const saved = saveSteps(parsed.data);
  log.info(`Шаги: user=${parsed.data.userId} steps=${parsed.data.steps} source=${parsed.data.source}`);

  const progress = getTodayProgress(parsed.data.userId);
  res.status(201).json({ saved, progress });
});

// GET /api/steps/progress/:userId
router.get('/progress/:userId', (req, res) => {
  const progress = getTodayProgress(Number(req.params.userId));
  if (!progress) return res.status(404).json({ error: 'User not found' });
  res.json(progress);
});

module.exports = router;