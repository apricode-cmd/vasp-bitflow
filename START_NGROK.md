# 🚀 Запуск ngrok для Sumsub Webhook

## Шаг 1: Открой НОВЫЙ терминал

Открой новое окно терминала (⌘T или новая вкладка)

## Шаг 2: Запусти ngrok

```bash
ngrok http 3000
```

## Шаг 3: Скопируй URL

После запуска увидишь:

```
Session Status                online
Account                       ...
Version                       3.31.0
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000  ⬅️ СКОПИРУЙ ЭТО!
```

**Скопируй URL** вида: `https://abc123.ngrok-free.app`

## Шаг 4: Настрой webhook в Sumsub

1. Открой Sumsub Dashboard: https://cockpit.sumsub.com
2. Settings → Webhooks → Add Webhook
3. **Webhook URL**: `https://abc123.ngrok-free.app/api/kyc/webhook/sumsub` (замени на свой URL!)
4. **Events**: выбери:
   - `applicantReviewed`
   - `applicantPending`
   - `applicantOnHold`
5. **Save**

## Шаг 5: Проверь webhook

```bash
curl http://localhost:3000/api/kyc/webhook/sumsub
```

Должен вернуть:
```json
{
  "service": "Sumsub Webhook Endpoint",
  "status": "active",
  "timestamp": "..."
}
```

## Шаг 6: Пройди KYC заново

1. Удали текущую сессию (или создай нового пользователя)
2. Пройди KYC verification
3. Webhook автоматически обновит статус!

---

## 🔍 Мониторинг webhook

Открой ngrok web interface: http://localhost:4040

Там увидишь все входящие запросы от Sumsub в реальном времени!

