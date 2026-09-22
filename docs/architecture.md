# Архитектура Walking Motivator (MVP)

> AI-партнёр по ходьбе. Цель MVP — работающий продукт за 7–10 дней.

**Статус:** Этапы 0–5 реализованы (структура, БД, /api/user, /api/steps).

---

## 1. Продукт

- Помогает выработать привычку ежедневно проходить норму шагов.
- Принимает данные из Android-шагомера и скриншоты из сторонних приложений.
- Ведёт диалог с пользователем: утро / день / вечер.
- Разбирает срывы (недошёл норму) в поддерживающем тоне.
- Постепенно повышает дневную норму.

## 2. Компоненты

| Компонент | Роль | Технология |
|---|---|---|
| Landing | Привлечение и онбординг | Tilda |
| Backend API | Приём шагов, диалог с AI, хранение | Node.js + Express |
| AI-слой | Генерация сообщений, разбор срывов | OpenAI SDK (gpt-4o-mini) |
| БД | Пользователи, шаги, сообщения, цели | SQLite (`better-sqlite3`) |
| Android Webhook | Приём данных от шагомера | HTTP POST + shared secret |
| Планировщик | Утро/вечер пинги | node-cron |

## 3. Структура монорепо

```
walking-motivator/
├── backend/                 # Node.js API + AI
│   ├── src/
│   │   ├── routes/          # user.js, steps.js, (chat.js, webhook.js)
│   │   ├── services/        # steps.js, (ai.js, habit.js)
│   │   ├── db/              # index.js, migrate.js, schema.sql
│   │   ├── prompts/         # system.js, morning/day/evening.js
│   │   ├── utils/           # logger.js, (date.js)
│   │   └── app.js           # сборка Express
│   ├── data/                # SQLite (в .gitignore)
│   ├── server.js
│   ├── .env                 # локально (в .gitignore)
│   └── .env.example         # шаблон
├── android-webhook/         # приёмник шагов от Android
├── landing/                 # HTML-прототип для Tilda
├── docs/                    # JTBD, scenarios, architecture, api
└── README.md
```

## 4. Стек

- Runtime: Node.js 20 LTS
- Web: Express 4 + `cors` + `morgan`
- БД: SQLite (`better-sqlite3`, режим WAL)
- AI: `openai` SDK, модель `gpt-4o-mini`
- Валидация: `zod`
- Планировщик: `node-cron`
- Env: `dotenv`
- Деплой: Railway / Render (позже)

## 5. Эндпоинты

| Метод | Путь | Статус | Назначение |
|---|---|---|---|
| GET  | `/` | ✅ | Health-check |
| POST | `/api/user` | ✅ | Создать / получить пользователя |
| GET  | `/api/user/:id` | ✅ | Получить пользователя |
| POST | `/api/steps` | ✅ | Принять шаги (`X-Webhook-Secret`) |
| GET  | `/api/steps/progress/:userId` | ✅ | Прогресс за сегодня |
| POST | `/api/chat` | ⏳ | Сообщение → ответ AI (Этап 6) |
| POST | `/api/screenshot` | ⏳ | Скриншот шагомера → AI Vision (Этап 10) |
| GET  | `/api/history/:userId` | ⏳ | История сообщений |

## 6. Схема данных (SQLite)

- **users** — `id, tg_id, email, name, timezone, daily_goal, created_at`
- **steps** — `id, user_id, date, steps, source, created_at`
- **messages** — `id, user_id, role, content, created_at`
- **goals** — `id, user_id, target_steps, effective_from, created_at`

Индексы: `(user_id, date)` для steps, `(user_id, created_at)` для messages.

## 7. AI-сценарии

- **Утро** — приветствие + цель на день.
- **День** — чек-ин, поддержка.
- **Вечер** — итог дня, разбор срыва, мягкая корректировка нормы.
- **Разбор срыва** — 3 шага: признать → объяснить → предложить микро-действие.

Тон: дружелюбный, без осуждения, без медицинских советов, фокус на привычке.

## 8. Переменные окружения

См. `backend/.env.example`:

```
PORT, NODE_ENV, DB_PATH,
OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TEMPERATURE,
AI_TIMEZONE, AI_MORNING_HOUR, AI_EVENING_HOUR,
WEBHOOK_SECRET, ALLOWED_ORIGINS, LOG_LEVEL
```

## 9. План на 7–10 дней

| День | Задача | Статус |
|---|---|---|
| 0 | Структура, git init, push | ✅ |
| 1 | Backend skeleton + SQLite + /api/user | ✅ |
| 2 | /api/steps + webhook-secret + progress | ✅ |
| 3 | OpenAI + /api/chat + system-промпт | ⏳ |
| 4 | Сценарии утро/день/вечер + cron | ⏳ |
| 5 | Лендинг в Tilda + форма → /api/user | ⏳ |
| 6 | Скриншоты шагомеров (AI Vision) | ⏳ |
| 7 | Деплой backend на Railway | ⏳ |
| 8–10 | Тесты на живых людях, правки промптов | ⏳ |

## 10. Что сознательно НЕ входит в MVP

- Авторизация (OAuth, JWT) — используем `email` / `tg_id` как ключ.
- Postgres / Redis / очереди — SQLite хватит до ~1000 юзеров.
- TypeScript / Prisma / NestJS — усложняют старт.
- Мобильные приложения (кроме шагомера) — Tilda + Telegram-бот.