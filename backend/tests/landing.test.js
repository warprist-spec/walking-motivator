const fs = require('fs');
const path = require('path');
const L = path.join(__dirname, '..', '..', 'landing');
const D = path.join(__dirname, '..', '..', 'docs');

describe('landing', () => {
  test('index.html: форма + widget.js + тексты', () => {
    const h = fs.readFileSync(path.join(L, 'index.html'), 'utf8');
    expect(h).toMatch(/id="onboarding-form"/);
    expect(h).toMatch(/id="email"/);
    expect(h).toMatch(/id="name"/);
    expect(h).toMatch(/id="current-steps"/);
    expect(h).toMatch(/id="daily-goal"/);
    expect(h).toMatch(/id="chat-widget"/);
    expect(h).toMatch(/widget\.js/);
    expect(h).toMatch(/Пройти свою норму\. Без давления\./);
  });

  test('widget.html: .walk-ai, форма, чат, prefers-reduced-motion, без doctype/body', () => {
    const h = fs.readFileSync(path.join(L, 'widget.html'), 'utf8');
    expect(h).toMatch(/class="walk-ai"/);
    expect(h).toMatch(/id="onboarding-form"/);
    expect(h).toMatch(/id="chat-widget"/);
    expect(h).toMatch(/prefers-reduced-motion/);
    expect(h).not.toMatch(/<!doctype/i);
    expect(h).not.toMatch(/<body/i);
  });

  test('widget.js существует и экспортирует', () => {
    const c = fs.readFileSync(path.join(L, 'widget.js'), 'utf8');
    expect(c).toMatch(/module\.exports/);
  });

  test('docs: tilda-setup.md + api-powershell-guide.md', () => {
    expect(fs.existsSync(path.join(D, 'tilda-setup.md'))).toBe(true);
    expect(fs.existsSync(path.join(D, 'api-powershell-guide.md'))).toBe(true);
  });
});