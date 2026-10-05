// Vision-клиент ChatAnywhere: распознавание шагов со скриншота
// Отдельный fetch-клиент (не используем SDK из openai.js — инкапсуляция)
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { buildVisionPrompt } = require('../prompts/vision');
const log = require('../utils/logger');

const API_KEY = process.env.CHATANYWHERE_API_KEY || '';
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.chatanywhere.tech/v1';
const MODEL = process.env.OPENAI_MODEL_VISION || 'gpt-4o-mini';

// Убрать markdown-обёртку ```json ... ```
function stripMarkdown(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw.trim();
  // ```json ... ``` или ``` ... ```
  const fenceMatch = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return s;
}

// Парсер ответа модели → { steps, date, confidence }
function parseVisionResponse(raw) {
  const fallback = { steps: null, date: null, confidence: 0 };
  if (!raw || typeof raw !== 'string') return fallback;

  const cleaned = stripMarkdown(raw);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return fallback;
  }

  if (!parsed || typeof parsed !== 'object') return fallback;

  // steps: число > 0 или null
  let steps = null;
  if (typeof parsed.steps === 'number' && Number.isFinite(parsed.steps) && parsed.steps > 0) {
    steps = Math.round(parsed.steps);
  }

  // date: строка YYYY-MM-DD или null
  let date = null;
  if (typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
    date = parsed.date;
  }

  // confidence: 0–1
  let confidence = 0;
  if (typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)) {
    confidence = Math.max(0, Math.min(1, parsed.confidence));
  }

  return { steps, date, confidence };
}

// Реальный вызов ChatAnywhere Vision
async function recognizeSteps(imageBase64) {
  if (!API_KEY || API_KEY.startsWith('sk-xxx')) {
    const err = new Error('CHATANYWHERE_API_KEY не задан');
    err.status = 502;
    throw err;
  }

  const dataUrl = `data:image/png;base64,${imageBase64}`;

  const body = {
    model: MODEL,
    temperature: 0.1,
    max_tokens: 200,
    messages: [
      { role: 'system', content: buildVisionPrompt() },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Распознай шаги со скриншота. Верни строго JSON.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  };

  log.info(`[vision] Запрос к ${MODEL}, base64=${Math.round(imageBase64.length / 1024)} КБ`);

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Vision upstream HTTP ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '';
  const parsed = parseVisionResponse(raw);

  return {
    ...parsed,
    model: data.model || MODEL,
    tokens: data.usage || null,
    rawResponse: raw.slice(0, 500),
  };
}

module.exports = { recognizeSteps, parseVisionResponse };