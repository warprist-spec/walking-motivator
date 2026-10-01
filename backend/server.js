require('dotenv').config();
const app = require('./src/app');
const { registerJobs } = require('./src/services/scheduler');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚶 Walking Motivator API running on http://localhost:${PORT}`);

  // Планировщик не запускаем в тестовом режиме
const schedulerEnabled = process.env.SCHEDULER_ENABLED === 'true';
if (process.env.NODE_ENV !== 'test' && schedulerEnabled) {
  registerJobs();
} else {
  console.log('⏸️  Scheduler disabled (SCHEDULER_ENABLED != true)');
}
});