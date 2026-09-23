// Standalone-проверка ChatAnywhere: запуск `node test-openai.js`
require('dotenv').config();

const { client, MODEL, BASE_URL } = require('./src/services/openai');

(async () => {
  console.log('Base URL:', BASE_URL);
  console.log('Model:   ', MODEL);
  console.log('Отправляю тестовый запрос...');

  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'user', content: 'Скажи "работает" одним словом' },
      ],
      max_tokens: 10,
    });

    const reply = res.choices?.[0]?.message?.content;
    console.log('Ответ:   ', reply);
    console.log('Модель:  ', res.model);
    console.log('✅ ChatAnywhere OK');
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
})();