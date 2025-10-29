# 🔑 Как настроить KYCAID для тестирования

## 1️⃣ Получить KYCAID API Key

1. Зарегистрируйся на https://kycaid.com
2. Перейди в Dashboard → Settings → API Keys
3. Создай новый API Key (или используй тестовый)
4. Скопируй API Key

## 2️⃣ Получить Form ID

1. В KYCAID Dashboard → Forms
2. Создай или выбери форму с Liveness Check
3. Скопируй Form ID (например: `form_basic_liveness`)

## 3️⃣ Обновить .env.local

```bash
# Замени эти значения на реальные
KYCAID_API_KEY="sk_live_xxxxxxxxxxxxxxxxxx"  # Твой реальный API key
KYCAID_FORM_ID="form_basic_liveness"          # Твой Form ID
KYCAID_WEBHOOK_SECRET="your-webhook-secret-minimum-32-characters"
KYCAID_BASE_URL="https://api.kycaid.com"
```

## 4️⃣ Настроить в Admin Panel

1. Открой http://localhost:3000/admin/integrations
2. Найди KYCAID
3. Включи интеграцию
4. Вставь:
   - **API Key**: `sk_live_...`
   - **Form ID**: `form_basic_liveness`
   - **Webhook Secret**: (минимум 32 символа)
5. Нажми "Test Connection"
6. Если успешно ✅ - нажми "Save"

## 5️⃣ Протестировать скрипт

```bash
# Создать верификацию для существующего applicant
npx tsx create-verification-for-applicant.ts

# Проверить статус
npx tsx check-kycaid-applicant.ts
```

## 6️⃣ Альтернатива: Ручное обновление для тестирования UI

Если нет реального KYCAID аккаунта, можно симулировать одобрение:

```bash
npx tsx simulate-kyc-approval.ts
```

---

**Примечание:** Без реального KYCAID API ключа polling и webhook работать не будут.

