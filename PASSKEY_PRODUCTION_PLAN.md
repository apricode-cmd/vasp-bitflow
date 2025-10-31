# 🔐 Production-Ready Passkey Implementation Plan

## Проблема
`adminId` в `MfaChallenge` - foreign key на `Admin.id`, поэтому нельзя использовать `'anonymous'` или `'temp-anonymous-'`.

## Решение

### Вариант 1: Требовать email для логина (РЕКОМЕНДУЕТСЯ)
**Pros:**
- ✅ Безопаснее - знаем кто логинится
- ✅ Audit trail - можем логировать попытки
- ✅ Rate limiting по email
- ✅ Можно показать список доступных passkeys

**Cons:**
- ❌ Дополнительный шаг (ввод email)

**Реализация:**
```typescript
// Admin login flow:
1. Админ вводит email
2. Система проверяет есть ли у него passkeys
3. Если да → показывает кнопку "Sign in with Passkey"
4. Challenge привязан к конкретному админу
```

### Вариант 2: Сделать adminId опциональным
**Pros:**
- ✅ True passwordless (без ввода email)
- ✅ Удобнее UX

**Cons:**
- ❌ Нужна миграция БД
- ❌ Сложнее audit trail
- ❌ Сложнее rate limiting

**Реализация:**
```prisma
model MfaChallenge {
  adminId  String? // Опциональный
  admin    Admin?  @relation(fields: [adminId], references: [id])
  // ...
}
```

### Вариант 3: Отдельная таблица для Passkey challenges
**Pros:**
- ✅ Чистая архитектура
- ✅ Разделение concerns
- ✅ Поддержка обоих flows

**Cons:**
- ❌ Дополнительная таблица

**Реализация:**
```prisma
model PasskeyChallenge {
  id         String   @id @default(cuid())
  adminId    String?  // Опционально для anonymous
  challenge  String
  createdAt  DateTime @default(now())
  expiresAt  DateTime
  
  @@index([adminId, expiresAt])
}
```

## 🎯 Рекомендация для Production

**Вариант 1** - Требовать email:

### Почему:
1. **Compliance** - PSD2/DORA требуют идентификацию пользователя
2. **Security** - можем блокировать брутфорс по email
3. **Audit** - полный trail кто когда логинился
4. **UX** - можно показать зарегистрированные устройства

### UI Flow:
```
/admin/auth/login
├─ Email field (автофокус)
├─ Button "Continue with Passkey" 
└─ Link "Emergency access"

После ввода email:
├─ Проверка в БД
├─ Если есть passkeys → Face ID/Touch ID
└─ Если нет → показать "No passkeys registered"
```

### Код:
```typescript
// PasskeyLoginForm.tsx
1. Email input
2. Check if admin exists & has passkeys
3. If yes → startAuthentication()
4. Challenge всегда привязан к adminId
```

## Что делаем сейчас?

Выбери вариант и я реализую полностью production-ready решение! 🚀

Мой голос: **Вариант 1** (с email)

