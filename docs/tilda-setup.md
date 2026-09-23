# Перенос виджета в Tilda

## 1. Скопируй widget.html
Открой `landing/widget.html` — это фрагмент без обёрток.

## 2. Создай блок T123
- На странице Tilda → **Добавить блок** → **HTML-код (T123)**
- Вставь фрагмент целиком

## 3. Укажи API backend
В конце фрагмента, перед `<script src="widget.js">`:
```html
<script>window.WALK_AI_API='http://localhost:3000';</script>