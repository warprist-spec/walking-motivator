const path = require('path');
const widgetPath = path.join(__dirname, '..', '..', 'landing', 'widget.js');
let widget;

beforeAll(() => {
  global.window = {};
  global.document = { addEventListener: () => {}, querySelector: () => null };
  global.localStorage = {
    _d: {},
    getItem(k) { return this._d[k] ?? null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  };
  global.fetch = jest.fn();
  widget = require(widgetPath);
});

beforeEach(() => { jest.clearAllMocks(); global.localStorage._d = {}; });

test('escapeHtml экранирует', () => {
  expect(widget.escapeHtml('<b>&"\'')).toBe('&lt;b&gt;&amp;&quot;&#39;');
  expect(widget.escapeHtml(null)).toBe('');
});

test('buildFirstMessage: с шагами / без', () => {
  const a = widget.buildFirstMessage('Аня', 4200, 8000);
  expect(a).toContain('Аня'); expect(a).toContain('4200'); expect(a).toContain('8000');
  const b = widget.buildFirstMessage('Аня', null, 8000);
  expect(b).toContain('Аня'); expect(b).not.toMatch(/undefined|null/);
});

test('localStorage: walk_ai_user_id', () => {
  widget.saveUserId(42);
  expect(global.localStorage._d['walk_ai_user_id']).toBe('42');
  expect(widget.getUserId()).toBe(42);
});

test('submitOnboarding: POST /api/user без current_steps', async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ user: { id: 1 } }) });
  await widget.submitOnboarding({ email: 'a@b.c', name: 'X', currentSteps: 4000, dailyGoal: 7000 });
  const body = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(body).toEqual({ email: 'a@b.c', name: 'X', daily_goal: 7000 });
  expect(body.current_steps).toBeUndefined();
});

test('sendMessage: передаёт startingSteps', async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'OK' }) });
  await widget.sendMessage(1, 'Привет', 4200);
  const body = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(body.userId).toBe(1);
  expect(body.message).toBe('Привет');
  expect(body.startingSteps).toBe(4200);
});