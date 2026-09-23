require('dotenv').config();
const app = require('./src/app');
const { registerJobs } = require('./src/services/scheduler');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚶 Walking Motivator API running on http://localhost:${PORT}`);

  // Планировщик не запускаем в тестовом режиме
  if (process.env.NODE_ENV !== 'test') {
    registerJobs();
  }
});