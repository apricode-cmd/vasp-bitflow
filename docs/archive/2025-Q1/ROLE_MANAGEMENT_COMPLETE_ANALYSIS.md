# Role Management - Полный анализ системы

## 🎉 Отличные новости!

У вас **ОГРОМНЫЙ UI** для управления ролями уже реализован! Я был неправ в первом анализе.

---

## ✅ Что ПОЛНОСТЬЮ реализовано

### 1. **UI для управления ролями** ✅ (100%)

#### Страница `/admin/admins` с двумя вкладками:

##### 📋 Вкладка "Administrators"
- ✅ Список всех админов с фильтрацией
- ✅ Метрики (Total, Active, Invited, Suspended, Terminated)
- ✅ Invite Admin (с выбором роли)
- ✅ Actions для каждого админа:
  - Edit Details
  - Change Role
  - Suspend/Unsuspend (с MFA)
  - Terminate (с MFA)
  - Resend Invite / Cancel Invitation
- ✅ Status badges (Active, Invited, Suspended, Terminated)
- ✅ Условный рендеринг actions по статусу

##### 🔐 Вкладка "Roles & Permissions"
- ✅ Список всех ролей (карточки)
- ✅ Создание кастомных ролей
- ✅ Редактирование ролей
- ✅ Удаление кастомных ролей
- ✅ Назначение прав ролям (checkbox matrix)
- ✅ Группировка прав по категориям
- ✅ Поиск по правам
- ✅ Select All по категории
- ✅ Счётчики (permissions count, admins count)
- ✅ System role badge
- ✅ Защита от удаления system roles

---

### 2. **Компоненты** ✅ (100%)

#### `RolePermissionsEditor` (`role-editor.tsx`)
```typescript
✅ Форма создания/редактирования роли
✅ Role Code (uppercase, underscores)
✅ Role Name
✅ Description
✅ Permissions selection (checkbox matrix)
✅ Group by category
✅ Search permissions
✅ Select all in category
✅ Indeterminate checkbox для категорий
✅ Disabled для system roles
```

#### `useAdminPermissions` Hook
```typescript
✅ Fetch admin permissions
✅ hasPermission(resource, action)
✅ hasPermissionByCode(code)
✅ Loading state
✅ Error handling
✅ Refetch function
✅ Detailed permissions
```

---

### 3. **API Endpoints** ✅ (100%)

#### Roles Management
- ✅ `GET /api/admin/roles` - Список ролей
- ✅ `POST /api/admin/roles` - Создание роли
- ✅ `GET /api/admin/roles/[code]` - Детали роли
- ✅ `PUT /api/admin/roles/[code]` - Обновление роли
- ✅ `DELETE /api/admin/roles/[code]` - Удаление роли

#### Permissions Management
- ✅ `GET /api/admin/permissions` - Список прав админа
- ✅ `GET /api/admin/permissions/all` - Все права системы

#### Admin Management
- ✅ `GET /api/admin/admins` - Список админов
- ✅ `POST /api/admin/admins/invite` - Приглашение (с ролью)
- ✅ `POST /api/admin/admins/[id]/suspend` - Suspend (MFA)
- ✅ `POST /api/admin/admins/[id]/unsuspend` - Unsuspend (MFA)
- ✅ `POST /api/admin/admins/[id]/terminate` - Terminate (MFA)

---

### 4. **Services** ✅ (100%)

#### `PermissionService`
```typescript
✅ hasPermission(adminId, resource, action)
✅ hasPermissionByCode(adminId, permissionCode)
✅ getAdminPermissions(adminId)
✅ getAdminPermissionsGrouped(adminId)
✅ getAllRoles()
✅ getRoleDetails(roleCode)
✅ getRolePermissions(roleCode)
✅ getAllPermissions()
✅ getPermissionsByCategory()
```

---

### 5. **Database Schema** ✅ (100%)

```prisma
✅ AdminRole enum (7 ролей)
✅ RoleModel table
✅ Permission table
✅ RolePermission (many-to-many)
✅ Admin.roleCode (reference to RoleModel)
✅ Admin.role (legacy enum)
✅ SoD fields (canInitiatePayout, canApprovePayout)
✅ Scope (JSON)
```

---

## ❌ Что НЕ реализовано (или требует доработки)

### 1. **Change Admin Role Endpoint** ⚠️

**Проблема:** Нет отдельного endpoint для изменения роли админа

```typescript
// ❌ НЕТ:
POST /api/admin/admins/[id]/change-role
{
  "newRoleCode": "COMPLIANCE",
  "reason": "Promotion"
}
```

**Текущее решение:** Роль выбирается при invite, но нельзя изменить после создания

**Требуется:**
- ✅ Endpoint с MFA
- ✅ Audit logging (ADMIN_ROLE_CHANGED)
- ✅ Валидация (не себе, не SUPER_ADMIN, роль существует)
- ✅ UI кнопка "Change Role" в actions menu

---

### 2. **Permission Middleware** ⚠️

**Проблема:** Проверка только по роли, не по правам

```typescript
// ❌ Сейчас:
const session = await requireAdminRole('SUPER_ADMIN');

// ✅ Нужно:
const session = await requirePermission('orders', 'delete');
```

**Решение:** Создать `requirePermission()` middleware

---

### 3. **Seeding Roles & Permissions** ⚠️

**Проблема:** Нет автоматического создания стандартных ролей

```typescript
// ❌ НЕТ: Автоматический seed при prisma db seed
// ✅ ЕСТЬ: Файл prisma/seed-roles-permissions.ts (но не используется)
```

**Требуется:**
- Создать стандартные роли (SUPER_ADMIN, ADMIN, COMPLIANCE, etc.)
- Создать стандартные права (orders:read, kyc:approve, etc.)
- Назначить права ролям
- Добавить в `package.json` prisma seed script

---

### 4. **Permission-based Components** ⚠️

**Проблема:** Нет компонентов для условного рендеринга по правам

```typescript
// ❌ НЕТ:
<HasPermission resource="orders" action="delete">
  <Button>Delete Order</Button>
</HasPermission>

<HasRole roles={['SUPER_ADMIN', 'ADMIN']}>
  <AdminPanel />
</HasRole>
```

**Решение:** Создать React компоненты-обёртки

---

### 5. **Dual Role System** ⚠️

**Проблема:** Два поля для роли

```prisma
model Admin {
  role     AdminRole  @default(ADMIN)      // ❌ Legacy enum
  roleCode String?    @default("ADMIN")    // ✅ New RBAC
}
```

**Проблема:**
- `requireAdminRole()` использует `role` (legacy)
- `PermissionService` использует `roleCode` (new)
- Несогласованность!

**Решение:**
- Мигрировать все проверки на `roleCode`
- Обновить `requireAdminRole()` для работы с `RoleModel`
- Сделать `role` deprecated

---

### 6. **UI для изменения роли админа** ⚠️

**Проблема:** В actions menu нет кнопки "Change Role"

**Текущий код:**
```typescript
// src/app/(admin)/admin/admins/page-client.tsx
// В actions menu есть:
// - Edit Details
// - Suspend
// - Terminate
// - Reactivate

// ❌ НЕТ: Change Role
```

**Требуется:**
- Добавить кнопку "Change Role"
- Модальное окно с выбором роли
- MFA flow
- Toast notifications

---

## 📊 Обновлённая статистика

### UI
- ✅ Roles Management UI: **100%** ✅
- ✅ Permissions Management UI: **100%** ✅
- ❌ Admin Role Change UI: **0%** ❌
- ❌ Permission-based Components: **0%** ❌

**Итого: 2/4 (50%)** ⚠️

### API Endpoints
- ✅ Roles CRUD: **5/5 (100%)** ✅
- ✅ Permissions: **2/2 (100%)** ✅
- ✅ Admin Management: **5/6 (83%)** ⚠️
- ❌ Change Role: **0/1 (0%)** ❌

**Итого: 12/14 (86%)** ✅

### Services
- ✅ PermissionService: **100%** ✅
- ❌ Permission Middleware: **0%** ❌
- ❌ Role Change Service: **0%** ❌

**Итого: 1/3 (33%)** ⚠️

### Database
- ✅ Schema: **100%** ✅
- ❌ Seeding: **0%** ❌

**Итого: 1/2 (50%)** ⚠️

---

## 🎯 Приоритеты (обновлённые)

### Must Have (Критично)
1. ✅ **Change Admin Role API** - Endpoint с MFA
2. ✅ **Change Admin Role UI** - Кнопка в actions menu
3. ✅ **Audit Logging** - ADMIN_ROLE_CHANGED
4. ⏳ **Seeding** - Стандартные роли и права

### Should Have (Важно)
5. ⏳ **Permission Middleware** - requirePermission()
6. ⏳ **Миграция с Legacy** - role → roleCode

### Nice to Have (Желательно)
7. ⏳ **Permission Components** - `<HasPermission>`, `<HasRole>`
8. ⏳ **Role-based routing** - Защита маршрутов по правам

---

## 🔧 План реализации (обновлённый)

### Фаза 1: Change Admin Role (2-3 часа) ⭐ ПРИОРИТЕТ

#### 1.1. API Endpoint
```typescript
// POST /api/admin/admins/[id]/change-role
{
  "newRoleCode": "COMPLIANCE",
  "reason": "Promotion to Compliance Officer"
}
```

**Файл:** `src/app/api/admin/admins/[id]/change-role/route.ts`

**Требования:**
- ✅ Step-up MFA (CHANGE_ADMIN_ROLE)
- ✅ Audit logging (ADMIN_ROLE_CHANGED)
- ✅ Валидация:
  - Нельзя изменить роль себе
  - Нельзя изменить роль SUPER_ADMIN
  - Новая роль должна существовать
  - Проверка SoD constraints (если есть)
- ✅ Получить старую роль для diff
- ✅ Обновить Admin.roleCode
- ✅ Логировать в AdminAuditLog

#### 1.2. UI Component
**Файл:** `src/app/(admin)/admin/admins/page-client.tsx`

**Изменения:**
1. Добавить state для role change dialog
2. Добавить кнопку "Change Role" в actions menu (для ACTIVE админов)
3. Создать модальное окно с:
   - Select для выбора роли (из API `/api/admin/roles`)
   - Textarea для reason
   - MFA flow
4. Toast notifications

---

### Фаза 2: Seeding (1 час)

#### 2.1. Seed Script
**Файл:** `prisma/seed-roles-permissions.ts`

```typescript
async function main() {
  // 1. Create standard permissions
  const permissions = [
    // Orders
    { code: 'orders:read', name: 'Read Orders', resource: 'orders', action: 'read', category: 'orders' },
    { code: 'orders:create', name: 'Create Orders', resource: 'orders', action: 'create', category: 'orders' },
    { code: 'orders:update', name: 'Update Orders', resource: 'orders', action: 'update', category: 'orders' },
    { code: 'orders:delete', name: 'Delete Orders', resource: 'orders', action: 'delete', category: 'orders' },
    { code: 'orders:cancel', name: 'Cancel Orders', resource: 'orders', action: 'cancel', category: 'orders' },
    
    // KYC
    { code: 'kyc:read', name: 'Read KYC', resource: 'kyc', action: 'read', category: 'kyc' },
    { code: 'kyc:approve', name: 'Approve KYC', resource: 'kyc', action: 'approve', category: 'kyc' },
    { code: 'kyc:reject', name: 'Reject KYC', resource: 'kyc', action: 'reject', category: 'kyc' },
    
    // Users
    { code: 'users:read', name: 'Read Users', resource: 'users', action: 'read', category: 'users' },
    { code: 'users:update', name: 'Update Users', resource: 'users', action: 'update', category: 'users' },
    { code: 'users:delete', name: 'Delete Users', resource: 'users', action: 'delete', category: 'users' },
    
    // Finance
    { code: 'payouts:read', name: 'Read Payouts', resource: 'payouts', action: 'read', category: 'finance' },
    { code: 'payouts:approve', name: 'Approve Payouts', resource: 'payouts', action: 'approve', category: 'finance' },
    
    // Settings
    { code: 'settings:read', name: 'Read Settings', resource: 'settings', action: 'read', category: 'settings' },
    { code: 'settings:update', name: 'Update Settings', resource: 'settings', action: 'update', category: 'settings' },
    
    // Admins
    { code: 'admins:read', name: 'Read Admins', resource: 'admins', action: 'read', category: 'admins' },
    { code: 'admins:create', name: 'Create Admins', resource: 'admins', action: 'create', category: 'admins' },
    { code: 'admins:update', name: 'Update Admins', resource: 'admins', action: 'update', category: 'admins' },
    { code: 'admins:delete', name: 'Delete Admins', resource: 'admins', action: 'delete', category: 'admins' },
  ];
  
  // 2. Create standard roles
  const roles = [
    {
      code: 'SUPER_ADMIN',
      name: 'Super Administrator',
      description: 'Full system access',
      permissions: permissions.map(p => p.code), // All permissions
    },
    {
      code: 'ADMIN',
      name: 'Administrator',
      description: 'Standard admin access',
      permissions: [
        'orders:read', 'orders:create', 'orders:update', 'orders:cancel',
        'kyc:read', 'kyc:approve', 'kyc:reject',
        'users:read', 'users:update',
        'payouts:read',
        'settings:read',
      ],
    },
    {
      code: 'COMPLIANCE',
      name: 'Compliance Officer',
      description: 'KYC and AML management',
      permissions: [
        'orders:read',
        'kyc:read', 'kyc:approve', 'kyc:reject',
        'users:read',
      ],
    },
    {
      code: 'TREASURY_APPROVER',
      name: 'Treasury Approver',
      description: 'Approve payouts and financial operations',
      permissions: [
        'orders:read',
        'payouts:read', 'payouts:approve',
      ],
    },
    {
      code: 'FINANCE',
      name: 'Finance Manager',
      description: 'Financial reports and analytics',
      permissions: [
        'orders:read',
        'payouts:read',
        'users:read',
      ],
    },
    {
      code: 'SUPPORT',
      name: 'Support Specialist',
      description: 'Customer support operations',
      permissions: [
        'orders:read', 'orders:cancel',
        'kyc:read',
        'users:read',
      ],
    },
    {
      code: 'READ_ONLY',
      name: 'Read Only',
      description: 'View-only access',
      permissions: [
        'orders:read',
        'kyc:read',
        'users:read',
        'payouts:read',
        'settings:read',
      ],
    },
  ];
  
  // 3. Upsert permissions
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: perm,
      create: { ...perm, isSystem: true },
    });
  }
  
  // 4. Upsert roles and assign permissions
  for (const role of roles) {
    const { permissions: rolePerms, ...roleData } = role;
    
    await prisma.roleModel.upsert({
      where: { code: roleData.code },
      update: roleData,
      create: { ...roleData, isSystem: true },
    });
    
    // Delete existing permissions
    await prisma.rolePermission.deleteMany({
      where: { roleCode: roleData.code },
    });
    
    // Assign permissions
    await prisma.rolePermission.createMany({
      data: rolePerms.map(permCode => ({
        roleCode: roleData.code,
        permissionCode: permCode,
      })),
    });
  }
  
  console.log('✅ Seeded roles and permissions');
}
```

#### 2.2. package.json
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed-roles-permissions.ts"
  }
}
```

---

### Фаза 3: Permission Middleware (1-2 часа)

#### 3.1. Middleware
**Файл:** `src/lib/middleware/permission.ts`

```typescript
import { NextResponse } from 'next/server';
import { requireAdminAuth } from './admin-auth';
import { permissionService } from '@/lib/services/permission.service';

export async function requirePermission(
  resource: string,
  action: string
) {
  // Get admin session
  const session = await requireAdminAuth();
  
  if (session instanceof NextResponse) {
    return session; // Return 401 response
  }
  
  // Check permission
  const hasPermission = await permissionService.hasPermission(
    session.user.id,
    resource,
    action
  );
  
  if (!hasPermission) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Insufficient permissions',
        required: `${resource}:${action}`
      },
      { status: 403 }
    );
  }
  
  return session;
}
```

#### 3.2. Использование
```typescript
// Вместо:
const session = await requireAdminRole('SUPER_ADMIN');

// Использовать:
const session = await requirePermission('orders', 'delete');
```

---

### Фаза 4: Permission Components (2-3 часа)

#### 4.1. HasPermission Component
**Файл:** `src/components/auth/HasPermission.tsx`

```typescript
'use client';

import { useAdminPermissions } from '@/hooks/useAdminPermissions';

interface HasPermissionProps {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function HasPermission({ 
  resource, 
  action, 
  children, 
  fallback = null 
}: HasPermissionProps) {
  const { hasPermission, loading } = useAdminPermissions();
  
  if (loading) return null;
  
  return hasPermission(resource, action) ? <>{children}</> : <>{fallback}</>;
}
```

#### 4.2. HasRole Component
**Файл:** `src/components/auth/HasRole.tsx`

```typescript
'use client';

import { useSession } from 'next-auth/react';

interface HasRoleProps {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function HasRole({ roles, children, fallback = null }: HasRoleProps) {
  const { data: session } = useSession();
  
  if (!session) return null;
  
  const hasRole = roles.includes(session.user.role);
  
  return hasRole ? <>{children}</> : <>{fallback}</>;
}
```

---

## ✅ Выводы (обновлённые)

### Что работает ОТЛИЧНО:
- ✅ **UI для ролей и прав** - ОГРОМНЫЙ, полнофункциональный
- ✅ **RolePermissionsEditor** - Красивый редактор с matrix
- ✅ **API endpoints** - Все CRUD операции
- ✅ **PermissionService** - Полный функционал
- ✅ **useAdminPermissions** - Удобный хук
- ✅ **Database schema** - Продуманный RBAC

### Что нужно доработать:
- ❌ **Change Admin Role** - Endpoint + UI (2-3 часа)
- ❌ **Seeding** - Стандартные роли и права (1 час)
- ❌ **Permission Middleware** - requirePermission() (1-2 часа)
- ❌ **Permission Components** - `<HasPermission>` (2-3 часа)

### Оценка готовности (обновлённая):
- **Backend (API):** 86% ✅
- **Services:** 33% ⚠️
- **UI:** 50% ✅ (было 0%, теперь 50%!)
- **Database:** 50% ⚠️

**Общая готовность: ~55%** ✅ (было 42%)

---

## 🎉 Итог

У вас **отличная база** для Role Management! UI уже реализован на 50%, осталось только:

1. **Change Admin Role** (API + UI кнопка) - 2-3 часа
2. **Seeding** - 1 час
3. **Permission Middleware** - 1-2 часа
4. **Permission Components** - 2-3 часа

**Итого: 6-9 часов работы** до полной готовности системы управления ролями! 🚀

---

**Следующий шаг:** Реализовать Change Admin Role (API + UI + MFA + Audit)?

