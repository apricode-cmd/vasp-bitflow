# Admin Actions Audit Checklist

## ✅ Реализованные действия с полным логированием

### Admin Management (с MFA)
- [x] **ADMIN_INVITED** - Приглашение нового админа
  - Endpoint: `POST /api/admin/admins/invite`
  - MFA: ✅ Required
  - Severity: CRITICAL
  - Logs: adminId, email, role, setupToken expiry

- [x] **ADMIN_SUSPENDED** - Приостановка админа
  - Endpoint: `POST /api/admin/admins/[id]/suspend`
  - MFA: ✅ Required
  - Severity: CRITICAL
  - Logs: targetAdmin, targetRole, sessions terminated

- [x] **ADMIN_UNSUSPENDED** - Реактивация админа
  - Endpoint: `POST /api/admin/admins/[id]/unsuspend`
  - MFA: ✅ Required
  - Severity: CRITICAL
  - Logs: targetAdmin, targetRole, status change

- [x] **ADMIN_TERMINATED** - Увольнение админа (permanent)
  - Endpoint: `POST /api/admin/admins/[id]/terminate`
  - MFA: ✅ Required
  - Severity: CRITICAL
  - Logs: targetAdmin, sessions terminated, credentials deactivated

### API Keys
- [x] **API_KEY_GENERATED** - Создание API ключа
  - Endpoint: `POST /api/admin/api-keys`
  - MFA: ⏳ To implement
  - Severity: CRITICAL
  - Logs: key name, permissions

- [x] **API_KEY_REVOKED** - Отзыв API ключа
  - Endpoint: `DELETE /api/admin/api-keys/[id]`
  - MFA: ⏳ To implement
  - Severity: CRITICAL
  - Logs: key name, reason

### Orders
- [x] **ORDER_CREATED** - Создание заказа админом
  - Endpoint: `POST /api/admin/orders/create-for-client`
  - Logs: userId, amount, currency

- [x] **ORDER_STATUS_CHANGED** - Изменение статуса заказа
  - Endpoint: `PATCH /api/admin/orders/[id]`
  - Logs: oldStatus, newStatus, reason

- [x] **ORDER_COMPLETED** - Завершение заказа
  - Endpoint: `PATCH /api/admin/pay-out/[id]`
  - MFA: ⏳ For large amounts
  - Logs: amount, txHash

- [x] **ORDER_DELETED** - Удаление заказа
  - Endpoint: `DELETE /api/admin/orders/[id]`
  - Logs: order details, reason

### Trading Pairs
- [x] **TRADING_PAIR_UPDATED** - Обновление торговой пары
  - Endpoint: `PATCH /api/admin/trading-pairs/[id]`
  - Logs: oldPair, newPair (rate, spread, etc.)

### Integrations
- [x] **INTEGRATION_UPDATED** - Обновление интеграции
  - Endpoint: `PATCH /api/admin/integrations/[service]`
  - Severity: CRITICAL
  - Logs: service, config changes (keys masked)

### Manual Rates
- [x] **MANUAL_RATE_SET** - Установка ручного курса
  - Endpoint: `POST /api/admin/rates`
  - Logs: pair, rate, expiresAt

---

## ⏳ Требуют добавления логирования

### Admin Management
- [ ] **ADMIN_INVITE_RESENT** - Повторная отправка приглашения
  - Endpoint: Создать `POST /api/admin/admins/[id]/resend-invite`
  - MFA: ✅ Required
  - Severity: WARNING

- [ ] **ADMIN_INVITE_CANCELLED** - Отмена приглашения
  - Endpoint: Создать `POST /api/admin/admins/[id]/cancel-invite`
  - MFA: ✅ Required
  - Severity: WARNING

- [ ] **ADMIN_REGISTERED** - Регистрация Passkey приглашённым админом
  - Endpoint: `POST /api/admin/passkey/register/verify`
  - Logs: email, deviceName, credentialId

- [ ] **ADMIN_UPDATED** - Обновление профиля админа
  - Endpoint: Создать `PATCH /api/admin/admins/[id]`
  - Logs: changed fields (firstName, lastName, etc.)

- [ ] **ADMIN_ROLE_CHANGED** - Изменение роли админа
  - Endpoint: Создать `PATCH /api/admin/admins/[id]/role`
  - MFA: ✅ Required
  - Severity: CRITICAL
  - Logs: oldRole, newRole

- [ ] **ADMIN_PASSWORD_RESET** - Сброс пароля админа
  - Endpoint: Создать `POST /api/admin/admins/[id]/reset-password`
  - MFA: ✅ Required
  - Severity: CRITICAL

- [ ] **ADMIN_MFA_ENABLED** - Включение MFA для админа
  - Logs: method (TOTP/WebAuthn)

- [ ] **ADMIN_MFA_DISABLED** - Отключение MFA для админа
  - MFA: ✅ Required
  - Severity: CRITICAL

- [ ] **ADMIN_PASSKEY_REGISTERED** - Регистрация нового Passkey
  - Endpoint: `POST /api/admin/passkey/register/verify`
  - Logs: deviceName, credentialId

- [ ] **ADMIN_PASSKEY_REMOVED** - Удаление Passkey
  - Endpoint: Создать `DELETE /api/admin/passkey/[id]`
  - MFA: ✅ Required (with another Passkey)
  - Severity: CRITICAL

- [ ] **ADMIN_SESSION_REVOKED** - Отзыв сессии админа
  - Endpoint: Создать `POST /api/admin/admins/[id]/revoke-sessions`
  - MFA: ✅ Required
  - Severity: CRITICAL

### Trading Pairs
- [ ] **TRADING_PAIR_CREATED** - Создание торговой пары
  - Endpoint: `POST /api/admin/trading-pairs`
  - Logs: pair details

- [ ] **TRADING_PAIR_DELETED** - Удаление торговой пары
  - Endpoint: `DELETE /api/admin/trading-pairs/[id]`
  - Logs: pair details

### Currencies
- [ ] **CURRENCY_CREATED** - Создание валюты
  - Endpoint: `POST /api/admin/resources/currencies`
  - Logs: currency details

- [ ] **CURRENCY_UPDATED** - Обновление валюты
  - Endpoint: `PATCH /api/admin/resources/currencies/[code]`
  - Logs: oldCurrency, newCurrency

- [ ] **CURRENCY_DELETED** - Удаление валюты
  - Endpoint: `DELETE /api/admin/resources/currencies/[code]`
  - Logs: currency details

### Payment Methods
- [ ] **PAYMENT_METHOD_CREATED** - Создание метода оплаты
  - Endpoint: `POST /api/admin/payment-methods`
  - Logs: method details

- [ ] **PAYMENT_METHOD_UPDATED** - Обновление метода оплаты
  - Endpoint: `PATCH /api/admin/payment-methods/[code]`
  - Logs: oldMethod, newMethod

- [ ] **PAYMENT_METHOD_DELETED** - Удаление метода оплаты
  - Endpoint: `DELETE /api/admin/payment-methods/[code]`
  - Logs: method details
  - **ИСПРАВИТЬ:** Сейчас использует строку `'PAYMENT_METHOD_DELETE'`

### Payment Accounts
- [ ] **PAYMENT_ACCOUNT_CREATED** - Создание платёжного аккаунта
  - Endpoint: `POST /api/admin/payment-accounts`
  - Severity: CRITICAL
  - Logs: account details (mask sensitive data)
  - **ИСПРАВИТЬ:** Сейчас использует строку `'PAYMENT_ACCOUNT_CREATE'`

- [ ] **PAYMENT_ACCOUNT_UPDATED** - Обновление платёжного аккаунта
  - Endpoint: `PATCH /api/admin/payment-accounts/[id]`
  - Severity: WARNING
  - Logs: changed fields
  - **ИСПРАВИТЬ:** Сейчас использует строку `'PAYMENT_ACCOUNT_UPDATE'`

- [ ] **PAYMENT_ACCOUNT_DELETED** - Удаление платёжного аккаунта
  - Endpoint: `DELETE /api/admin/payment-accounts/[id]`
  - Severity: CRITICAL
  - MFA: ✅ Required
  - **ИСПРАВИТЬ:** Сейчас использует строку `'PAYMENT_ACCOUNT_DELETE'`

### Wallets
- [ ] **WALLET_ADDED** - Добавление кошелька
  - Logs: blockchain, address, label

- [ ] **WALLET_UPDATED** - Обновление кошелька
  - Logs: changed fields

- [ ] **WALLET_REMOVED** - Удаление кошелька
  - Logs: blockchain, address

### Manual Rates
- [ ] **MANUAL_RATE_DELETED** - Удаление ручного курса
  - Endpoint: `DELETE /api/admin/rates/manual/[id]`
  - Logs: pair, rate

### IP Blacklist
- [ ] **IP_BLOCKED** - Блокировка IP
  - Endpoint: `POST /api/admin/ip-blacklist`
  - Logs: IP, reason, expiresAt
  - **ИСПРАВИТЬ:** Сейчас использует `SETTINGS_UPDATED`

- [ ] **IP_UNBLOCKED** - Разблокировка IP
  - Endpoint: `DELETE /api/admin/ip-blacklist/[id]`
  - Logs: IP, reason
  - **ИСПРАВИТЬ:** Сейчас использует `SETTINGS_UPDATED`

### Resources (CRM)
- [ ] **RESOURCE_CREATED** - Создание ресурса
  - Endpoints: `/api/admin/resources/*/route.ts`
  - Logs: resourceType, code, details
  - **ИСПРАВИТЬ:** Сейчас использует строки типа `'WidgetConfig'`, `'KycLevel'`

- [ ] **RESOURCE_UPDATED** - Обновление ресурса
  - Endpoints: `/api/admin/resources/*/[code]/route.ts`
  - Logs: resourceType, code, changes
  - **ИСПРАВИТЬ:** Сейчас использует строки

- [ ] **RESOURCE_DELETED** - Удаление ресурса
  - Logs: resourceType, code

### Settings
- [ ] **SETTINGS_UPDATED** - Обновление настроек
  - Endpoint: `PATCH /api/admin/settings`
  - Logs: changed settings (mask sensitive)

- [ ] **BANK_DETAILS_UPDATED** - Обновление банковских реквизитов
  - MFA: ✅ Required
  - Severity: CRITICAL
  - Logs: changed fields (mask account numbers)

### Integration Testing
- [ ] **INTEGRATION_TESTED** - Тестирование интеграции
  - Endpoint: `POST /api/admin/integrations/[service]/test`
  - Logs: service, success/failure, error message

---

## 🔧 Файлы требующие исправления

### Приоритет 1: Критические (используют строки вместо констант)

1. **`src/app/api/admin/payment-methods/[code]/route.ts:173`**
   ```typescript
   // ❌ BAD
   'PAYMENT_METHOD_DELETE'
   
   // ✅ GOOD
   AUDIT_ACTIONS.PAYMENT_METHOD_DELETED
   ```

2. **`src/app/api/admin/payment-accounts/[id]/route.ts:132`**
   ```typescript
   // ❌ BAD
   'PAYMENT_ACCOUNT_UPDATE'
   
   // ✅ GOOD
   AUDIT_ACTIONS.PAYMENT_ACCOUNT_UPDATED
   ```

3. **`src/app/api/admin/payment-accounts/[id]/route.ts:199`**
   ```typescript
   // ❌ BAD
   'PAYMENT_ACCOUNT_DELETE'
   
   // ✅ GOOD
   AUDIT_ACTIONS.PAYMENT_ACCOUNT_DELETED
   ```

4. **`src/app/api/admin/payment-accounts/route.ts:157`**
   ```typescript
   // ❌ BAD
   'PAYMENT_ACCOUNT_CREATE'
   
   // ✅ GOOD
   AUDIT_ACTIONS.PAYMENT_ACCOUNT_CREATED
   ```

5. **`src/app/api/admin/ip-blacklist/route.ts:134`**
   ```typescript
   // ❌ BAD
   'IP_REBLOCKED'
   
   // ✅ GOOD
   AUDIT_ACTIONS.IP_BLOCKED
   ```

### Приоритет 2: Неправильные entity (строки вместо констант)

6. **`src/app/api/admin/resources/widgets/route.ts:44`**
   ```typescript
   // ❌ BAD
   'WidgetConfig'
   
   // ✅ GOOD
   AUDIT_ENTITIES.WIDGET_CONFIG
   ```

7. **`src/app/api/admin/resources/kyc-levels/route.ts:43`**
   ```typescript
   // ❌ BAD
   'KycLevel'
   
   // ✅ GOOD
   AUDIT_ENTITIES.KYC_LEVEL
   ```

8. **`src/app/api/admin/resources/fiat-currencies/[code]/route.ts:31`**
   ```typescript
   // ❌ BAD
   'FiatCurrency'
   
   // ✅ GOOD
   AUDIT_ENTITIES.FIAT_CURRENCY
   ```

9. **`src/app/api/admin/resources/psp-connectors/route.ts:42`**
   ```typescript
   // ❌ BAD
   'PspConnector'
   
   // ✅ GOOD
   AUDIT_ENTITIES.PSP_CONNECTOR
   ```

10. **`src/app/api/admin/resources/rate-providers/[code]/route.ts:34`**
    ```typescript
    // ❌ BAD
    'RateProvider'
    
    // ✅ GOOD
    AUDIT_ENTITIES.RATE_PROVIDER
    ```

11. **`src/app/api/admin/resources/fee-profiles/route.ts:43`**
    ```typescript
    // ❌ BAD
    'FeeProfile'
    
    // ✅ GOOD
    AUDIT_ENTITIES.FEE_PROFILE
    ```

12. **`src/app/api/admin/resources/currencies/[code]/route.ts:126`**
    ```typescript
    // ❌ BAD
    'Currency'
    
    // ✅ GOOD
    AUDIT_ENTITIES.CURRENCY
    ```

13. **`src/app/api/admin/kyc/fields/[id]/route.ts:66`**
    ```typescript
    // ❌ BAD
    'KycFormField'
    
    // ✅ GOOD
    AUDIT_ENTITIES.KYC_FORM_FIELD
    ```

14. **`src/app/api/admin/payment-accounts/[id]/route.ts:133`**
    ```typescript
    // ❌ BAD
    'PaymentAccount'
    
    // ✅ GOOD
    AUDIT_ENTITIES.PAYMENT_ACCOUNT
    ```

---

## 📊 Статистика

### Реализовано
- ✅ Admin Management: 4/16 (25%)
- ✅ Orders: 4/4 (100%)
- ✅ Trading Pairs: 1/3 (33%)
- ✅ Integrations: 1/2 (50%)
- ✅ API Keys: 2/2 (100%)
- ✅ Manual Rates: 1/2 (50%)

### Требует исправления
- 🔧 Строковые константы: 5 файлов
- 🔧 Строковые entities: 9 файлов
- 🔧 Всего: **14 файлов**

### Требует реализации
- ⏳ Admin Management: 12 действий
- ⏳ Currencies: 3 действия
- ⏳ Payment Methods: 3 действия
- ⏳ Payment Accounts: 3 действия (+ исправить 4 файла)
- ⏳ Wallets: 3 действия
- ⏳ IP Blacklist: 2 действия
- ⏳ Resources: 3 действия
- ⏳ Settings: 2 действия

---

## 🎯 План действий

### Фаза 1: Исправление существующего кода (1-2 часа)
1. Исправить все строковые константы на `AUDIT_ACTIONS.*`
2. Исправить все строковые entities на `AUDIT_ENTITIES.*`
3. Добавить полные diff (oldValue/newValue) где отсутствуют
4. Добавить MFA для критических действий

### Фаза 2: Реализация недостающих действий (3-4 часа)
1. Создать недостающие endpoints для Admin Management
2. Добавить логирование для всех CRUD операций
3. Реализовать MFA для всех критических действий
4. Добавить Step-up MFA challenges

### Фаза 3: Тестирование и документация (1-2 часа)
1. Протестировать все критические действия с MFA
2. Проверить логи в AdminAuditLog таблице
3. Создать compliance report
4. Обновить документацию

---

## 🔍 Как проверить логи

```sql
-- Все критические действия за последние 24 часа
SELECT 
  "action",
  "adminEmail",
  "entityType",
  "entityId",
  "severity",
  "context",
  "createdAt"
FROM "AdminAuditLog"
WHERE "severity" = 'CRITICAL'
  AND "createdAt" >= NOW() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC;

-- Действия конкретного админа
SELECT 
  "action",
  "entityType",
  "diffBefore",
  "diffAfter",
  "context",
  "createdAt"
FROM "AdminAuditLog"
WHERE "adminEmail" = 'admin@apricode.io'
ORDER BY "createdAt" DESC
LIMIT 50;

-- Все действия с MFA
SELECT 
  "action",
  "adminEmail",
  "entityType",
  "context" ->> 'mfaVerified' as mfa_verified,
  "createdAt"
FROM "AdminAuditLog"
WHERE "context" ->> 'mfaVerified' = 'true'
ORDER BY "createdAt" DESC;
```

---

## ✅ Готово в этом сеансе

1. ✅ Добавлены все константы `AUDIT_ACTIONS` (59 действий)
2. ✅ Добавлены все константы `AUDIT_ENTITIES` (20 сущностей)
3. ✅ Обновлён `determineSeverity()` для новых критических действий
4. ✅ Создан endpoint `POST /api/admin/admins/[id]/unsuspend` с MFA
5. ✅ Добавлен `UNSUSPEND_ADMIN` в `STEP_UP_REQUIRED_ACTIONS`
6. ✅ Обновлён UI для unsuspend с MFA
7. ✅ Исправлены `suspend` и `terminate` endpoints
8. ✅ Создан этот checklist

---

**Следующий шаг:** Исправить 14 файлов, использующих строковые константы вместо `AUDIT_ACTIONS` и `AUDIT_ENTITIES`.

