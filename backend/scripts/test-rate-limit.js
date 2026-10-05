require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/db');
const { checkUserLimit, recordUsage } = require('../src/services/rateLimit');

const userId = Number(process.argv[2]);
if (!userId) {
  console.error('Использование: node scripts/test-rate-limit.js <userId>');
  process.exit(1);
}

console.log('Текущий лимит:', checkUserLimit(userId));
console.log('Забиваем до 5...');
for (let i = 0; i < 5; i++) recordUsage(userId);
console.log('После 5 записей:', checkUserLimit(userId));

// Откат
db.prepare("DELETE FROM usage_log WHERE user_id = ? AND kind = 'vision_user'").run(userId);
console.log('После отката:', checkUserLimit(userId));