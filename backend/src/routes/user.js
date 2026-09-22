const express = require('express');
const { z } = require('zod');
const db = require('../db');
const log = require('../utils/logger');

const router = express.Router();

// Валидация входных данных
const UserSchema = z.object({
  email: z.string().email().optional(),
  tg_id: z.string().optional(),
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().default('Europe/Berlin'),
  daily_goal: z.number().int().min(1000).max(50000).default(6000),
}).refine(d => d.email || d.tg_id, {
  message: 'Нужен email или tg_id',
});

// POST /api/user — создать или получить существующего
router.post('/', (req, res) => {
  const parsed = UserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }
  const { email, tg_id, name, timezone, daily_goal } = parsed.data;

  // Ищем существующего
  const findBy = email ? 'email' : 'tg_id';
  const findValue = email || tg_id;
  let user = db.prepare(`SELECT * FROM users WHERE ${findBy} = ?`).get(findValue);

  if (!user) {
    const info = db.prepare(`
      INSERT INTO users (email, tg_id, name, timezone, daily_goal)
      VALUES (?, ?, ?, ?, ?)
    `).run(email || null, tg_id || null, name || null, timezone, daily_goal);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    log.info('Создан новый пользователь', user.id, user.email || user.tg_id);
    return res.status(201).json({ user, created: true });
  }

  log.info('Найден пользователь', user.id);
  res.json({ user, created: false });
});

// GET /api/user/:id — получить пользователя
router.get('/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

module.exports = router;