# 🧪 IAM Testing Guide

## Текущий статус: 62% завершено ✅

### Что уже работает:

1. **Разделение auth систем** ✅
2. **RBAC (роли и права)** ✅  
3. **Permission Service** ✅
4. **Миграция админов** ✅
5. **Admin login UI** ✅

---

## 🔐 Как протестировать Admin Login

### 1. Запустить сервер

```bash
npm run dev
```

Сервер запустится на `http://localhost:3000`

### 2. Открыть Admin Login

Перейти на: **http://localhost:3000/admin/auth/login**

### 3. Войти как админ

**Credentials мигрированного админа:**
- Email: `admin@apricode.agency`
- Password: `<ваш текущий пароль админа>`

**Что должно произойти:**
- ✅ Редирект на `/admin/auth/login` (отдельная страница)
- ✅ Красивый UI с Shield иконкой
- ✅ После успешного входа → редирект на `/admin`
- ✅ Cookie `admin.session-token` установлен (можно проверить в DevTools)

### 4. Проверить разделение

**Client login:** http://localhost:3000/login
- Должен использовать User table
- Cookie: `next-auth.session-token`
- Редирект: `/dashboard`

**Admin login:** http://localhost:3000/admin/auth/login
- Использует Admin table
- Cookie: `admin.session-token`
- Редирект: `/admin`

---

## 🔑 Протестировать Permission Service

### В API route или Server Component:

```typescript
import { PermissionService } from '@/lib/services/permission.service';
import { getAdminSession } from '@/auth-admin';

export async function GET(request: Request) {
  // 1. Get admin session
  const session = await getAdminSession();
  
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Check permission
  const hasAccess = await PermissionService.hasPermission(
    session.user.id,
    'orders',
    'approve'
  );

  if (!hasAccess) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Process request
  return Response.json({ success: true });
}
```

### Проверить роли в БД:

```bash
# Открыть Prisma Studio
npx prisma studio
```

Проверить таблицы:
- `Admin` - должен быть 1 админ
- `RoleModel` - 7 ролей
- `Permission` - 44 permissions
- `RolePermission` - 106 mappings

---

## 🧪 Тест: Проверка прав через API

### Создать тестовый endpoint:

**`src/app/api/test/permissions/route.ts`:**

```typescript
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/auth-admin';
import { PermissionService } from '@/lib/services/permission.service';

export async function GET() {
  const session = await getAdminSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  // Get admin from DB
  const admin = await prisma.admin.findUnique({
    where: { id: session.user.id },
    select: { email: true, role: true }
  });

  // Get all permissions for this admin
  const permissions = await PermissionService.getAdminPermissions(session.user.id);

  // Test specific permissions
  const tests = {
    'orders:read': await PermissionService.hasPermission(session.user.id, 'orders', 'read'),
    'orders:approve': await PermissionService.hasPermission(session.user.id, 'orders', 'approve'),
    'kyc:approve': await PermissionService.hasPermission(session.user.id, 'kyc', 'approve'),
    'payouts:approve': await PermissionService.hasPermission(session.user.id, 'payouts', 'approve'),
    'users:impersonate': await PermissionService.hasPermission(session.user.id, 'users', 'impersonate'),
  };

  return NextResponse.json({
    admin: {
      email: admin?.email,
      role: admin?.role
    },
    totalPermissions: permissions.length,
    permissions,
    tests
  });
}
```

### Вызвать endpoint:

```bash
# После входа в админку, вызвать:
curl http://localhost:3000/api/test/permissions \
  -H "Cookie: admin.session-token=<ваш токен из DevTools>"
```

**Ожидаемый результат:**

```json
{
  "admin": {
    "email": "admin@apricode.agency",
    "role": "ADMIN"
  },
  "totalPermissions": 16,
  "permissions": [
    "orders:read",
    "orders:create",
    "orders:update",
    "orders:approve",
    ...
  ],
  "tests": {
    "orders:read": true,
    "orders:approve": true,
    "kyc:approve": true,
    "payouts:approve": false,  // ADMIN не может approve payouts
    "users:impersonate": false  // только SUPER_ADMIN
  }
}
```

---

## 📊 Проверить миграцию

### 1. Проверить Admin таблицу:

```sql
SELECT id, email, role, "isActive", "lastLogin", "createdAt"
FROM "Admin";
```

**Ожидается:** 1 запись с мигрированным админом

### 2. Проверить AuditLog:

```sql
SELECT "adminId", "userEmail", "userRole", action, entity, "createdAt"
FROM "AuditLog"
WHERE "adminId" IS NOT NULL
LIMIT 10;
```

**Ожидается:** 1066 записей с `adminId` заполненным

### 3. Проверить AdminSettings:

```sql
SELECT "adminId", "idleTimeout", "maxSessionDuration", "sessionTimeout"
FROM "AdminSettings"
WHERE "adminId" IS NOT NULL;
```

**Ожидается:** 1 запись с настройками админа

---

## 🚀 Что НЕ работает пока (TODO):

- ❌ WebAuthn (Passkeys) - заглушка в auth-admin.ts
- ❌ Step-up MFA - еще не реализовано
- ❌ Session Manager UI - нет интерфейса
- ❌ Break-glass emergency access - нет страницы
- ❌ Idle timeout проверка - нет логики
- ❌ AuditLog hash generation - не реализовано

---

## 🔜 Следующие шаги:

### 1. WebAuthn (Passkeys)
- Установить `@simplewebauthn/server` и `@simplewebauthn/browser`
- Реализовать `passkey.service.ts`
- Создать UI для регистрации Passkey
- Обновить `auth-admin.ts` с реальной логикой

### 2. Step-up MFA
- Создать `step-up-mfa.service.ts`
- Реализовать challenge generation
- Добавить middleware для критических actions
- Создать UI для Step-up challenge

### 3. Session Manager
- Создать `/admin/sessions` страницу
- Показать активные сессии
- Добавить кнопку "Terminate"
- Реализовать idle timeout checker

---

## 💡 Tips для тестирования:

1. **Проверяй cookies в DevTools:**
   - Application → Cookies
   - Должны быть 2 разных cookie для client и admin

2. **Используй Prisma Studio:**
   ```bash
   npx prisma studio
   ```
   - Смотри Admin, RoleModel, Permission таблицы

3. **Проверяй middleware редиректы:**
   - `/admin` без auth → `/admin/auth/login`
   - `/dashboard` без auth → `/login`

4. **Логи в консоли:**
   - При входе админа должен быть лог "Admin auth"
   - При входе клиента - "Client auth"

---

**Документация подготовлена:** 31 октября 2024
**Прогресс:** 62% (10/16 задач)
**ETA завершения:** 5-8 дней

