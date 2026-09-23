# Проверка API из PowerShell (UTF-8)

## Проблема
PowerShell 5.x отправляет тело в cp1251. Кириллица → `?????`.

## Решение
```powershell
$bodyJson = @{ userId = 1; message = "Привет" } | ConvertTo-Json -Compress
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyJson)
Invoke-RestMethod -Uri http://localhost:3000/api/chat -Method Post -Body $bodyBytes -ContentType "application/json; charset=utf-8"