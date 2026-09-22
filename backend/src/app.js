require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const userRoutes = require('./routes/user');
const stepsRoutes = require('./routes/steps');

const app = express();

// CORS
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: allowed.length ? allowed : true,
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

// Health-check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'walking-motivator', version: '0.1.0' });
});

// Роуты
app.use('/api/user', userRoutes);
app.use('/api/steps', stepsRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('[UNHANDLED]', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;