# Admin Actions Logic

## Overview
Логика действий (Actions) для администраторов в зависимости от их статуса и роли.

## Actions по статусам

### 1. INVITED (Приглашён)
**Описание:** Админ приглашён, но ещё не завершил регистрацию Passkey.

**Доступные действия:**
- 📧 **Resend Invite** - Повторно отправить приглашение (если истёк срок)
- 🗑️ **Cancel Invitation** - Отменить приглашение (удалить)

**Время жизни:** 15 минут с момента создания

**Ограничения:**
- Нельзя редактировать
- Нельзя изменить роль
- Нельзя приостановить

---

### 2. ACTIVE (Активный)
**Описание:** Админ активен и имеет доступ к системе.

#### 2.1 Для себя (You)
**Доступные действия:**
- ✏️ **Edit Profile** - Редактировать свой профиль
- 🛡️ **Security Settings** - Настройки безопасности (Passkeys, MFA)

**Ограничения:**
- Нельзя приостановить себя
- Нельзя удалить себя
- Нельзя изменить свою роль

#### 2.2 Для других админов
**Доступные действия:**
- ✏️ **Edit Details** - Редактировать данные (имя, email, должность)
- 👤 **Change Role** - Изменить роль (ADMIN → COMPLIANCE, etc.)
- ⏸️ **Suspend** - Временно приостановить доступ
- 🗑️ **Terminate** - Окончательно уволить (TERMINATED)

**Требования:**
- **Edit/Change Role:** Требует права `admins:update`
- **Suspend:** Требует права `admins:suspend`
- **Terminate:** Требует права `admins:delete` + Step-up MFA

---

### 3. SUSPENDED (Приостановлен)
**Описание:** Админ временно приостановлен (отпуск, расследование, etc.)

**Доступные действия:**
- ✅ **Reactivate** - Восстановить доступ (статус → ACTIVE)
- 🗑️ **Terminate Permanently** - Окончательно уволить

**Требования:**
- **Reactivate:** Требует права `admins:update`
- **Terminate:** Требует права `admins:delete` + Step-up MFA

---

### 4. TERMINATED (Уволен)
**Описание:** Админ окончательно уволен. Все доступы отозваны.

**Доступные действия:**
- ℹ️ **No actions available** - Никаких действий недоступно

**Ограничения:**
- Нельзя восстановить (только создать нового админа)
- Только просмотр истории (Audit Log)

---

## Permissions Matrix

| Action | Permission Required | Step-up MFA | Notes |
|--------|-------------------|-------------|-------|
| Resend Invite | `admins:create` | ❌ | Только для INVITED |
| Cancel Invitation | `admins:delete` | ❌ | Только для INVITED |
| Edit Profile (Self) | - | ❌ | Всегда доступно |
| Security Settings (Self) | - | ❌ | Всегда доступно |
| Edit Details | `admins:update` | ❌ | Не для себя |
| Change Role | `admins:update` | ✅ | Не для себя, критическое действие |
| Suspend | `admins:suspend` | ✅ | Не для себя |
| Reactivate | `admins:update` | ❌ | Только для SUSPENDED |
| Terminate | `admins:delete` | ✅ | Не для себя, необратимо |

---

## Security Features

### Step-up MFA
Критические действия требуют повторной аутентификации через Passkey:
- Invite New Admin
- Change Admin Role
- Suspend Admin
- Terminate Admin

### Audit Logging
Все действия логируются в `AdminAuditLog`:
- Кто выполнил действие
- Когда (timestamp)
- Что изменилось (diff)
- IP адрес и User Agent
- MFA verification details

### Token Expiration
- **Invite Token:** 15 минут (безопасность)
- **Session Token:** 24 часа (удобство)
- **MFA Challenge:** 5 минут

---

## UI/UX Guidelines

### Colors
- **INVITED:** Blue (`text-blue-600`)
- **ACTIVE:** Green (`text-green-600`)
- **SUSPENDED:** Amber (`text-amber-600`)
- **TERMINATED:** Red (`text-destructive`)

### Icons
- Resend Invite: `Mail`
- Edit: `Edit`
- Change Role: `UserCog`
- Suspend: `Ban`
- Reactivate: `CheckCircle`
- Terminate: `Trash2`
- Security: `Shield`
- Info: `Info`

### Confirmation Dialogs
- **Suspend:** "Are you sure? They will be unable to access..."
- **Terminate:** "This action is permanent and cannot be undone..."
- **Cancel Invitation:** "This will delete the invitation..."

---

## Implementation Status

✅ **Completed:**
- INVITED status support
- 15-minute token expiration
- Step-up MFA for critical actions
- Actions menu logic
- Status badges
- Metrics dashboard

🔄 **In Progress:**
- Resend Invite functionality
- Edit Profile/Details dialogs
- Change Role dialog
- Security Settings page

📋 **Planned:**
- Bulk actions (suspend multiple admins)
- Admin activity timeline
- Role templates
- Automated suspension (inactivity)

---

## Testing Checklist

- [ ] Invite admin → receive link → register Passkey → status ACTIVE
- [ ] Resend invite for expired token
- [ ] Cancel invitation (INVITED → deleted)
- [ ] Edit own profile (self)
- [ ] Edit other admin details
- [ ] Change admin role (with MFA)
- [ ] Suspend admin (with MFA)
- [ ] Reactivate suspended admin
- [ ] Terminate admin (with MFA)
- [ ] Verify audit logs for all actions
- [ ] Test permissions (ADMIN vs COMPLIANCE vs READ_ONLY)
- [ ] Test "You" badge (cannot suspend/terminate self)

---

## API Endpoints

```
POST /api/admin/admins/invite          - Invite new admin (Step-up MFA)
POST /api/admin/admins/[id]/suspend    - Suspend admin (Step-up MFA)
POST /api/admin/admins/[id]/reactivate - Reactivate admin
POST /api/admin/admins/[id]/terminate  - Terminate admin (Step-up MFA)
POST /api/admin/admins/[id]/role       - Change role (Step-up MFA)
PATCH /api/admin/admins/[id]           - Update admin details
```

---

**Last Updated:** 2025-11-10
**Version:** 1.0.0

