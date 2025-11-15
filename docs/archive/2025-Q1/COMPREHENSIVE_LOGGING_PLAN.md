# 🎯 План реализации полного логирования клиентского кабинета

## Phase 1: Security Logging (Приоритет 1) ✅

### Что логировать:
- [ ] Логин (успешный/неудачный)
- [ ] Logout  
- [ ] Неудачные попытки входа (с IP, device)
- [ ] Блокировка аккаунта (после N попыток)
- [ ] Изменение пароля
- [ ] Сброс пароля
- [ ] 2FA setup/disable
- [ ] Подозрительная активность

### Файлы для изменения:
1. `src/auth-client.ts` - добавить логирование в authorize()
2. `src/app/api/auth/log-login/route.ts` - уже есть
3. Создать `src/lib/services/security-audit.service.ts` - ✅ СОЗДАН

---

## Phase 2: User Actions Logging (Приоритет 1)

### Что логировать:

#### 📋 Orders (Заказы)
- [ ] ORDER_VIEWED - просмотр деталей заказа
- [ ] ORDER_CREATED - создание заказа
- [ ] ORDER_CANCELLED - отмена заказа
- [ ] PAYMENT_PROOF_UPLOADED - загрузка proof of payment

#### 📄 KYC (Верификация)
- [ ] KYC_STARTED - начало KYC
- [ ] KYC_DOCUMENT_UPLOADED - загрузка документа
- [ ] KYC_SUBMITTED - отправка на проверку
- [ ] KYC_APPROVED - одобрение (от админа)
- [ ] KYC_REJECTED - отклонение (от админа)

#### 👤 Profile (Профиль)
- [ ] PROFILE_VIEWED - просмотр профиля
- [ ] PROFILE_UPDATED - обновление данных
- [ ] EMAIL_CHANGED - изменение email
- [ ] PHONE_CHANGED - изменение телефона

#### 💰 Wallet (Кошельки)
- [ ] WALLET_ADDED - добавление кошелька
- [ ] WALLET_UPDATED - обновление кошелька
- [ ] WALLET_DELETED - удаление кошелька

#### 📊 Other
- [ ] RATES_VIEWED - просмотр курсов
- [ ] DASHBOARD_VIEWED - просмотр дашборда
- [ ] SUPPORT_MESSAGE_SENT - отправка сообщения в поддержку

### Файлы для создания/изменения:
- `src/lib/services/user-activity.service.ts` - новый сервис
- `src/app/api/orders/route.ts` - добавить логирование
- `src/app/api/kyc/*` - добавить логирование
- `src/app/api/profile/*` - добавить логирование

---

## Phase 3: Ban System (Система банов)

### Критерии для бана:
1. **Автоматический бан:**
   - 5+ неудачных попыток входа за 15 минут
   - Попытка SQL injection / XSS
   - Подозрительная активность (rate limiting)
   - Множественные попытки доступа к чужим заказам

2. **Ручной бан (админом):**
   - Fraud detection
   - AML/KYC violations
   - Terms of service violations

### Поля в User:
```prisma
model User {
  // ... existing fields
  
  // Ban system
  isBanned         Boolean   @default(false)
  bannedAt         DateTime?
  bannedBy         String?   // Admin ID
  banReason        String?   @db.Text
  banExpiresAt     DateTime? // null = permanent
  
  // Failed login tracking
  failedLoginAttempts Int      @default(0)
  lastFailedLogin     DateTime?
  lockedUntil         DateTime? // Temporary lock
}
```

### API endpoints:
- `POST /api/admin/users/[id]/ban` - забанить
- `POST /api/admin/users/[id]/unban` - разбанить
- `GET /api/admin/users/banned` - список забаненных

---

## Phase 4: Enhanced Audit Log Details

### Что добавить в каждый лог:

#### Context (всегда):
```typescript
{
  ipAddress: string;
  userAgent: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  country?: string;  // GeoIP
  city?: string;     // GeoIP
  isp?: string;      // GeoIP
  timezone?: string;
  language?: string;
  screenResolution?: string;
}
```

#### Для критических действий:
```typescript
{
  mfaRequired: boolean;
  mfaMethod?: 'TOTP' | 'SMS' | 'EMAIL';
  mfaVerifiedAt?: DateTime;
  riskScore?: number; // 0-100
  anomalyDetected?: boolean;
  sessionDuration?: number; // minutes
}
```

#### Для изменений данных:
```typescript
{
  diffBefore: any; // Old state
  diffAfter: any;  // New state
  changes: {      // Detailed diff
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}
```

---

## Phase 5: Real-time Monitoring & Alerts

### Алерты для админов:
- 🚨 Multiple failed login attempts
- 🚨 Suspicious activity detected
- 🚨 Account locked
- 🚨 Critical action performed
- 🚨 User banned/unbanned

### Dashboard для админов:
- Live activity feed
- Security alerts
- User risk scores
- Geographic distribution
- Device analytics

---

## Implementation Order:

### Sprint 1 (TODAY):
1. ✅ Создать `security-audit.service.ts`
2. ⏳ Добавить логирование failed login в `auth-client.ts`
3. ⏳ Добавить логирование ORDER_CREATED
4. ⏳ Добавить логирование KYC_DOCUMENT_UPLOADED

### Sprint 2:
1. Добавить ban system в User model
2. Создать admin API для бана
3. Добавить middleware для проверки бана
4. Логирование всех просмотров

### Sprint 3:
1. GeoIP integration
2. Risk scoring
3. Anomaly detection
4. Real-time alerts

---

## Testing Checklist:

### Security Logging:
- [ ] Failed login creates UserAuditLog (LOGIN_FAILED)
- [ ] 5 failed attempts locks account
- [ ] Successful login after lock is blocked
- [ ] Password reset creates log

### User Actions:
- [ ] Order creation creates log with full details
- [ ] KYC upload creates log with document type
- [ ] Profile update shows diff (before/after)

### Ban System:
- [ ] Banned user cannot login
- [ ] Ban expiry works correctly
- [ ] Admin can ban/unban
- [ ] Ban creates AdminAuditLog entry

---

## Files to Create/Modify:

### Create:
- [x] `src/lib/services/security-audit.service.ts`
- [ ] `src/lib/services/user-activity.service.ts`
- [ ] `src/lib/services/ban.service.ts`
- [ ] `src/app/api/admin/users/[id]/ban/route.ts`
- [ ] `src/lib/middleware/check-ban.ts`

### Modify:
- [ ] `src/auth-client.ts` - add failed login logging
- [ ] `src/app/api/orders/route.ts` - add ORDER_CREATED log
- [ ] `src/app/api/kyc/upload/route.ts` - add DOCUMENT_UPLOADED log
- [ ] `src/app/api/profile/route.ts` - add PROFILE_UPDATED log
- [ ] `prisma/schema.prisma` - add ban fields to User

---

**Ready to start implementation?**

