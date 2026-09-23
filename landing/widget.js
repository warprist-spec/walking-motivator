// AI-виджет Walking Motivator — Этап 8
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WalkAI = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const API_BASE = window.WALK_AI_API || 'http://localhost:3000';
  const LS_KEY = 'walk_ai_user_id';

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function saveUserId(id) { localStorage.setItem(LS_KEY, String(id)); }
  function getUserId() {
    const v = localStorage.getItem(LS_KEY);
    return v == null ? null : Number(v);
  }

  function buildFirstMessage(name, currentSteps, dailyGoal) {
    if (currentSteps == null || currentSteps === '' || isNaN(Number(currentSteps))) {
      return `Привет, ${name}. Цель — ${dailyGoal} шагов в день. Давай для начала просто замерим обычный день — сколько получится без усилий.`;
    }
    return `Привет, ${name}. Сейчас я прохожу в среднем ${currentSteps} шагов в день. Цель — ${dailyGoal}.`;
  }

  async function submitOnboarding({ email, name, currentSteps, dailyGoal }) {
    const res = await fetch(`${API_BASE}/api/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, daily_goal: Number(dailyGoal) }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function sendMessage(userId, message, startingSteps) {
    const body = { userId, message };
    if (startingSteps != null && startingSteps !== '') body.startingSteps = Number(startingSteps);
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.reply;
  }

  // --- UI (только в браузере) ---
  function initWidget() {
    const $ = (s) => document.querySelector(s);
    const form = $('#onboarding-form');
    const chat = $('#chat-section') || $('#chat-widget');
    const log = $('#chat-log');
    const chatForm = $('#chat-form');
    const err = $('#form-error');
    const heroCta = $('#hero-cta');
    let userId = getUserId();

    if (heroCta) heroCta.addEventListener('click', () => {
      $('#onboarding-form').scrollIntoView({ behavior: 'smooth' });
      $('#email').focus();
    });

    function render(role, text) {
      const div = document.createElement('div');
      div.className = `message message--${role}`;
      div.textContent = text; // защита от XSS
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    }

    function showError(msg) {
      err.textContent = msg;
      err.hidden = false;
    }

    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true;
      const email = $('#email').value.trim();
      const name = $('#name').value.trim();
      const currentSteps = $('#current-steps').value.trim();
      const dailyGoal = $('#daily-goal').value.trim();

      if (!email || !email.includes('@')) return showError('Проверь, пожалуйста, email');
      if (!name) return showError('Проверь, пожалуйста, имя');
      if (!dailyGoal || Number(dailyGoal) <= 0) return showError('Проверь, пожалуйста, цель');

      const btn = form.querySelector('.form__submit');
      btn.disabled = true;
      try {
        const { user } = await submitOnboarding({ email, name, currentSteps, dailyGoal });
        userId = user.id;
        saveUserId(userId);

        const firstMsg = buildFirstMessage(name, currentSteps, dailyGoal);
        render('user', firstMsg);
        const reply = await sendMessage(userId, firstMsg, currentSteps || null);
        render('ai', reply);

        form.closest('section').hidden = true;
        chat.hidden = false;
      } catch (e) {
        showError('Что-то пошло не так. Попробуй ещё раз.');
      } finally {
        btn.disabled = false;
      }
    });

    if (chatForm) chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('#chat-input');
      const text = input.value.trim();
      if (!text) return;
      render('user', text);
      input.value = '';
      const btn = chatForm.querySelector('.chat__send');
      btn.disabled = true;
      try {
        const reply = await sendMessage(userId, text);
        render('ai', reply);
      } catch (e) {
        render('ai', 'Связь пропала. Попробуй ещё раз.');
      } finally {
        btn.disabled = false;
      }
    });
  }

  return {
    API_BASE, LS_KEY,
    escapeHtml, saveUserId, getUserId, buildFirstMessage,
    submitOnboarding, sendMessage, initWidget,
  };
});

if (typeof window !== 'undefined' && typeof module === 'undefined') {
  document.addEventListener('DOMContentLoaded', () => window.WalkAI.initWidget());
}