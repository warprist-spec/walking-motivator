// Тесты Vision (OCR скриншотов шагомеров) — Этап 9
const path = require('path');

const visionServicePath = '../src/services/vision';
const visionPromptPath = '../src/prompts/vision';

describe('prompts/vision.js — buildVisionPrompt', () => {
  test('Тест 5: возвращает строку, содержит JSON, confidence, steps', () => {
    const { buildVisionPrompt } = require(visionPromptPath);
    const out = buildVisionPrompt();
    expect(typeof out).toBe('string');
    expect(out).toContain('JSON');
    expect(out).toContain('confidence');
    expect(out).toContain('steps');
  });
});

describe('services/vision.js — parseVisionResponse', () => {
  test('Тест 1: валидный JSON → объект', () => {
    const { parseVisionResponse } = require(visionServicePath);
    const out = parseVisionResponse('{"steps": 5000, "date": "2026-10-01", "confidence": 0.9}');
    expect(out.steps).toBe(5000);
    expect(out.date).toBe('2026-10-01');
    expect(out.confidence).toBe(0.9);
  });

  test('Тест 2: markdown-обёртка ```json ... ``` → объект', () => {
    const { parseVisionResponse } = require(visionServicePath);
    const raw = '```json\n{"steps": 4200, "date": "2026-09-30", "confidence": 0.85}\n```';
    const out = parseVisionResponse(raw);
    expect(out.steps).toBe(4200);
    expect(out.confidence).toBe(0.85);
  });

  test('Тест 3: не-JSON → { steps: null, confidence: 0 }', () => {
    const { parseVisionResponse } = require(visionServicePath);
    const out = parseVisionResponse('не JSON');
    expect(out.steps).toBeNull();
    expect(out.confidence).toBe(0);
  });

  test('Тест 4: steps: null, confidence: 0.3 → сохранить', () => {
    const { parseVisionResponse } = require(visionServicePath);
    const out = parseVisionResponse('{"steps": null, "confidence": 0.3}');
    expect(out.steps).toBeNull();
    expect(out.confidence).toBe(0.3);
  });
});