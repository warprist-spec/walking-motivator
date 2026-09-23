# Архитектура Walking Motivator (MVP)

> AI-партнёр по ходьбе. Цель MVP — работающий продукт за 7–10 дней.
> **Статус:** Этапы 0–5 реализованы. AI-слой — ChatAnywhere (OpenAI-совместимый API).

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
| AI-слой | Генерация сообщений, разбор срывов, Vision | ChatAnywhere (OpenAI SDK) |
| БД | Пользователи, шаги, сообщения, цели | SQLite (`better-sqlite3`) |
| Android Webhook | Приём данных от шагомера | HTTP POST + shared secret |
| Планировщик | Утро/вечер пинги, проверка срывов | node-cron |

## 3. Структура монорепо

```
walking-motivator/
├── backend/                 # Node.js API + AI
│   ├── src/
│   │   ├── routes/          # user.js, steps.js, chat.js, screenshot.js
│   │   ├── services/        # steps.js, ai.js, habit.js
│   │   ├── db/              # index.js, migrate.js, schema.sql
│   │   ├── prompts/         # system.js, morning.js, day.js, evening.js, slip.js
│   │   ├── utils/           # logger.js, date.js
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
- AI: `openai` SDK через **ChatAnywhere** (OpenAI-совместимый endpoint)
- Модели: `gpt-4o-mini` — текст и Vision (200 запросов/день), `gpt-4o` — только fallback (5 запросов/день)
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
OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL,
OPENAI_MODEL_VISION, OPENAI_TEMPERATURE,
AI_TIMEZONE, AI_MORNING_HOUR, AI_EVENING_HOUR,
WEBHOOK_SECRET, ALLOWED_ORIGINS, LOG_LEVEL
```

## 9. План на 7–10 дней

| День | Задача | Статус |
|---|---|---|
| 0 | Структура, git init, push | ✅ |
| 1 | Backend skeleton + SQLite + /api/user | ✅ |
| 2 | /api/steps + webhook-secret + progress | ✅ |
| 3 | ChatAnywhere + /api/chat + system-промпт | ⏳ |
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

---

## 11. Контракт `/api/chat`

**POST** `/api/chat`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "userId": 1,
  "message": "Прошёл только 3000 шагов, чувствую себя виноватым",
  "context": "evening"
}
```

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `userId` | number | да | ID пользователя из `/api/user` |
| `message` | string | да | Текст пользователя (1–2000 символов) |
| `context` | enum | нет | `morning` \| `day` \| `evening` \| `slip` — по умолчанию `day` |

**Response 200:**
```json
{
  "reply": "Слушай, 3000 шагов — это тоже шаги. Давай завтра поставим цель 4000?",
  "context": "evening",
  "model": "gpt-4o-mini",
  "tokens": { "prompt": 512, "completion": 87 }
}
```

**Ошибки:**
- `400` — невалидное тело
- `404` — пользователь не найден
- `429` — превышен лимит запросов ChatAnywhere
- `502` — ошибка upstream AI

**Side effects:**
- Сохраняет пару `user` + `assistant` в таблицу `messages`
- Подтягивает прогресс за сегодня из `steps` для контекста

---

## 12. Промпты (src/prompts/)

**System-промпт** (`src/prompts/system.js`) — задаёт личность и правила:
- Роль: «AI-партнёр по ходьбе», дружелюбный, без осуждения.
- Не даёт медицинских советов, не ставит диагнозы.
- Фокус на маленьких шагах: не «пройди 10 000», а «давай +500 к вчерашнему».
- Всегда называет конкретное микро-действие.
- Отвечает коротко: 2–4 предложения.

**Сценарные промпты** (`src/prompts/morning.js`, `day.js`, `evening.js`, `slip.js`):
| Файл | Когда | Тон |
|---|---|---|
| `morning.js` | 07:00–10:00 | Бодрый, ставим цель на день |
| `day.js` | 10:00–19:00 | Поддерживающий чек-ин |
| `evening.js` | 19:00–23:00 | Итог дня, мягкая корректировка |
| `slip.js` | Пользователь признался в срыве | Признать → объяснить → микро-действие |

Промпт = `system` + `scenario` + блок «Контекст LLM» (см. раздел 14).

---

## 13. Триггеры вызова AI

| Триггер | Источник | Когда |
|---|---|---|
| Пользователь пишет в чат (Tilda / Telegram) | POST `/api/chat` | В любой момент |
| Утренний пинг | `node-cron` 08:00 (TZ пользователя) | Раз в день |
| Вечерний пинг | `node-cron` 21:00 (TZ пользователя) | Раз в день |
| Срыв (шаги < 50% от цели к 20:00) | cron-проверка + `/api/chat` context=`slip` | По условию |
| Достижение цели | POST `/api/steps` (steps ≥ goal) | Сразу после обновления |
| Скриншот шагомера загружен | POST `/api/screenshot` | По факту загрузки |

Триггеры «событие → сообщение» реализуются через **внутренний вызов** функции `generateMessage(userId, context)`, а не через HTTP-эндпоинт — чтобы не плодить сетевые вызовы.

---

## 14. Контекст LLM — что подставляется в промпт

Перед каждым вызовом AI собирается **блок контекста** (в виде JSON-строки в system-сообщении):

```json
{
  "user": {
    "name": "Иван",
    "timezone": "Europe/Berlin",
    "daily_goal": 7000
  },
  "today": {
    "date": "2026-09-22",
    "steps": 3200,
    "percent": 46,
    "achieved": false
  },
  "yesterday": {
    "steps": 6500,
    "achieved": true
  },
  "last_7_days_avg": 5800,
  "streak_days": 3,
  "recent_slips": 1,
  "context": "evening"
}
```

**Правила формирования:**
- `last_7_days_avg` — среднее по `steps` за 7 дней.
- `streak_days` — сколько дней подряд `steps ≥ daily_goal`.
- `recent_slips` — количество дней за 7, где `steps < 50% от goal`.
- История сообщений (таблица `messages`) — **только последние 10** (5 пар user/assistant), чтобы не раздувать токены.

Общий бюджет промпта: ~1500 токенов. При превышении — обрезаем историю.

---

## 15. Fallback для Vision (скриншоты шагомеров)

**Пайплайн:**
1. Пользователь загружает скриншот → POST `/api/screenshot` (multipart).
2. Изображение кодируется в base64 → `chat.completions` с `model=OPENAI_MODEL_VISION` (`gpt-4o-mini`).
3. В промпте просим вернуть **строго JSON**: `{ "steps": 8500, "date": "2026-09-22", "confidence": 0.9 }`.
4. Если `confidence < 0.6` или AI вернул невалидный JSON — **fallback-сценарий**.

**Fallback (по приоритету):**
1. **Ретрай 1 раз** с тем же скриншотом, но с уточнением: «Извлеки только число шагов и дату».
2. **Если снова неудача** — вернуть пользователю сообщение: «Не удалось распознать. Введи шаги вручную или пришли другой скриншот.» + инлайн-форму ввода.
3. **Если AI вернул `steps`, но не `date`** — считать, что скриншот за сегодня.
4. **Если AI вернул число вне диапазона 0–100 000** — отклонить, тот же fallback.

**Лимиты:**
- **Vision только на `gpt-4o-mini`** (200 запросов/день на весь аккаунт ChatAnywhere).
- На пользователя: **не более 5 скриншотов в сутки** (rate-limit по `user_id` + дата).
- На весь сервис: счётчик в БД (`usage_log`) + hard-stop при 190 запросах/день.

**Логирование:**
- `messages` сохраняет `role: user`, `content: "[screenshot] <extracted steps or error>"`.
- В таблицу `steps` пишем `source: 'screenshot'`.
---

## 16. Практика тестирования API

**PowerShell 5.x на Windows отправляет тело HTTP-запроса в системной кодировке (cp1251), не в UTF-8.**
Это ломает кириллицу при ручных проверках — русские буквы превращаются в `?`.

**Правильный паттерн:**
```powershell
$bodyJson = @{ userId = 1; message = "текст" } | ConvertTo-Json -Compress
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyJson)
Invoke-RestMethod -Uri http://localhost:3000/api/chat -Method Post -Body $bodyBytes -ContentType "application/json; charset=utf-8"
---

## 18. Технический долг и TODO

### Активные TODO

| Проблема | Приоритет | План | Этап |
|---|---|---|---|
| User-stated slip: «пропал на неделю» vs БД «всё ок» | Средний | Добавить `extractSlipFromMessage` в `utils/stepsParser.js`, применять приоритет как для steps | 8+ |
| `Jest did not exit` после `chat.test.js` | Низкий | `--forceExit` в скрипте `test`, либо `db.close()` в `afterAll` | 10 |
| LF → CRLF предупреждения при коммите | Низкий | Добавить `.gitattributes` с `* text=auto eol=lf` | любой |
| `scripts/debug-parser.js` в репозитории | — | **Оставляем** как diagnostic utility — пригодится на Этапе 9 (Vision), для парсинга ответов модели | — |

### Детали: User-stated slip (Этап 8+)

**Проблема:**
Пользователь пишет «Я пропал на неделю», но в БД есть данные (Android присылал шаги автоматически). AI доверяет БД и отвечает «всё хорошо, ты молодец» — что противоречит состоянию пользователя.

**Решение:**
1. Добавить функцию `extractSlipFromMessage(message)` в `src/utils/stepsParser.js`
2. Парсит фразы: «пропал», «не ходил», «давно не отчитывался», «вернулся», «забросил» + опционально количество дней («на неделю», «на 3 дня»)
3. Возвращает `{ missedDays: number|null, detected: boolean }`
4. В `chat.js` при `detected=true` — приоритет user-stated над `getMissedDays(userId, db)`, как со steps

**Пример поведения после правки:**
- Юзер: «Я пропал на неделю» → `missedDays=7` (user-stated)
- AI отвечает с опорой на 7, а не на `getMissedDays=0` из БД

### Детали: `debug-parser.js`

**Оставляем** в `backend/scripts/`. Комментарий в начале файла:
```js
// Diagnostic utility: проверка парсинга шагов из текста.
// Используется при отладке stepsParser и — начиная с Этапа 9 — при отладке Vision-парсера.