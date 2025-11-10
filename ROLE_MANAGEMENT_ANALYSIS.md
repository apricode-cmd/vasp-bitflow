# Role Management Analysis

## 📊 Текущее состояние системы управления ролями

### ✅ Что реализовано

#### 1. **Database Schema (Prisma)**

##### Роли (AdminRole enum)
```prisma
enum AdminRole {
  SUPER_ADMIN       // Полный доступ ко всему
  ADMIN             // Стандартный админ
  COMPLIANCE        // Compliance Officer
  TREASURY_APPROVER // Treasury Approver
  FINANCE           // Finance
  SUPPORT           // Support
  READ_ONLY         // Только чтение
}
```

##### RBAC Tables
- ✅ `RoleModel` - Роли с кастомными правами
- ✅ `Permission` - Права доступа (resource:action)
- ✅ `RolePermission` - Many-to-Many связь Role ↔ Permission
- ✅ `Admin.roleCode` - Ссылка на `RoleModel.code`

##### Admin Model Fields
```prisma
model Admin {
  role     AdminRole  @default(ADMIN)      // Legacy enum (deprecated)
  roleCode String?    @default("ADMIN")    // New: reference to RoleModel
  roleModel RoleModel? @relation(...)
  
  // Separation of Duties (SoD)
  canInitiatePayout Boolean @default(false)
  canApprovePayout  Boolean @default(false)
  
  // Scope (JSON)
  scope Json? // { departments: [...], products: [...] }
}
```

---

#### 2. **API Endpoints**

##### Roles Management
- ✅ `GET /api/admin/roles` - Список всех ролей с правами
- ✅ `POST /api/admin/roles` - Создание кастомной роли
- ✅ `GET /api/admin/roles/[code]` - Детали роли
- ✅ `PUT /api/admin/roles/[code]` - Обновление роли
- ✅ `DELETE /api/admin/roles/[code]` - Удаление кастомной роли

##### Permissions Management
- ✅ `GET /api/admin/permissions` - Список всех прав
- ✅ `GET /api/admin/permissions/all` - Все права с группировкой

##### Admin Management
- ✅ `GET /api/admin/admins` - Список админов
- ✅ `POST /api/admin/admins/invite` - Приглашение админа (с ролью)
- ✅ `POST /api/admin/admins/[id]/suspend` - Приостановка админа (MFA)
- ✅ `POST /api/admin/admins/[id]/unsuspend` - Реактивация админа (MFA)
- ✅ `POST /api/admin/admins/[id]/terminate` - Увольнение админа (MFA)
- ❌ `PATCH /api/admin/admins/[id]/role` - **НЕ РЕАЛИЗОВАНО** (Change Role)

---

#### 3. **Permission Service**

##### Методы
```typescript
class PermissionService {
  // Проверка прав
  async hasPermission(adminId, resource, action): Promise<boolean>
  async hasPermissionByCode(adminId, permissionCode): Promise<boolean>
  
  // Получение прав
  async getAdminPermissions(adminId): Promise<string[]>
  async getAdminPermissionsGrouped(adminId): Promise<GroupedPermissions>
  
  // Управление ролями
  async getAllRoles(): Promise<Role[]>
  async getRoleDetails(roleCode): Promise<RoleDetails>
  async getRolePermissions(roleCode): Promise<Permission[]>
  
  // Управление правами
  async getAllPermissions(): Promise<Permission[]>
  async getPermissionsByCategory(): Promise<Record<string, Permission[]>>
}
```

##### Использование
```typescript
// Проверка прав
const canApproveKYC = await permissionService.hasPermission(
  adminId,
  'kyc',
  'approve'
);

// Получение всех прав админа
const permissions = await permissionService.getAdminPermissions(adminId);
// ['orders:read', 'orders:create', 'kyc:read', ...]
```

---

#### 4. **Middleware**

##### `requireAdminRole(role)`
```typescript
// Проверка роли (legacy enum)
const session = await requireAdminRole('SUPER_ADMIN');
const session = await requireAdminRole(['SUPER_ADMIN', 'ADMIN']);
```

**Проблема:** Использует legacy `AdminRole` enum, не проверяет `roleCode` и `RoleModel`.

---

### ❌ Что НЕ реализовано

#### 1. **Change Admin Role Endpoint**
```typescript
// ❌ НЕТ
PATCH /api/admin/admins/[id]/role
{
  "newRole": "COMPLIANCE",
  "reason": "Promotion to Compliance Officer"
}
```

**Требования:**
- ✅ Step-up MFA required
- ✅ Audit logging (ADMIN_ROLE_CHANGED)
- ✅ Проверка: нельзя изменить роль себе
- ✅ Проверка: нельзя изменить роль SUPER_ADMIN
- ✅ Проверка: новая роль должна существовать
- ✅ Проверка: SoD constraints (если есть)

---

#### 2. **UI для управления ролями**
```
❌ НЕТ: /admin/roles - Страница управления ролями
❌ НЕТ: /admin/permissions - Страница управления правами
❌ НЕТ: /admin/admins/[id]/edit - Редактирование админа (включая роль)
```

**Требуется:**
- Список ролей с количеством админов
- Создание/редактирование кастомных ролей
- Назначение прав ролям (checkbox matrix)
- Изменение роли админа (с MFA)
- Просмотр прав конкретного админа

---

#### 3. **Permission Middleware**
```typescript
// ❌ НЕТ: Middleware для проверки прав
export async function requirePermission(
  resource: string,
  action: string
) {
  // Check if admin has permission
}

// Использование:
export async function GET(request: NextRequest) {
  const session = await requirePermission('orders', 'read');
  // ...
}
```

---

#### 4. **Seeding Roles & Permissions**
```typescript
// ❌ НЕТ: Автоматическое создание стандартных ролей и прав
// Файл: prisma/seed-roles-permissions.ts существует, но не используется
```

**Требуется:**
- Создание стандартных ролей (SUPER_ADMIN, ADMIN, COMPLIANCE, etc.)
- Создание стандартных прав (orders:read, kyc:approve, etc.)
- Назначение прав ролям
- Запуск при `prisma db seed`

---

#### 5. **Role-based UI Components**
```typescript
// ❌ НЕТ: Компоненты для условного рендеринга
<HasPermission resource="orders" action="delete">
  <Button>Delete Order</Button>
</HasPermission>

<HasRole roles={['SUPER_ADMIN', 'ADMIN']}>
  <AdminPanel />
</HasRole>
```

---

#### 6. **Audit Logging для Role Changes**
```typescript
// ❌ НЕТ: Логирование изменений ролей
AUDIT_ACTIONS.ADMIN_ROLE_CHANGED // ✅ Константа есть, но не используется
```

---

### 🔍 Проблемы и недостатки

#### 1. **Dual Role System (Legacy + New)**
```prisma
model Admin {
  role     AdminRole  @default(ADMIN)      // ❌ Legacy enum
  roleCode String?    @default("ADMIN")    // ✅ New RBAC
  roleModel RoleModel? @relation(...)
}
```

**Проблема:**
- Есть два поля для роли: `role` (enum) и `roleCode` (string)
- `requireAdminRole()` использует только `role` (legacy)
- `PermissionService` использует `roleCode` (new)
- Несогласованность между системами

**Решение:**
- Мигрировать все проверки на `roleCode`
- Обновить `requireAdminRole()` для работы с `RoleModel`
- Сделать `role` deprecated (или удалить после миграции)

---

#### 2. **Нет проверки прав в middleware**
```typescript
// ❌ Сейчас: проверка только роли
const session = await requireAdminRole('SUPER_ADMIN');

// ✅ Нужно: проверка конкретных прав
const session = await requirePermission('orders', 'delete');
```

**Проблема:**
- Грубая проверка по роли, не по правам
- Нельзя дать ADMIN право на удаление заказов без изменения кода

**Решение:**
- Создать `requirePermission()` middleware
- Использовать в API endpoints вместо `requireAdminRole()`

---

#### 3. **Нет UI для управления**
**Проблема:**
- Все API endpoints есть, но нет UI
- Невозможно управлять ролями/правами через админ-панель
- Нужно делать через Prisma Studio или API напрямую

**Решение:**
- Создать страницы `/admin/roles` и `/admin/permissions`
- Создать форму изменения роли админа
- Добавить матрицу прав для ролей

---

#### 4. **Нет seeding**
**Проблема:**
- При создании новой базы нет стандартных ролей и прав
- Нужно вручную создавать через API

**Решение:**
- Реализовать `prisma/seed-roles-permissions.ts`
- Добавить в `package.json` prisma seed script
- Создать стандартные роли и права автоматически

---

### 📊 Статистика реализации

#### API Endpoints
- ✅ Roles CRUD: 5/5 (100%)
- ✅ Permissions: 2/2 (100%)
- ✅ Admin Management: 5/6 (83%)
- ❌ Change Role: 0/1 (0%)

**Итого: 12/14 (86%)**

#### Services
- ✅ PermissionService: 100%
- ❌ Role Change Service: 0%
- ❌ Permission Middleware: 0%

**Итого: 1/3 (33%)**

#### UI
- ❌ Roles Management UI: 0%
- ❌ Permissions Management UI: 0%
- ❌ Admin Role Change UI: 0%
- ❌ Permission-based Components: 0%

**Итого: 0/4 (0%)**

#### Database
- ✅ Schema: 100%
- ❌ Seeding: 0%

**Итого: 1/2 (50%)**

---

## 🎯 План реализации

### Фаза 1: Change Admin Role (2-3 часа)

#### 1.1. API Endpoint
```typescript
// POST /api/admin/admins/[id]/change-role
{
  "newRoleCode": "COMPLIANCE",
  "reason": "Promotion to Compliance Officer"
}
```

**Требования:**
- Step-up MFA
- Audit logging (ADMIN_ROLE_CHANGED)
- Валидация (не себе, не SUPER_ADMIN, роль существует)
- Проверка SoD constraints

#### 1.2. UI Component
- Добавить кнопку "Change Role" в `/admin/admins`
- Модальное окно с выбором роли
- MFA flow
- Toast notifications

---

### Фаза 2: Permission Middleware (1-2 часа)

#### 2.1. Middleware
```typescript
// src/lib/middleware/permission.ts
export async function requirePermission(
  resource: string,
  action: string
) {
  // Get session
  // Check permission via PermissionService
  // Return session or 403
}
```

#### 2.2. Обновить endpoints
```typescript
// Было:
const session = await requireAdminRole('SUPER_ADMIN');

// Стало:
const session = await requirePermission('orders', 'delete');
```

---

### Фаза 3: Roles & Permissions UI (4-6 часов)

#### 3.1. Roles Management
- `/admin/roles` - Список ролей
- Создание/редактирование ролей
- Назначение прав (checkbox matrix)
- Удаление кастомных ролей

#### 3.2. Permissions Management
- `/admin/permissions` - Список прав
- Группировка по категориям
- Создание кастомных прав (опционально)

#### 3.3. Admin Edit
- `/admin/admins/[id]/edit` - Редактирование админа
- Изменение роли (с MFA)
- Просмотр прав админа

---

### Фаза 4: Seeding (1 час)

#### 4.1. Seed Script
```typescript
// prisma/seed-roles-permissions.ts
async function main() {
  // Create standard roles
  // Create standard permissions
  // Assign permissions to roles
}
```

#### 4.2. Standard Roles
- SUPER_ADMIN - Все права
- ADMIN - Основные права
- COMPLIANCE - KYC, AML
- TREASURY_APPROVER - Approve payouts
- FINANCE - Finance reports
- SUPPORT - Read-only + cancel orders
- READ_ONLY - Только чтение

---

### Фаза 5: Permission Components (2-3 часа)

#### 5.1. React Components
```typescript
<HasPermission resource="orders" action="delete">
  <Button>Delete</Button>
</HasPermission>

<HasRole roles={['SUPER_ADMIN']}>
  <AdminPanel />
</HasRole>
```

#### 5.2. Hooks
```typescript
const { hasPermission } = usePermissions();
const canDelete = hasPermission('orders', 'delete');

const { hasRole } = useRole();
const isSuperAdmin = hasRole('SUPER_ADMIN');
```

---

## 🔧 Приоритеты

### Must Have (Критично)
1. ✅ **Change Admin Role API** - Без этого нельзя менять роли
2. ✅ **Change Admin Role UI** - Нужно для управления
3. ✅ **Audit Logging** - Compliance требование
4. ✅ **Seeding** - Для новых инсталляций

### Should Have (Важно)
5. ⏳ **Permission Middleware** - Более гибкий контроль доступа
6. ⏳ **Roles Management UI** - Для управления кастомными ролями

### Nice to Have (Желательно)
7. ⏳ **Permissions Management UI** - Для advanced setup
8. ⏳ **Permission Components** - Для удобства разработки

---

## 📝 Рекомендации

### 1. Миграция с Legacy на RBAC
```sql
-- Обновить всех админов, у кого нет roleCode
UPDATE "Admin"
SET "roleCode" = CAST("role" AS TEXT)
WHERE "roleCode" IS NULL;

-- Сделать roleCode обязательным
ALTER TABLE "Admin" ALTER COLUMN "roleCode" SET NOT NULL;
```

### 2. Обновить middleware
```typescript
// Вместо:
requireAdminRole('SUPER_ADMIN')

// Использовать:
requirePermission('orders', 'delete')
```

### 3. Создать стандартные роли
```typescript
const STANDARD_ROLES = {
  SUPER_ADMIN: {
    name: 'Super Administrator',
    permissions: ['*:*'], // All permissions
  },
  ADMIN: {
    name: 'Administrator',
    permissions: [
      'orders:*',
      'kyc:read',
      'users:read',
      // ...
    ],
  },
  // ...
};
```

---

## ✅ Выводы

### Что работает хорошо:
- ✅ Database schema продуман и гибкий
- ✅ PermissionService полнофункциональный
- ✅ API endpoints для ролей реализованы
- ✅ RBAC архитектура правильная

### Что нужно доработать:
- ❌ Change Admin Role endpoint + UI
- ❌ Permission middleware
- ❌ Roles & Permissions UI
- ❌ Seeding стандартных ролей
- ❌ Миграция с legacy на RBAC

### Оценка готовности:
- **Backend (API):** 86% ✅
- **Services:** 33% ⚠️
- **UI:** 0% ❌
- **Database:** 50% ⚠️

**Общая готовность: ~42%** ⚠️

---

**Следующий шаг:** Реализовать Change Admin Role (API + UI + MFA + Audit)

