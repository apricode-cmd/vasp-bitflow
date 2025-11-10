# Audit Logging Architecture

## 📋 Обзор

Система аудита использует **раздельные таблицы** для логирования действий пользователей и администраторов:

- **`AdminAuditLog`** - для действий администраторов (через `adminAuditLogService`)
- **`UserAuditLog`** - для действий пользователей (через `userAuditLogService`)
- **`AuditLog`** (legacy) - старая таблица, постепенно мигрируется

## 🏗️ Архитектура

### 1. Сервисы

#### `AuditService` (`src/lib/services/audit.service.ts`)
Единая точка входа для логирования. Роутит запросы в соответствующие сервисы:

```typescript
// Для админов
await auditService.logAdminAction(
  adminId: string,
  action: string,           // AUDIT_ACTIONS constant
  entity: string,           // AUDIT_ENTITIES constant
  entityId: string,
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>,
  metadata?: Record<string, unknown>
);

// Для пользователей
await auditService.logUserAction(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata?: Record<string, unknown>
);
```

#### `AdminAuditLogService` (`src/lib/services/admin-audit-log.service.ts`)
Специализированный сервис для админских логов:

**Особенности:**
- ✅ Immutable logs с `freezeChecksum` (SHA-256)
- ✅ Severity levels: `INFO`, `WARNING`, `CRITICAL`
- ✅ MFA tracking (`mfaRequired`, `mfaMethod`, `mfaVerifiedAt`)
- ✅ Reviewable actions для compliance
- ✅ Context capture (IP, User-Agent, metadata)
- ✅ Diff tracking (`diffBefore`, `diffAfter`)

#### `UserAuditLogService` (`src/lib/services/user-audit-log.service.ts`)
Для действий клиентов (регистрация, KYC, заказы).

---

## 📚 Константы

### `AUDIT_ACTIONS` (используй ТОЛЬКО эти!)

```typescript
// User actions
USER_REGISTERED
USER_LOGIN
USER_LOGOUT
USER_UPDATED
USER_BLOCKED
USER_UNBLOCKED

// Order actions
ORDER_CREATED
ORDER_STATUS_CHANGED
ORDER_UPDATED
ORDER_CANCELLED
ORDER_DELETED
ORDER_COMPLETED
PAYMENT_PROOF_UPLOADED

// KYC actions
KYC_SUBMITTED
KYC_CREATED
KYC_APPROVED
KYC_REJECTED
KYC_DELETED
KYC_DOCUMENT_UPLOADED

// Admin actions
SETTINGS_UPDATED
BANK_DETAILS_UPDATED
TRADING_PAIR_UPDATED
CURRENCY_UPDATED
PAYMENT_METHOD_UPDATED
WALLET_ADDED
WALLET_REMOVED
MANUAL_RATE_SET
INTEGRATION_UPDATED
API_KEY_GENERATED
API_KEY_REVOKED

// Admin management actions
ADMIN_INVITED
ADMIN_SUSPENDED
ADMIN_REACTIVATED
ADMIN_TERMINATED
ADMIN_ROLE_CHANGED
ADMIN_DELETED

// System actions
SYSTEM_ERROR
SYSTEM_WARNING
SYSTEM_MAINTENANCE
```

### `AUDIT_ENTITIES` (используй ТОЛЬКО эти!)

```typescript
USER
ADMIN
ORDER
KYC_SESSION
TRADING_PAIR
CURRENCY
FIAT_CURRENCY
BANK_DETAILS
PAYMENT_METHOD
PLATFORM_WALLET
USER_WALLET
MANUAL_RATE
INTEGRATION_SETTING
SYSTEM_SETTINGS
API_KEY
```

---

## ✅ Правильные примеры

### 1. Suspend Admin (с MFA)
```typescript
await auditService.logAdminAction(
  session.user.id,
  AUDIT_ACTIONS.ADMIN_SUSPENDED,  // ✅ Константа
  AUDIT_ENTITIES.ADMIN,            // ✅ Константа
  adminId,
  { status: 'ACTIVE' },
  { status: 'SUSPENDED' },
  {
    targetAdmin: admin.email,
    targetRole: admin.role,
    mfaVerified: true              // ✅ MFA tracking
  }
);
```

### 2. Update Trading Pair
```typescript
await auditService.logAdminAction(
  adminId,
  AUDIT_ACTIONS.TRADING_PAIR_UPDATED,  // ✅ Константа
  AUDIT_ENTITIES.TRADING_PAIR,         // ✅ Константа
  pairId,
  oldPair,                             // ✅ Diff before
  updatedPair,                         // ✅ Diff after
  { reason: 'Market conditions' }
);
```

### 3. Generate API Key
```typescript
await auditService.logAdminAction(
  session.user.id,
  AUDIT_ACTIONS.API_KEY_GENERATED,  // ✅ Константа
  AUDIT_ENTITIES.API_KEY,           // ✅ Константа
  apiKey.id,
  {},
  { name: apiKey.name, permissions: apiKey.permissions }
);
```

---

## ❌ Неправильные примеры (НЕ делай так!)

### 1. Строки вместо констант
```typescript
// ❌ BAD
await auditService.logAdminAction(
  adminId,
  'PAYMENT_METHOD_DELETE',  // ❌ Строка вместо константы
  AUDIT_ENTITIES.PAYMENT_METHOD,
  code,
  oldMethod,
  {}
);

// ✅ GOOD
await auditService.logAdminAction(
  adminId,
  AUDIT_ACTIONS.PAYMENT_METHOD_UPDATED,  // ✅ Используй существующую константу
  AUDIT_ENTITIES.PAYMENT_METHOD,
  code,
  oldMethod,
  { isActive: false }  // Передай статус в diff
);
```

### 2. Неопределённые entity
```typescript
// ❌ BAD
await auditService.logAdminAction(
  adminId,
  AUDIT_ACTIONS.SETTINGS_UPDATED,
  'PaymentAccount',  // ❌ Строка, нет в AUDIT_ENTITIES
  accountId,
  {},
  newAccount
);

// ✅ GOOD - добавь константу или используй SYSTEM_SETTINGS
await auditService.logAdminAction(
  adminId,
  AUDIT_ACTIONS.SETTINGS_UPDATED,
  AUDIT_ENTITIES.SYSTEM_SETTINGS,  // ✅ Используй существующую
  accountId,
  {},
  newAccount
);
```

### 3. Пропущенные diff
```typescript
// ❌ BAD
await auditService.logAdminAction(
  adminId,
  AUDIT_ACTIONS.CURRENCY_UPDATED,
  AUDIT_ENTITIES.CURRENCY,
  code,
  {},  // ❌ Пустой oldValue
  {}   // ❌ Пустой newValue
);

// ✅ GOOD
const oldCurrency = await prisma.currency.findUnique({ where: { code } });
const updatedCurrency = await prisma.currency.update({ ... });

await auditService.logAdminAction(
  adminId,
  AUDIT_ACTIONS.CURRENCY_UPDATED,
  AUDIT_ENTITIES.CURRENCY,
  code,
  oldCurrency,      // ✅ Полный snapshot
  updatedCurrency,  // ✅ Полный snapshot
  { reason: 'Manual adjustment' }
);
```

---

## 🔐 MFA Tracking

Для критических действий (suspend, terminate, approve payout) **обязательно** передавай MFA статус:

```typescript
await auditService.logAdminAction(
  session.user.id,
  AUDIT_ACTIONS.ADMIN_TERMINATED,
  AUDIT_ENTITIES.ADMIN,
  adminId,
  { status: 'ACTIVE' },
  { status: 'TERMINATED' },
  {
    targetAdmin: admin.email,
    targetRole: admin.role,
    mfaVerified: true,           // ✅ MFA был пройден
    mfaChallengeId: challengeId  // ✅ ID challenge для трейсинга
  }
);
```

---

## 📊 Severity Levels

Автоматически определяются в `determineSeverity()`:

### CRITICAL
- `ADMIN_INVITED`, `ADMIN_SUSPENDED`, `ADMIN_TERMINATED`
- `API_KEY_CREATED`, `API_KEY_REVOKED`
- `INTEGRATION_KEY_UPDATED`
- `MFA_DISABLED`
- `USER_DELETED`, `KYC_DATA_EXPORTED`, `PII_EXPORTED`

### WARNING
- Действия с `DELETE`, `SUSPEND`, `REJECT`, `TERMINATE` в названии

### INFO
- Все остальные

---

## 🛠️ Добавление новых действий

### 1. Добавь константу в `AUDIT_ACTIONS`
```typescript
// src/lib/services/audit.service.ts
export const AUDIT_ACTIONS = {
  // ...
  PAYMENT_ACCOUNT_CREATED: 'PAYMENT_ACCOUNT_CREATED',  // ✅ Добавь
  PAYMENT_ACCOUNT_UPDATED: 'PAYMENT_ACCOUNT_UPDATED',
  PAYMENT_ACCOUNT_DELETED: 'PAYMENT_ACCOUNT_DELETED',
} as const;
```

### 2. Добавь entity если нужно
```typescript
export const AUDIT_ENTITIES = {
  // ...
  PAYMENT_ACCOUNT: 'PaymentAccount',  // ✅ Добавь
} as const;
```

### 3. Обнови `determineSeverity()` если критично
```typescript
const criticalActions = [
  // ...
  'PAYMENT_ACCOUNT_DELETED',  // ✅ Если критично
];
```

### 4. Используй в коде
```typescript
await auditService.logAdminAction(
  adminId,
  AUDIT_ACTIONS.PAYMENT_ACCOUNT_CREATED,  // ✅ Новая константа
  AUDIT_ENTITIES.PAYMENT_ACCOUNT,         // ✅ Новый entity
  accountId,
  {},
  newAccount
);
```

---

## 🔍 Проверка логов

### Через Prisma Studio
```bash
npx prisma studio
# Открой AdminAuditLog таблицу
```

### Через API
```typescript
GET /api/admin/audit?action=ADMIN_SUSPENDED&severity=CRITICAL
```

### Через SQL
```sql
SELECT 
  "action",
  "adminEmail",
  "entityType",
  "severity",
  "mfaVerified",
  "createdAt"
FROM "AdminAuditLog"
WHERE "severity" = 'CRITICAL'
ORDER BY "createdAt" DESC
LIMIT 50;
```

---

## 📝 Checklist для каждого API endpoint

- [ ] Импортирован `auditService`, `AUDIT_ACTIONS`, `AUDIT_ENTITIES`
- [ ] Используются **только константы** (не строки)
- [ ] Передаются `oldValue` и `newValue` (diff)
- [ ] Для критических действий добавлен `mfaVerified: true`
- [ ] Context содержит полезную информацию (target email, role, reason)
- [ ] Severity автоматически определяется или передаётся явно

---

## 🚨 Частые ошибки

1. ❌ `'PAYMENT_METHOD_DELETE'` - строка вместо константы
2. ❌ `'PaymentAccount'` - entity не определён в `AUDIT_ENTITIES`
3. ❌ `oldValue: {}` - пустой diff (не информативно)
4. ❌ Забыли добавить `mfaVerified` для критических действий
5. ❌ Используют `AUDIT_ACTIONS.SETTINGS_UPDATED` для всего подряд

---

## 📖 Примеры из кодовой базы

### ✅ Хорошие примеры
- `src/app/api/admin/admins/[id]/suspend/route.ts` - полный MFA tracking
- `src/app/api/admin/api-keys/[id]/route.ts` - правильные константы
- `src/app/api/admin/rates/route.ts` - полный diff

### ❌ Требуют исправления
- `src/app/api/admin/payment-methods/[code]/route.ts:173` - `'PAYMENT_METHOD_DELETE'`
- `src/app/api/admin/ip-blacklist/route.ts:134` - `'IP_REBLOCKED'`
- `src/app/api/admin/payment-accounts/[id]/route.ts:132` - `'PAYMENT_ACCOUNT_UPDATE'`
- `src/app/api/admin/resources/widgets/route.ts:44` - `'WidgetConfig'`

---

## 🎯 Следующие шаги

1. ✅ Добавить отсутствующие константы в `AUDIT_ACTIONS`
2. ✅ Добавить отсутствующие entities в `AUDIT_ENTITIES`
3. ⏳ Исправить все строковые литералы на константы
4. ⏳ Добавить полные diff для всех update операций
5. ⏳ Добавить MFA tracking для всех критических действий

