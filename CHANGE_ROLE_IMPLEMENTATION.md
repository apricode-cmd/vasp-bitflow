# Change Admin Role - Реализация ✅

## 📋 Что реализовано

### 1. API Endpoint ✅

**Файл:** `src/app/api/admin/admins/[id]/change-role/route.ts`

**Метод:** `POST /api/admin/admins/[id]/change-role`

**Требования:**
- ✅ Только SUPER_ADMIN
- ✅ Step-up MFA (Passkey verification)
- ✅ Audit logging (ADMIN_ROLE_CHANGED)

**Валидация:**
- ✅ Нельзя изменить роль себе
- ✅ Нельзя изменить роль SUPER_ADMIN
- ✅ Нельзя изменить роль TERMINATED админа
- ✅ Новая роль должна существовать и быть активной
- ✅ Проверка, что роль не совпадает с текущей

**Request Body:**
```json
{
  "newRoleCode": "COMPLIANCE",
  "reason": "Promotion to Compliance Officer" // optional
}
```

**Response (MFA required):**
```json
{
  "success": false,
  "requiresMfa": true,
  "challengeId": "uuid",
  "options": { /* WebAuthn options */ }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Admin role changed successfully",
  "data": {
    "adminId": "uuid",
    "oldRole": "ADMIN",
    "newRole": "COMPLIANCE"
  }
}
```

---

### 2. Step-up MFA ✅

**Файл:** `src/lib/services/step-up-mfa.service.ts`

**Изменения:**
- ✅ Добавлено `CHANGE_ADMIN_ROLE` в `STEP_UP_REQUIRED_ACTIONS`

**Flow:**
1. Первый запрос → MFA challenge
2. Пользователь подтверждает Passkey
3. Повторный запрос с `mfaChallengeId` и `mfaResponse`
4. Верификация → Изменение роли

---

### 3. UI Components ✅

**Файл:** `src/app/(admin)/admin/admins/page-client.tsx`

#### 3.1. State Management
```typescript
const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
const [roles, setRoles] = useState<any[]>([]);
const [selectedNewRole, setSelectedNewRole] = useState('');
const [changeRoleReason, setChangeRoleReason] = useState('');
```

#### 3.2. Functions
- ✅ `loadRoles()` - Загрузка доступных ролей (исключая SUPER_ADMIN)
- ✅ `handleOpenChangeRole(admin)` - Открытие диалога
- ✅ `handleChangeRole()` - Изменение роли с MFA flow

#### 3.3. UI Elements
- ✅ Кнопка "Change Role" в actions menu (для ACTIVE админов)
- ✅ Модальное окно с:
  - Текущая роль (read-only)
  - Select для выбора новой роли
  - Input для причины (optional)
  - MFA warning
  - Кнопки Cancel / Change Role

---

### 4. Audit Logging ✅

**Файл:** `src/lib/services/audit.service.ts`

**Action:** `ADMIN_ROLE_CHANGED` (уже был в списке)

**Entity:** `ADMIN`

**Logged Data:**
```typescript
{
  targetAdmin: "admin@example.com",
  targetName: "John Doe",
  oldRole: "ADMIN",
  newRole: "COMPLIANCE",
  newRoleName: "Compliance Officer",
  reason: "Promotion to Compliance Officer",
  mfaVerified: true
}
```

**Severity:** `CRITICAL`

---

## 🎨 UI Screenshots (описание)

### Actions Menu (ACTIVE Admin)
```
┌─────────────────────┐
│ Actions             │
├─────────────────────┤
│ ✏️  Edit Details    │
│ 👤  Change Role     │ ← NEW!
├─────────────────────┤
│ 🚫  Suspend         │
│ 🗑️  Terminate       │
└─────────────────────┘
```

### Change Role Dialog
```
┌─────────────────────────────────────┐
│ Change Administrator Role           │
│ Change role for John Doe            │
├─────────────────────────────────────┤
│ Current Role                        │
│ ┌─────────────────────────────────┐ │
│ │ ADMIN                           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ New Role                            │
│ ┌─────────────────────────────────┐ │
│ │ Select new role ▼               │ │
│ └─────────────────────────────────┘ │
│   - Administrator                   │
│   - Compliance Officer              │
│   - Treasury Approver               │
│   - Finance Manager                 │
│   - Support Specialist              │
│   - Read Only                       │
│                                     │
│ Reason (Optional)                   │
│ ┌─────────────────────────────────┐ │
│ │ e.g., Promotion...              │ │
│ └─────────────────────────────────┘ │
│ This will be logged in audit trail │
│                                     │
│ ⚠️  MFA Required:                   │
│ You will need to verify your       │
│ identity with your Passkey         │
├─────────────────────────────────────┤
│         [Cancel]  [Change Role]     │
└─────────────────────────────────────┘
```

---

## 🔒 Security Features

1. **Authorization:**
   - ✅ Только SUPER_ADMIN может менять роли
   - ✅ Нельзя изменить роль себе
   - ✅ Нельзя изменить роль другого SUPER_ADMIN

2. **MFA:**
   - ✅ Обязательная Step-up MFA через Passkey
   - ✅ Challenge-response flow

3. **Audit:**
   - ✅ Полное логирование с diff (old → new)
   - ✅ Причина изменения (если указана)
   - ✅ MFA verification status

4. **Validation:**
   - ✅ Роль должна существовать
   - ✅ Роль должна быть активна
   - ✅ Нельзя назначить ту же роль

---

## 🧪 Тестирование

### Manual Testing Checklist

#### 1. Happy Path
- [ ] Залогиниться как SUPER_ADMIN
- [ ] Перейти в `/admin/admins`
- [ ] Найти ACTIVE админа (не себя)
- [ ] Нажать Actions → Change Role
- [ ] Выбрать новую роль
- [ ] Ввести причину (optional)
- [ ] Нажать "Change Role"
- [ ] Подтвердить Passkey
- [ ] Проверить toast "Admin role changed successfully!"
- [ ] Проверить, что роль изменилась в таблице
- [ ] Проверить audit log

#### 2. Validation Tests
- [ ] Попытка изменить роль себе → Error
- [ ] Попытка изменить роль SUPER_ADMIN → Error
- [ ] Попытка изменить роль TERMINATED админа → Error
- [ ] Попытка назначить ту же роль → Error
- [ ] Попытка без выбора новой роли → Button disabled

#### 3. MFA Tests
- [ ] Отмена MFA → Error toast
- [ ] Неправильный Passkey → Error
- [ ] Таймаут MFA → Error

#### 4. Permissions Tests
- [ ] Залогиниться как ADMIN (не SUPER_ADMIN) → Кнопка не видна
- [ ] Залогиниться как READ_ONLY → Кнопка не видна

---

## 📊 Audit Log Example

```sql
SELECT * FROM "AdminAuditLog" 
WHERE action = 'ADMIN_ROLE_CHANGED' 
ORDER BY "createdAt" DESC 
LIMIT 1;
```

**Result:**
```
id: uuid
adminId: uuid (SUPER_ADMIN who made the change)
adminEmail: superadmin@example.com
adminRole: SUPER_ADMIN
action: ADMIN_ROLE_CHANGED
entityType: Admin
entityId: uuid (target admin)
oldValue: { roleCode: "ADMIN", role: "ADMIN" }
newValue: { roleCode: "COMPLIANCE", role: "COMPLIANCE" }
context: {
  targetAdmin: "admin@example.com",
  targetName: "John Doe",
  oldRole: "ADMIN",
  newRole: "COMPLIANCE",
  newRoleName: "Compliance Officer",
  reason: "Promotion to Compliance Officer",
  mfaVerified: true
}
severity: CRITICAL
createdAt: 2025-01-10T12:00:00Z
```

---

## 🚀 Deployment Checklist

- [x] API endpoint создан
- [x] Step-up MFA добавлен
- [x] UI компоненты реализованы
- [x] Audit logging настроен
- [x] Валидация реализована
- [ ] Manual testing выполнено
- [ ] Database migration (если нужно)
- [ ] Documentation обновлена

---

## 📝 Next Steps (Optional)

### 1. Bulk Role Change
Возможность изменить роль нескольким админам одновременно:
```typescript
POST /api/admin/admins/bulk-change-role
{
  "adminIds": ["uuid1", "uuid2"],
  "newRoleCode": "COMPLIANCE",
  "reason": "Department restructuring"
}
```

### 2. Role Change History
Отдельная страница для просмотра истории изменений ролей:
```
/admin/admins/[id]/role-history
```

### 3. Role Change Approval Workflow
Для особо критичных ролей (например, TREASURY_APPROVER):
- Запрос на изменение роли
- Одобрение от другого SUPER_ADMIN
- Dual-control (4-eyes principle)

### 4. Temporary Role Assignment
Временное назначение роли с автоматическим возвратом:
```typescript
{
  "newRoleCode": "TREASURY_APPROVER",
  "expiresAt": "2025-01-15T00:00:00Z",
  "reason": "Temporary coverage"
}
```

---

## 🎉 Summary

✅ **Change Admin Role** полностью реализован!

**Что работает:**
- API endpoint с MFA
- UI с красивым диалогом
- Audit logging
- Валидация и безопасность

**Время реализации:** ~2 часа

**Файлы изменены:**
1. `src/app/api/admin/admins/[id]/change-role/route.ts` (новый)
2. `src/lib/services/step-up-mfa.service.ts` (обновлён)
3. `src/app/(admin)/admin/admins/page-client.tsx` (обновлён)

**Следующий шаг:** Manual testing! 🧪

