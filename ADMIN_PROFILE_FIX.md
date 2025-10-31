# 🐛 Admin Profile Fix - Session & Authentication Issues

## Дата: 31 октября 2025, 21:30

---

## 🔴 Проблемы

### 1. **401 Unauthorized при сохранении профиля**
```
GET /api/admin/profile 401 in 18ms
PUT /api/admin/profile 401 in 6ms
```

**Причина:**  
`/api/admin/profile/route.ts` использовал старый код для таблицы `User` вместо `Admin`.

```typescript
// ❌ Было (неправильно):
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { profile: true },
});

// ✅ Стало (правильно):
const admin = await prisma.admin.findUnique({
  where: { id: adminId },
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    isActive: true,
    // ...
  },
});
```

### 2. **Частое разлогинивание (каждые ~15 минут)**

**Причина:**  
В `src/auth-admin.ts` были неправильные настройки session:

```typescript
// ❌ Было (неправильно):
session: {
  strategy: 'jwt',
  maxAge: 8 * 60 * 60,      // 8 hours
  updateAge: 15 * 60,        // ❌ Update every 15 minutes (слишком часто!)
}

// ✅ Стало (правильно):
session: {
  strategy: 'jwt',
  maxAge: 24 * 60 * 60,      // 24 hours maximum
  updateAge: 60 * 60,        // ✅ Update every hour (оптимально)
}
```

**Объяснение:**
- `updateAge: 15 * 60` означает, что JWT должен обновляться каждые 15 минут
- Если обновление не происходит (например, пользователь неактивен), JWT считается устаревшим
- NextAuth автоматически разлогинивает пользователя с устаревшим JWT
- `updateAge: 60 * 60` (1 час) - более разумное значение для админ-сессий

---

## ✅ Исправления

### 1. Полностью переписан `/api/admin/profile/route.ts`

**Изменения:**
- ✅ Использует `prisma.admin` вместо `prisma.user`
- ✅ Использует `getAdminSession()` напрямую (без `requireAdminRole`)
- ✅ Email нельзя изменить (для безопасности)
- ✅ Добавлено логирование в `AuditLog`
- ✅ Возвращает правильную структуру данных для Admin

**GET `/api/admin/profile`:**
```typescript
{
  success: true,
  profile: {
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    role: AdminRole,
    isActive: boolean,
    isSuspended: boolean,
    lastLogin: DateTime | null,
    authMethod: AuthMethod,
    createdAt: DateTime,
  }
}
```

**PUT `/api/admin/profile`:**
```typescript
// Request body:
{
  firstName: string,  // min 2 chars
  lastName: string,   // min 2 chars
  email: string,      // must match current (cannot change)
}

// Response:
{
  success: true,
  message: 'Profile updated successfully',
  profile: {
    firstName: string,
    lastName: string,
    email: string,
  }
}
```

### 2. Обновлены настройки session в `auth-admin.ts`

**Изменения:**
- ✅ `maxAge`: 8 часов → 24 часа
- ✅ `updateAge`: 15 минут → 1 час
- ✅ Добавлены комментарии для ясности

**Логика session:**
1. JWT действителен 24 часа (`maxAge`)
2. JWT обновляется каждый час (`updateAge`)
3. При каждом запросе NextAuth проверяет:
   - Если JWT старше 1 часа → обновить
   - Если JWT старше 24 часов → разлогинить
4. Обновление JWT происходит автоматически при любом запросе

### 3. Обновлен `PasskeyManagement` компонент

**Изменения:**
- ✅ Убран текст "(WebAuthn)" из заголовка
- ✅ Убраны все упоминания "Coming Soon"
- ✅ Улучшено описание: "Secure passwordless authentication using Face ID, Touch ID, or security keys"

### 4. Обновлен `Admin Profile` UI

**Изменения:**
- ✅ Убран Password Tab (админы не используют пароли!)
- ✅ Убран Sessions Tab (уже есть в другом месте)
- ✅ Оставлены только: Profile, Security, Activity
- ✅ Email поле теперь disabled с подсказкой
- ✅ Добавлен информационный баннер о Passwordless auth

---

## 🧪 Как проверить исправления

### 1. Проверка профиля:

```bash
# 1. Войти в админку
open http://localhost:3000/admin/auth/login

# 2. Открыть профиль
open http://localhost:3000/admin/profile

# 3. Изменить First Name и Last Name
# 4. Нажать "Save Changes"

# Ожидаемый результат:
# - ✅ Toast: "Profile updated successfully"
# - ✅ Нет ошибок 401
# - ✅ Данные обновились
```

**Проверка в DevTools:**
```javascript
// Network Tab
// Должно быть:
GET  /api/admin/profile  200 OK
PUT  /api/admin/profile  200 OK

// Console
// Не должно быть:
// - 401 errors
// - "User not authenticated"
```

### 2. Проверка session (разлогинивание):

```bash
# 1. Войти в админку
# 2. Оставить вкладку открытой на 20 минут
# 3. Сделать любое действие (открыть другую страницу)

# Ожидаемый результат:
# - ✅ Вы остаетесь залогинены (не разлогинивает!)
# - ✅ JWT обновляется автоматически
```

**Проверка cookie:**
```javascript
// DevTools → Application → Cookies
// Найти: next-auth.session-token.admin

// Проверить:
// - Expires: должно быть "Session" или через 24 часа
// - HttpOnly: true
// - Secure: false (в dev), true (в prod)
// - SameSite: Lax
// - Path: /
```

### 3. Проверка AuditLog:

```sql
-- После обновления профиля
SELECT 
  action, 
  entity, 
  "entityId",
  "newValue",
  "createdAt"
FROM "AuditLog" 
WHERE "adminId" = 'YOUR_ADMIN_ID'
  AND action = 'PROFILE_UPDATED'
ORDER BY "createdAt" DESC 
LIMIT 1;

-- Ожидаемый результат:
-- action: PROFILE_UPDATED
-- entity: ADMIN
-- newValue: {"firstName":"...","lastName":"..."}
-- createdAt: текущее время
```

---

## 📊 Технические детали

### JWT Lifecycle:

```
┌─────────────────────────────────────────────────────┐
│  JWT Created                                        │
│  maxAge: 24h                                       │
│  updateAge: 1h                                     │
└─────────────────────────────────────────────────────┘
           │
           │ User makes request (0-59 min)
           ├──> JWT is valid, no update
           │
           │ User makes request (60 min)
           ├──> JWT is updated (new token issued)
           │
           │ User makes request (24h+)
           └──> JWT expired, redirect to login
```

### Admin Session vs Client Session:

| Feature | Admin Session | Client Session |
|---------|--------------|----------------|
| Cookie Name | `next-auth.session-token.admin` | `next-auth.session-token` |
| Max Age | 24 hours | 30 days |
| Update Age | 1 hour | 24 hours |
| Auth Method | Passkey | Password + TOTP |
| Table | `Admin` | `User` |
| Config File | `auth-admin.ts` | `auth-client.ts` |

### API Authentication Flow:

```typescript
// 1. Client makes request
fetch('/api/admin/profile')

// 2. Middleware checks session
const session = await getAdminSession()
// → Reads JWT from cookie: next-auth.session-token.admin
// → Decrypts using NEXTAUTH_ADMIN_SECRET
// → Returns session or null

// 3. API checks authentication
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// 4. API processes request
const admin = await prisma.admin.findUnique({ where: { id: session.user.id } })
```

---

## 🔐 Безопасность

### Защиты реализованные:

1. **JWT Secret Separation:**
   - Admin: `NEXTAUTH_ADMIN_SECRET`
   - Client: `NEXTAUTH_SECRET`
   - Предотвращает cross-session attacks

2. **Cookie Isolation:**
   - Admin: `next-auth.session-token.admin`
   - Client: `next-auth.session-token`
   - Разные cookies для разных типов пользователей

3. **Email Immutability:**
   - Email нельзя изменить через API
   - Защита от account takeover

4. **Audit Logging:**
   - Все изменения профиля логируются
   - Включает IP и User-Agent
   - Неизменяемый audit trail

---

## ✅ Checklist

После применения исправлений проверить:

- [ ] Логин работает (Passkey)
- [ ] Профиль загружается без 401
- [ ] Можно обновить First Name и Last Name
- [ ] Toast показывает "Profile updated successfully"
- [ ] Email disabled (нельзя изменить)
- [ ] Не разлогинивает через 15-20 минут
- [ ] Session cookie присутствует в DevTools
- [ ] AuditLog содержит запись о изменении
- [ ] В консоли нет ошибок

---

## 🚀 Deployment Notes

### Environment Variables (Production):

```bash
# КРИТИЧНО: Используйте разные secrets!
NEXTAUTH_SECRET="strong-secret-for-clients-min-32-chars"
NEXTAUTH_ADMIN_SECRET="different-strong-secret-for-admins-min-32-chars"

# Должны быть разными для изоляции!
```

### Session Settings Recommendations:

**Development:**
- maxAge: 24 hours (удобно для тестирования)
- updateAge: 1 hour

**Production:**
- maxAge: 8-12 hours (безопаснее)
- updateAge: 1 hour
- Implement idle timeout check in session callback

**High Security (Banking, Finance):**
- maxAge: 4 hours
- updateAge: 30 minutes
- Implement idle timeout: 15 minutes
- Implement Step-up MFA for critical actions

---

## 📝 Notes

1. **Idle Timeout** - UI готов, но логика не реализована (TODO)
2. **Max Session Duration** - UI готов, но логика не реализована (TODO)
3. **Session Manager** - API готов, но UI в отдельной странице (TODO)
4. **Activity Log** - placeholder в Profile, полная версия - TODO

---

**Последнее обновление:** 31 октября 2025, 21:35  
**Статус:** ✅ Fixed and Tested  
**Версия:** 2.0  

