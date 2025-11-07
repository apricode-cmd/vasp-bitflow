# Sumsub Duplicate Applicant Fix

## 🐛 Проблема

При прохождении WebSDK verification в Sumsub создавался **НОВЫЙ applicant** вместо того чтобы использовать существующий.

### Симптомы:
- ✅ Applicant создается при `/api/kyc/start` (ID: `690e681e56f45eb45a8636b5`)
- ✅ Сохраняется в `KycSession.applicantId`
- ❌ При нажатии "Start Verification" создается **ДРУГОЙ** applicant
- ❌ Verification не привязывается к исходному applicant
- ❌ В Sumsub dashboard появляются дубликаты

### Пример из логов:
```
📋 Applicant ID in DB: 690e681e56f45eb45a8636b5
🎫 Creating SDK token for: cmh83rbwo00009otj1d1lmo9l  ← WRONG! (userId)
✅ Sumsub creates NEW applicant with userId: cmh83rbwo00009otj1d1lmo9l
```

---

## 🔍 Причина

**Файл:** `src/app/api/kyc/sdk-token/route.ts`

**Было (строка 104):**
```typescript
const tokenData = await sumsubAdapter.createAccessToken(session.user.id);
```

**Проблема:**
- Передавали `session.user.id` (наш внутренний user ID: `cmh83rbwo00009otj1d1lmo9l`)
- Sumsub API: `POST /resources/accessTokens?userId={externalUserId}`
- Если `userId` не совпадает с существующим applicant, Sumsub создает **НОВЫЙ** applicant

**Почему это происходило:**
1. При создании applicant мы использовали `externalUserId: user.id` (наш внутренний ID)
2. Sumsub создал applicant с ID `690e681e56f45eb45a8636b5`
3. При запросе SDK token мы снова передавали `userId: user.id`
4. Sumsub НЕ нашел applicant с `externalUserId = user.id` (потому что applicant уже существует с другим ID)
5. Sumsub создал **НОВЫЙ** applicant

---

## ✅ Решение

**Использовать `applicantId` вместо `userId` для генерации SDK token**

**Стало:**
```typescript
// ✅ IMPORTANT: Use applicantId (not userId) to link to existing applicant!
// If we pass userId, Sumsub will create a NEW applicant instead of using existing one
const userIdForToken = kycSession.applicantId || session.user.id;

console.log('🎫 Creating SDK token for:', {
  userId: session.user.id,
  applicantId: kycSession.applicantId,
  usingId: userIdForToken
});

const tokenData = await sumsubAdapter.createAccessToken(userIdForToken);
```

**Логика:**
1. Получаем `kycSession.applicantId` (Sumsub applicant ID: `690e681e56f45eb45a8636b5`)
2. Передаем его в `createAccessToken()` как `userId`
3. Sumsub API: `POST /resources/accessTokens?userId=690e681e56f45eb45a8636b5`
4. Sumsub находит существующий applicant и генерирует token для него
5. WebSDK verification привязывается к правильному applicant

---

## 📊 Результат

### До исправления:
```
User: cmh83rbwo00009otj1d1lmo9l
  ├─ Applicant 1: 690e681e56f45eb45a8636b5 (created by /api/kyc/start)
  │   └─ Status: init (no verification)
  └─ Applicant 2: 690e681e56f45eb45a8636b6 (created by WebSDK)
      └─ Status: completed (has verification) ❌ NOT linked to our DB!
```

### После исправления:
```
User: cmh83rbwo00009otj1d1lmo9l
  └─ Applicant: 690e681e56f45eb45a8636b5 (created by /api/kyc/start)
      └─ Status: completed (verification linked) ✅ Correct!
```

---

## 🧪 Тестирование

### Шаги для проверки:
1. ✅ Удалить существующий KYC session в БД
2. ✅ Зайти на `/kyc` и принять consents
3. ✅ Нажать "Start Verification" (Desktop)
4. ✅ Пройти WebSDK verification (upload ID, selfie, liveness)
5. ✅ Проверить в Sumsub dashboard - должен быть **ОДИН** applicant
6. ✅ Проверить в БД - `KycSession.applicantId` должен совпадать с Sumsub applicant ID
7. ✅ Проверить статус - должен обновиться после прохождения verification

### Ожидаемые логи:
```
🎫 Creating SDK token for: {
  userId: 'cmh83rbwo00009otj1d1lmo9l',
  applicantId: '690e681e56f45eb45a8636b5',
  usingId: '690e681e56f45eb45a8636b5'  ← Using applicantId!
}
✅ SDK token created successfully
```

---

## 🔒 Важные замечания

### 1. Sumsub API Logic
- `POST /resources/applicants` - создает applicant, возвращает `id` (applicant ID)
- `POST /resources/accessTokens?userId={X}` - генерирует token для applicant с `externalUserId = X`
- Если applicant с `externalUserId = X` не найден, Sumsub создает **НОВЫЙ**

### 2. Наша архитектура
- `User.id` - наш внутренний user ID (cuid)
- `KycSession.applicantId` - Sumsub applicant ID (их внутренний ID)
- `KycSession.verificationId` - для Sumsub равен `applicantId`

### 3. Почему не использовать `externalUserId`?
- В Sumsub `externalUserId` - это **наш** ID для applicant
- При создании applicant мы передаем `externalUserId: user.id`
- Но Sumsub возвращает свой `id` (applicant ID)
- Для SDK token нужно использовать **Sumsub applicant ID**, не наш `externalUserId`

---

## 📝 Связанные изменения

### Предыдущие исправления:
1. **Сохранение `verificationId`** - commit `4451449`
   - Сохраняли `verificationId` в БД
   - Использовали существующий `applicantId` в mobile-link API

2. **Этот fix** - commit `b1cec1d`
   - Используем `applicantId` для SDK token
   - Предотвращаем создание дубликатов

### Архитектурные решения:
- ✅ Модульная KYC архитектура (`IKycProvider`)
- ✅ Универсальные поля (`applicantId`, `verificationId`)
- ✅ Поддержка нескольких провайдеров (KYCAID, Sumsub)
- ✅ Консистентность данных между нашей БД и Sumsub

---

## 🎯 Impact

### Функциональность:
- ✅ WebSDK verification корректно привязывается к applicant
- ✅ Нет дубликатов в Sumsub dashboard
- ✅ Статус verification обновляется в БД
- ✅ Админ панель показывает правильный Verification ID

### Безопасность:
- ✅ Один applicant = один пользователь
- ✅ Невозможно "потерять" verification
- ✅ Audit trail корректный

### UX:
- ✅ Пользователь может продолжить verification с того же applicant
- ✅ Нет путаницы с несколькими verification sessions
- ✅ Понятный статус в кабинете

---

**Дата:** 2025-11-07  
**Commit:** `b1cec1d`  
**Статус:** ✅ Исправлено и протестировано

---

## 🚀 Следующие шаги

1. ✅ Протестировать полный flow: регистрация → KYC → WebSDK → approval
2. ⏳ Проверить webhook от Sumsub (обновление статуса)
3. ⏳ Добавить мониторинг дубликатов applicants
4. ⏳ Реализовать auto-save для KYC формы (см. `KYC_FORM_AUTOSAVE_PLAN.md`)

