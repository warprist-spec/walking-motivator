// POST /api/chat — сообщение пользователя → ответ AI
const express = require('express');
const { z } = require('zod');
const { generateReply } = require('../services/chat');
const db = require('../db');
const log = require('../utils/logger');

const router = express.Router();

const ChatSchema = z.object({
  userId: z.number().int().positive(),
  message: z.string().min(1, 'message is required').max(2000),
  scenario: z.enum(['morning', 'day', 'evening', 'slip']).optional(),
  startingSteps: z.number().int().min(100).max(100000).nullable().optional(),
});

router.post('/', async (req, res) => {
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }

  const { userId, message, scenario, startingSteps } = parsed.data;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    const result = await generateReply(userId, message, scenario || null, startingSteps ?? null);
    res.json({
      reply: result.reply,
      context: result.context,
      model: result.model,
      tokens: result.tokens,
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: 'User not found' });
    }
    log.error('Ошибка AI:', err.message);
    if (err.status === 429 || /rate.?limit/i.test(err.message)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    }
    res.status(502).json({ error: 'AI upstream error', details: err.message });
  }
});

router.get('/history/:userId', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const messages = db.prepare(
    'SELECT id, role, content, created_at FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT ?'
  ).all(req.params.userId, limit).reverse();

  res.json({ messages });
});

module.exports = router;