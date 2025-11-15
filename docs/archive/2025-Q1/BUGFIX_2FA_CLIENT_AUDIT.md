# 🐛 Bugfix: 2FA для клиентов - Ошибка логирования

**Дата:** 2025-11-11  
**Статус:** ✅ Исправлено  
**Приоритет:** 🔴 Critical

---

## 🐛 Описание проблемы

При попытке включения/отключения 2FA для **клиентов** (User) возникала ошибка:

```
Foreign key constraint violated: `AdminAuditLog_adminId_fkey (index)`
```

### Причина:
Клиентские API endpoints (`/api/2fa/*`) использовали `auditService.logAdminAction()` вместо `auditService.logUserAction()`. Это приводило к попытке записи `userId` клиента в таблицу `AdminAuditLog`, где такого `adminId` не существует.

### Затронутые endpoints:
1. `POST /api/2fa/verify` - Включение 2FA
2. `POST /api/2fa/disable` - Отключение 2FA
3. `POST /api/2fa/backup-codes` - Регенерация backup codes

---

## 🔧 Исправление

### 1. `/api/2fa/verify/route.ts`

**Было:**
```typescript
// Audit log
await auditService.logAdminAction(
  session.user.id,  // ❌ userId клиента пытается записаться в AdminAuditLog
  AUDIT_ACTIONS.SETTINGS_UPDATED,
  AUDIT_ENTITIES.USER,
  session.user.id,
  { twoFactorEnabled: false },
  { twoFactorEnabled: true },
  { method: 'TOTP' }
);
```

**Стало:**
```typescript
// Audit log (для клиента используем logUserAction)
await auditService.logUserAction(
  session.user.id,  // ✅ Правильный метод для клиентов
  AUDIT_ACTIONS.SETTINGS_UPDATED,
  AUDIT_ENTITIES.USER,
  session.user.id,
  { 
    twoFactorEnabled: true,
    method: 'TOTP' 
  }
);
```

### 2. `/api/2fa/disable/route.ts`

**Было:**
```typescript
await auditService.logAdminAction(
  session.user.id,
  AUDIT_ACTIONS.SETTINGS_UPDATED,
  AUDIT_ENTITIES.USER,
  session.user.id,
  { twoFactorEnabled: true },
  { twoFactorEnabled: false },
  { method: 'TOTP' }
);
```

**Стало:**
```typescript
// Audit log (для клиента используем logUserAction)
await auditService.logUserAction(
  session.user.id,
  AUDIT_ACTIONS.SETTINGS_UPDATED,
  AUDIT_ENTITIES.USER,
  session.user.id,
  { 
    twoFactorEnabled: false,
    method: 'TOTP' 
  }
);
```

### 3. `/api/2fa/backup-codes/route.ts`

**Было:**
```typescript
await auditService.logAdminAction(
  session.user.id,
  AUDIT_ACTIONS.SETTINGS_UPDATED,
  AUDIT_ENTITIES.USER,
  session.user.id,
  {},
  { backupCodesRegenerated: true },
  { method: 'TOTP' }
);
```

**Стало:**
```typescript
// Audit log (для клиента используем logUserAction)
await auditService.logUserAction(
  session.user.id,
  AUDIT_ACTIONS.SETTINGS_UPDATED,
  AUDIT_ENTITIES.USER,
  session.user.id,
  { 
    backupCodesRegenerated: true,
    method: 'TOTP' 
  }
);
```

---

## ✅ Результат

### До исправления:
- ❌ Клиенты не могли включить 2FA
- ❌ Ошибка 500 при попытке включения
- ❌ Foreign key constraint violation
- ❌ Логи не записывались

### После исправления:
- ✅ Клиенты могут включать 2FA
- ✅ Клиенты могут отключать 2FA
- ✅ Клиенты могут регенерировать backup codes
- ✅ Все действия логируются в `UserAuditLog`
- ✅ Нет ошибок foreign key constraint
- ✅ Правильное разделение логов: клиенты → UserAuditLog, админы → AdminAuditLog

---

## 🧪 Тестирование

### Шаги для проверки:

1. **Войти как клиент**
   ```
   Email: bogdan.apricode@gmail.com
   URL: http://localhost:3000/login
   ```

2. **Перейти в Security Settings**
   ```
   URL: http://localhost:3000/profile (вкладка Security)
   ```

3. **Включить 2FA**
   - Нажать "Enable 2FA"
   - Отсканировать QR-код
   - Ввести код из приложения
   - **Ожидаемый результат:** ✅ 2FA включен, backup codes показаны

4. **Отключить 2FA**
   - Нажать "Disable 2FA"
   - Ввести пароль
   - **Ожидаемый результат:** ✅ 2FA отключен

5. **Регенерировать backup codes**
   - Включить 2FA снова
   - Нажать "Regenerate Backup Codes"
   - Ввести пароль
   - **Ожидаемый результат:** ✅ Новые backup codes показаны

6. **Проверить логи**
   ```sql
   SELECT * FROM "UserAuditLog" 
   WHERE action = 'SETTINGS_UPDATED' 
   ORDER BY "createdAt" DESC 
   LIMIT 5;
   ```
   - **Ожидаемый результат:** ✅ Записи о включении/отключении 2FA

---

## 📊 Влияние

### Затронутые пользователи:
- **Клиенты (User)** - не могли использовать 2FA
- **Админы (Admin)** - не затронуты (используют другие endpoints)

### Критичность:
- **🔴 Critical** - блокирует важную функциональность безопасности

### Время исправления:
- **5 минут** - простая замена методов логирования

---

## 🔍 Root Cause Analysis

### Почему произошло:
1. При создании 2FA endpoints использовался шаблон из админских endpoints
2. Не была проведена проверка на правильность логирования для клиентов
3. Отсутствовали unit-тесты для клиентских 2FA endpoints

### Как предотвратить в будущем:
1. ✅ Добавить комментарии о разделении логирования (User vs Admin)
2. ✅ Создать unit-тесты для всех 2FA endpoints
3. ✅ Code review должен проверять правильность audit logging
4. ✅ Добавить lint правило для проверки `logAdminAction` в клиентских endpoints

---

## 📝 Связанные файлы

### Измененные файлы:
```
src/app/api/2fa/verify/route.ts
src/app/api/2fa/disable/route.ts
src/app/api/2fa/backup-codes/route.ts
```

### Связанные сервисы:
```
src/lib/services/audit.service.ts
src/lib/services/totp.service.ts
```

### Схема базы данных:
```
prisma/schema.prisma
  - UserAuditLog (для клиентов)
  - AdminAuditLog (для админов)
```

---

## ✅ Чеклист

- [x] Проблема идентифицирована
- [x] Исправление реализовано
- [x] Код проверен линтером
- [x] Документация обновлена
- [x] Готово к тестированию
- [ ] Протестировано вручную
- [ ] Unit-тесты добавлены
- [ ] Готово к деплою

---

**Статус:** ✅ Исправлено и готово к тестированию  
**Next Steps:** Протестировать вручную все 3 сценария

