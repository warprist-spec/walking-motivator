// AI-клиент ChatAnywhere (OpenAI-совместимый API)
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const OpenAI = require('openai');

const API_KEY = process.env.CHATANYWHERE_API_KEY || '';
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.chatanywhere.tech/v1';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MODEL_VISION = process.env.OPENAI_MODEL_VISION || 'gpt-4o-mini';

if (!API_KEY || API_KEY.startsWith('sk-xxx')) {
  console.warn('[openai] CHATANYWHERE_API_KEY не задан или оставлен заглушкой. Реальные вызовы не сработают.');
}

const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: BASE_URL,
});

module.exports = { client, MODEL, MODEL_VISION, BASE_URL };