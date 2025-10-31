# 🔐 Идентификация и доступ - Детальный план реализации (P0)

## 📋 Оглавление
1. [Анализ текущей системы](#анализ-текущей-системы)
2. [Архитектура решения](#архитектура-решения)
3. [План миграции](#план-миграции)
4. [Этапы реализации](#этапы-реализации)
5. [Технические детали](#технические-детали)

---

## 🔍 Анализ текущей системы

### Текущее состояние:

**БД (Prisma Schema):**
```prisma
enum Role {
  CLIENT
  ADMIN
}

model User {
  id        String  @id @default(cuid())
  email     String  @unique
  password  String  // Hashed with bcrypt
  role      Role    @default(CLIENT)
  // ... остальные поля
}

model TwoFactorAuth {
  totpEnabled Boolean @default(false)
  totpSecret  String? // Encrypted TOTP secret
  passkeysEnabled Boolean @default(false)  // ✅ Уже есть!
  passkeys    Json?   // Array of passkeys
}

model SessionRevocation {
  // ✅ Управление сессиями уже реализовано
}

model AdminSettings {
  sessionTimeout Int @default(30) // ✅ Уже есть timeout
}
```

**Аутентификация:**
- ✅ NextAuth v5 (Credentials provider)
- ✅ TOTP 2FA для клиентов
- ✅ Backup codes
- ✅ Session revocation
- ❌ Нет разделения CLIENT/ADMIN таблиц
- ❌ Нет SSO для админов
- ❌ Нет WebAuthn/Passkeys
- ❌ Нет Step-up MFA
- ❌ Нет Idle timeout и Max session duration

**Авторизация:**
- ✅ API keys с permissions
- ✅ Role checks (requireRole)
- ✅ Resource ownership checks
- ❌ Нет детальных ролей (только CLIENT/ADMIN)
- ❌ Нет таблицы roles_permissions

---

## 🏗️ Архитектура решения

### 1. Разделение User/Admin таблиц

**Проблема:** Текущая таблица `User` смешивает клиентов и администраторов.

**Решение:**
```prisma
// Клиенты - остаются в User
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt
  isActive  Boolean  @default(true)
  lastLogin DateTime?
  
  // Auth
  twoFactorAuth TwoFactorAuth? // TOTP only
  
  // Relations
  profile      Profile?
  kycSession   KycSession?
  orders       Order[]
  // ... остальные
  
  @@index([email])
}

// Администраторы - новая таблица
model Admin {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String?  // Optional (if using SSO only)
  firstName String
  lastName  String
  role      AdminRole // SUPER_ADMIN, ADMIN, COMPLIANCE, etc.
  
  // Status
  isActive   Boolean  @default(true)
  isSuspended Boolean  @default(false)
  suspendedUntil DateTime?
  lastLogin  DateTime?
  
  // Auth methods
  authMethod AuthMethod @default(PASSWORD) // PASSWORD, SSO, PASSKEY
  ssoProvider String?  // google-workspace, microsoft, okta
  ssoSubject  String?  // SSO subject ID
  
  // Security
  twoFactorAuth  AdminTwoFactorAuth? // TOTP + WebAuthn
  sessions       AdminSession[]
  auditLogs      AuditLog[]
  
  // Settings
  settings   AdminSettings?
  
  // Metadata
  createdAt  DateTime @default(now())
  createdBy  String?  // Admin ID who created
  updatedAt  DateTime @updatedAt
  
  @@index([email])
  @@index([role])
  @@index([isActive])
  @@unique([ssoProvider, ssoSubject]) // Prevent SSO duplicates
}

enum AdminRole {
  SUPER_ADMIN         // Полный доступ: управление tenant'ами, ролями, лимитами, интеграциями, API-ключи, утверждение выплат
  ADMIN               // Управление клиентами и заказами в рамках своего tenant'а, без доступа к глобальным настройкам
  COMPLIANCE          // KYC/KYB данные, approve/reject/resubmit, AML кейсы, STR/SAR, обновление AML политик
  TREASURY_APPROVER   // Проверка и подписание выплат (4-eyes principle), без доступа к KYC
  FINANCE             // Банковские реквизиты, бухгалтерия, без доступа к KYC
  SUPPORT             // Только чтение + простые действия (обновить контакт, отменить черновой заказ)
  READ_ONLY           // Только просмотр, без права изменять (для аудита/аудиторов)
  CLIENT              // Конечный пользователь (остается в User таблице, не в Admin)
}

enum AuthMethod {
  PASSWORD   // Email + Password
  SSO        // OIDC/SAML SSO
  PASSKEY    // WebAuthn only
  HYBRID     // SSO + Passkey
}
```

### 2. Система ролей и прав

```prisma
// Роли с детальными правами
model Role {
  code        String   @id @unique // super_admin, admin, compliance, etc.
  name        String   // Super Administrator, Compliance Officer
  description String?  @db.Text
  isSystem    Boolean  @default(false) // Системная роль (нельзя удалить)
  isActive    Boolean  @default(true)
  priority    Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  permissions RolePermission[]
  admins      Admin[] // Admins with this role
  
  @@index([isActive])
}

// Права (permissions)
model Permission {
  code        String   @id @unique // orders:read, orders:update, kyc:approve
  name        String   // Read Orders, Update Orders, Approve KYC
  resource    String   // orders, kyc, users, settings
  action      String   // read, create, update, delete, approve
  description String?  @db.Text
  category    String   // orders, kyc, finance, system
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  // Relations
  roles RolePermission[]
  
  @@unique([resource, action])
  @@index([resource])
  @@index([category])
}

// Many-to-Many: Role <-> Permission
model RolePermission {
  id           String   @id @default(cuid())
  roleCode     String
  permissionCode String
  createdAt    DateTime @default(now())
  
  role       Role       @relation(fields: [roleCode], references: [code], onDelete: Cascade)
  permission Permission @relation(fields: [permissionCode], references: [code], onDelete: Cascade)
  
  @@unique([roleCode, permissionCode])
  @@index([roleCode])
  @@index([permissionCode])
}
```

**Стандартные права:**
```typescript
// orders (заказы)
orders:read          // Просмотр заказов
orders:create        // Создание заказов (для ADMIN)
orders:update        // Обновление заказов
orders:cancel        // Отмена черновых заказов (SUPPORT может)
orders:delete        // Удаление заказов (только SUPER_ADMIN)
orders:process       // Обработка заказов (отправка крипты)
orders:approve       // Утверждение заказов

// kyc (верификация)
kyc:read             // Просмотр KYC данных
kyc:approve          // Утверждение KYC (COMPLIANCE)
kyc:reject           // Отклонение KYC (COMPLIANCE)
kyc:resubmit         // Запрос на повторную подачу (COMPLIANCE)
kyc:delete           // Удаление KYC данных (только SUPER_ADMIN)
kyc:export           // Экспорт KYC данных для проверок

// kyb (верификация бизнеса)
kyb:read             // Просмотр KYB данных
kyb:approve          // Утверждение KYB (COMPLIANCE)
kyb:reject           // Отклонение KYB (COMPLIANCE)
kyb:resubmit         // Запрос на повторную подачу

// aml (противодействие отмыванию)
aml:read             // Просмотр AML кейсов
aml:create_case      // Создание AML кейса (COMPLIANCE)
aml:update_case      // Обновление статуса кейса
aml:submit_str       // Отправка STR/SAR (COMPLIANCE)
aml:update_policy    // Обновление AML политик (COMPLIANCE + SUPER_ADMIN)
aml:screening        // Запуск screening проверок

// finance (финансы)
finance:read         // Просмотр финансовых данных
finance:process      // Обработка выплат (создание)
finance:approve      // Утверждение выплат - 4-eyes (TREASURY_APPROVER)
finance:reconcile    // Сверка платежей (FINANCE)
finance:bank_accounts // Управление банковскими реквизитами (FINANCE)
finance:reports      // Финансовые отчеты

// payouts (выплаты)
payouts:read         // Просмотр выплат
payouts:create       // Создание выплаты
payouts:approve      // Утверждение выплаты (TREASURY_APPROVER, требует step-up MFA)
payouts:reject       // Отклонение выплаты
payouts:execute      // Выполнение утвержденной выплаты

// users (пользователи)
users:read           // Просмотр пользователей
users:create         // Создание пользователей
users:update         // Обновление пользователей
users:update_contact // Обновление контактов (SUPPORT может)
users:suspend        // Приостановка пользователя
users:delete         // Удаление пользователей (только SUPER_ADMIN)
users:impersonate    // Вход от имени (только SUPER_ADMIN)

// admins (администраторы)
admins:read          // Просмотр админов
admins:create        // Создание админов
admins:update        // Обновление админов
admins:change_role   // Изменение роли (только SUPER_ADMIN, требует step-up MFA)
admins:suspend       // Приостановка админа
admins:delete        // Удаление админов (только SUPER_ADMIN)
admins:revoke_session // Отзыв сессий других админов

// tenants (мультитенантность)
tenants:read         // Просмотр tenant'ов (только SUPER_ADMIN)
tenants:create       // Создание tenant'а (только SUPER_ADMIN)
tenants:update       // Обновление tenant'а (только SUPER_ADMIN)
tenants:delete       // Удаление tenant'а (только SUPER_ADMIN)
tenants:manage_limits // Управление лимитами tenant'а (только SUPER_ADMIN)

// settings (настройки)
settings:read        // Просмотр настроек
settings:update      // Изменение настроек своего tenant'а
settings:system      // Системные настройки (только SUPER_ADMIN)
settings:integrations // Настройка интеграций (SUPER_ADMIN)
settings:limits      // Изменение лимитов (SUPER_ADMIN, требует step-up MFA)

// api_keys (API ключи)
api_keys:read        // Просмотр API ключей
api_keys:create      // Создание API ключей (требует step-up MFA)
api_keys:revoke      // Отзыв API ключей (требует step-up MFA)
api_keys:delete      // Удаление API ключей (только SUPER_ADMIN)

// audit (аудит)
audit:read           // Просмотр аудит логов
audit:export         // Экспорт аудит логов (CSV/JSON)
audit:delete         // Удаление старых логов (только SUPER_ADMIN, с ограничениями)

// integrations (интеграции)
integrations:read    // Просмотр статуса интеграций
integrations:update  // Обновление настроек интеграций (SUPER_ADMIN)
integrations:test    // Тестирование интеграций

// reports (отчеты)
reports:read         // Просмотр отчетов
reports:generate     // Генерация отчетов
reports:export       // Экспорт отчетов
reports:schedule     // Настройка расписания отчетов
```

**Матрица ролей:**
```
| Permission                | SUPER | ADMIN | COMPLIANCE | TREASURY | FINANCE | SUPPORT | READ_ONLY |
|---------------------------|-------|-------|------------|----------|---------|---------|-----------|
| orders:read               |   ✓   |   ✓   |     ✓      |    ✓     |    ✓    |    ✓    |     ✓     |
| orders:create             |   ✓   |   ✓   |     ✗      |    ✗     |    ✗    |    ✗    |     ✗     |
| orders:process            |   ✓   |   ✓   |     ✗      |    ✗     |    ✗    |    ✗    |     ✗     |
| orders:cancel             |   ✓   |   ✓   |     ✗      |    ✗     |    ✗    |    ✓    |     ✗     |
| kyc:read                  |   ✓   |   ✓   |     ✓      |    ✗     |    ✗    |    ✓    |     ✓     |
| kyc:approve               |   ✓   |   ✗   |     ✓      |    ✗     |    ✗    |    ✗    |     ✗     |
| kyc:reject                |   ✓   |   ✗   |     ✓      |    ✗     |    ✗    |    ✗    |     ✗     |
| aml:create_case           |   ✓   |   ✗   |     ✓      |    ✗     |    ✗    |    ✗    |     ✗     |
| aml:submit_str            |   ✓   |   ✗   |     ✓      |    ✗     |    ✗    |    ✗    |     ✗     |
| aml:update_policy         |   ✓   |   ✗   |     ✓      |    ✗     |    ✗    |    ✗    |     ✗     |
| payouts:approve (MFA!)    |   ✓   |   ✗   |     ✗      |    ✓     |    ✗    |    ✗    |     ✗     |
| finance:bank_accounts     |   ✓   |   ✗   |     ✗      |    ✗     |    ✓    |    ✗    |     ✗     |
| finance:reconcile         |   ✓   |   ✗   |     ✗      |    ✗     |    ✓    |    ✗    |     ✗     |
| users:update_contact      |   ✓   |   ✓   |     ✗      |    ✗     |    ✗    |    ✓    |     ✗     |
| users:impersonate         |   ✓   |   ✗   |     ✗      |    ✗     |    ✗    |    ✗    |     ✗     |
| tenants:create            |   ✓   |   ✗   |     ✗      |    ✗     |    ✗    |    ✗    |     ✗     |
| settings:system           |   ✓   |   ✗   |     ✗      |    ✗     |    ✗    |    ✗    |     ✗     |
| settings:limits (MFA!)    |   ✓   |   ✗   |     ✗      |    ✗     |    ✗    |    ✗    |     ✗     |
| api_keys:create (MFA!)    |   ✓   |   ✓   |     ✗      |    ✗     |    ✗    |    ✗    |     ✗     |
| api_keys:revoke (MFA!)    |   ✓   |   ✓   |     ✗      |    ✗     |    ✗    |    ✗    |     ✗     |
| admins:create             |   ✓   |   ✓   |     ✗      |    ✗     |    ✗    |    ✗    |     ✗     |
| admins:change_role (MFA!) |   ✓   |   ✗   |     ✗      |    ✗     |    ✗    |    ✗    |     ✗     |
| audit:export              |   ✓   |   ✓   |     ✓      |    ✗     |    ✗    |    ✗    |     ✓     |

Примечание: (MFA!) = требует Step-up MFA для выполнения
```

**Принцип 4-eyes (двойной контроль):**
```
Критические операции требуют участия 2 разных администраторов:

1. Выплаты криптовалюты:
   - ADMIN создает PayOut → status: PENDING_APPROVAL
   - TREASURY_APPROVER утверждает (с step-up MFA) → status: APPROVED
   - Система выполняет выплату → status: PROCESSING → COMPLETED

2. Изменение глобальных лимитов:
   - SUPER_ADMIN предлагает изменение → status: PENDING_REVIEW
   - Другой SUPER_ADMIN утверждает (с step-up MFA) → применяется

3. Отзыв/создание API ключей с высокими привилегиями:
   - SUPER_ADMIN создает ключ → step-up MFA required
   - Логируется в audit log с обоснованием
```

### 3. Passkeys (WebAuthn) + SSO для админов

**Основной метод: Passkeys (WebAuthn)**

Passkey — это FIDO-учетная запись на основе публичных ключей:
- **Passwordless** аутентификация (без паролей)
- **Phishing-resistant** (невозможно украсть, т.к. ключ не передается)
- **Биометрия** или PIN для подтверждения
- **Соответствие PSD2/SCA** и AML требованиям
- **Удобство**: Touch ID, Face ID, Windows Hello, YubiKey

**Регистрация Passkey при создании админа:**
```typescript
// При создании нового Admin через админку
1. SUPER_ADMIN создает Admin аккаунт → email отправляется новому админу
2. Новый админ переходит по ссылке активации
3. Система предлагает зарегистрировать Passkey:
   - "Настройте безопасный вход с помощью Touch ID / Face ID"
   - Если устройство поддерживает → регистрация passkey
   - Если нет → fallback на TOTP
4. После регистрации passkey → админ может войти без пароля
```

**Break-glass пользователь:**
```typescript
// Резервный доступ для экстренных случаев
model BreakGlassUser {
  id           String   @id @default(cuid())
  username     String   @unique // "emergency-access"
  passwordHash String   // Длинный пароль (32+ символов)
  totpSecret   String   @db.Text // Encrypted TOTP
  
  // Restrictions
  isActive     Boolean  @default(false) // Активируется только в экстренных случаях
  lastUsed     DateTime?
  usageCount   Int      @default(0)
  
  // Доступ хранится в физическом сейфе
  accessInstructions String @db.Text
  
  // Auto-disable после использования
  autoDisableAfter Int @default(24) // Hours
  
  createdAt DateTime @default(now())
}

// Использование:
// 1. SUPER_ADMIN активирует break-glass аккаунт
// 2. Получает пароль из сейфа
// 3. Входит с TOTP
// 4. Система логирует CRITICAL audit event
// 5. Аккаунт автоматически деактивируется через 24 часа
// 6. Все действия под break-glass требуют обоснования
```

### 3. SSO + Passkeys для админов

```prisma
// WebAuthn Credentials (Passkeys)
model WebAuthnCredential {
  id            String   @id @default(cuid())
  adminId       String
  
  // WebAuthn fields
  credentialId  String   @unique // Base64 credential ID
  publicKey     String   @db.Text // Base64 public key
  counter       Int      @default(0) // Signature counter
  
  // Device info
  deviceName    String?  // "MacBook Pro Touch ID"
  deviceType    String?  // "platform" or "cross-platform"
  transports    String[] // ["internal", "usb", "nfc", "ble"]
  
  // Attestation
  aaguid        String?  // Authenticator GUID
  attestation   String?  // Attestation format
  
  // Status
  isActive      Boolean  @default(true)
  lastUsed      DateTime?
  
  // Metadata
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  admin Admin @relation(fields: [adminId], references: [id], onDelete: Cascade)
  
  @@index([adminId])
  @@index([credentialId])
}

// SSO Sessions
model SsoSession {
  id            String   @id @default(cuid())
  adminId       String
  provider      String   // google-workspace, microsoft, okta
  ssoSubject    String   // SSO subject ID
  accessToken   String?  @db.Text // Encrypted
  refreshToken  String?  @db.Text // Encrypted
  expiresAt     DateTime
  createdAt     DateTime @default(now())
  
  admin Admin @relation(fields: [adminId], references: [id], onDelete: Cascade)
  
  @@index([adminId])
}

// Admin 2FA (TOTP + WebAuthn)
model AdminTwoFactorAuth {
  id             String   @id @default(cuid())
  adminId        String   @unique
  
  // TOTP
  totpEnabled    Boolean  @default(false)
  totpSecret     String?  @db.Text // Encrypted
  totpVerifiedAt DateTime?
  
  // WebAuthn (primary)
  webAuthnEnabled Boolean @default(false)
  webAuthnRequired Boolean @default(false) // Force WebAuthn
  
  // Backup codes
  backupCodes    Json?    // Encrypted array
  
  // Settings
  preferredMethod String @default("TOTP") // TOTP, WEBAUTHN
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  admin          Admin              @relation(fields: [adminId], references: [id], onDelete: Cascade)
  credentials    WebAuthnCredential[]
  
  @@index([adminId])
}
```

### 4. Step-up MFA (повышенная аутентификация)

**Что такое Step-up MFA:**
Step-up MFA — это дополнительное подтверждение личности при выполнении критических действий, даже если пользователь уже авторизован.

**Когда требуется Step-up MFA:**
```typescript
const STEP_UP_REQUIRED_ACTIONS = [
  // Финансовые операции
  'APPROVE_PAYOUT',           // Утверждение выплаты
  'CREATE_LARGE_PAYOUT',      // Создание выплаты > 10,000 EUR
  'MODIFY_BANK_ACCOUNT',      // Изменение банковских реквизитов
  
  // Управление доступом
  'CHANGE_ADMIN_ROLE',        // Изменение роли администратора
  'CREATE_SUPER_ADMIN',       // Создание SUPER_ADMIN
  'SUSPEND_ADMIN',            // Приостановка админа
  'REVOKE_SESSION',           // Отзыв чужой сессии
  
  // API и интеграции
  'GENERATE_API_KEY',         // Генерация API ключа
  'REVOKE_API_KEY',           // Отзыв API ключа
  'UPDATE_INTEGRATION_KEYS',  // Обновление ключей интеграций
  
  // Настройки системы
  'CHANGE_LIMITS',            // Изменение лимитов
  'UPDATE_AML_POLICY',        // Обновление AML политик
  'DISABLE_MFA_REQUIREMENT',  // Отключение требования MFA
  
  // Данные пользователей
  'DELETE_USER',              // Удаление пользователя
  'EXPORT_PII',               // Экспорт персональных данных
  'IMPERSONATE_USER',         // Вход от имени пользователя
];
```

**Compliance requirements:**
- **PSD2/SCA**: Strong Customer Authentication для платежных операций
- **AML**: Дополнительная проверка для финансовых действий
- **SOC 2**: Контроль доступа к чувствительным данным
- **GDPR**: Защита персональных данных

### 4. Step-up MFA (PSD2/SCA compliant)

```prisma
// Step-up MFA challenges
model MfaChallenge {
  id           String   @id @default(cuid())
  adminId      String
  action       String   // APPROVE_PAYOUT, CHANGE_ROLE, GENERATE_API_KEY
  resourceType String?  // PayOut, Admin, ApiKey
  resourceId   String?  // Resource ID
  
  // Challenge details
  challengeType String  // WEBAUTHN, TOTP
  challenge     String  @db.Text // WebAuthn challenge or TOTP code
  
  // Status
  status        String   @default("PENDING") // PENDING, VERIFIED, EXPIRED, FAILED
  attempts      Int      @default(0)
  maxAttempts   Int      @default(3)
  
  // Verification
  verifiedAt    DateTime?
  verifiedWith  String?  // credentialId or "totp"
  
  // Expiration
  expiresAt     DateTime // 5 минут
  createdAt     DateTime @default(now())
  
  admin Admin @relation(fields: [adminId], references: [id], onDelete: Cascade)
  
  @@index([adminId, status])
  @@index([expiresAt])
}
```

### 5. Расширенное управление сессиями

**Требования к сессиям:**

1. **Idle Timeout (таймаут бездействия)**
   - **Админы**: 15 минут по умолчанию (настраиваемо: 5/15/30/60 мин)
   - **Клиенты**: 30 минут
   - После истечения → принудительный logout
   - Предупреждение за 2 минуты до истечения

2. **Max Session Duration (максимальная длительность)**
   - **Админы**: 8 часов (настраиваемо: 4/8/12 часов)
   - **Клиенты**: 24 часа
   - После истечения → принудительный logout + требование повторной аутентификации

3. **Session Manager (менеджер сессий)**
   - Просмотр всех активных сессий администратора
   - Информация: IP, устройство, браузер, время входа, последняя активность
   - Возможность завершить любую сессию (включая текущую)
   - Пометка "Текущая сессия"
   - Кнопка "Завершить все другие сессии"

**Хранение сессий в БД:**

```prisma
// Admin Sessions (детальное управление)
model AdminSession {
  id             String   @id @default(cuid())
  adminId        String
  
  // Session identification (согласно требованиям)
  sessionId      String   @unique // session_id
  sessionToken   String   @unique // JWT token ID (для NextAuth)
  sessionKey     String   // IP-device-browser (for revocation)
  
  // Device info (согласно требованиям: ip, ua)
  ipAddress      String   // ip
  deviceType     String?  // desktop, mobile, tablet
  browser        String?
  browserVersion String?
  os             String?
  osVersion      String?
  userAgent      String   @db.Text // ua (full user agent)
  
  // Location (optional)
  country        String?
  city           String?
  
  // MFA info (согласно требованиям: mfa_method)
  mfaMethod      String?  // TOTP, WEBAUTHN, PASSKEY, SSO
  mfaVerifiedAt  DateTime? // Когда был пройден MFA
  
  // Status
  isActive       Boolean  @default(true)
  
  // Timeouts (согласно требованиям: created_at, last_active_at, expiry_at)
  createdAt      DateTime @default(now()) // created_at (время входа)
  lastActivity   DateTime @default(now()) // last_active_at (для idle timeout)
  expiresAt      DateTime // expiry_at (max session duration)
  
  // Settings (overrides)
  idleTimeout    Int?     // Minutes (default: 15 для админов)
  maxDuration    Int?     // Hours (default: 8 для админов)
  
  // Termination
  terminatedAt   DateTime?
  terminatedBy   String?  // Admin ID who terminated
  terminationReason String? // Manual, Idle, MaxDuration, Revoked
  
  updatedAt      DateTime @updatedAt
  
  admin Admin @relation(fields: [adminId], references: [id], onDelete: Cascade)
  
  @@index([adminId, isActive])
  @@index([sessionId])
  @@index([sessionToken])
  @@index([sessionKey])
  @@index([lastActivity])
  @@index([expiresAt])
  @@index([ipAddress])
}

// Session Activity Log (детальное логирование активности)
model SessionActivity {
  id            String   @id @default(cuid())
  sessionId     String   // Link to AdminSession
  action        String   // PAGE_VIEW, API_CALL, ACTION_PERFORMED
  path          String   // URL path
  method        String?  // HTTP method
  statusCode    Int?
  responseTime  Int?     // milliseconds
  metadata      Json?
  createdAt     DateTime @default(now())
  
  @@index([sessionId, createdAt])
  @@index([createdAt])
}

// Admin Settings (расширенные)
model AdminSettings {
  id                String  @id @default(cuid())
  adminId           String  @unique
  
  // Session Management
  idleTimeout       Int     @default(15) // Minutes (5, 15, 30, 60, 120)
  maxSessionDuration Int    @default(8) // Hours (4, 8, 12, 24)
  rememberDevice    Boolean @default(false) // Remember trusted devices
  
  // MFA Settings
  requireMfaAlways  Boolean @default(false) // MFA on every login
  requireStepUpFor  String[] @default([]) // Actions requiring step-up MFA
  
  // Security
  allowedIPs        String[] @default([]) // IP whitelist (empty = all)
  blockUnknownDevices Boolean @default(false)
  
  // Notifications
  loginNotifications  Boolean @default(true)
  activityDigest      Boolean @default(false)
  securityAlerts      Boolean @default(true)
  
  // Audit
  logAllActions     Boolean @default(true)
  retainLogsFor     Int     @default(90) // Days
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  admin Admin @relation(fields: [adminId], references: [id], onDelete: Cascade)
  
  @@index([adminId])
}
```

---

## 🚀 План миграции

### Этап 1: Подготовка (1-2 дня)

**Задачи:**
1. ✅ Бэкап базы данных
2. ✅ Создать ветку `feat/identity-access-p0`
3. ✅ Установить необходимые пакеги:
   ```bash
   # WebAuthn (Passkeys)
   npm install @simplewebauthn/server @simplewebauthn/browser
   
   # SSO (OIDC/SAML)
   npm install next-auth@beta @auth/core
   npm install passport-saml passport-openidconnect
   
   # Encryption для secrets
   npm install @aws-sdk/client-secrets-manager  # если AWS
   # или
   npm install @google-cloud/secret-manager     # если GCP
   # или использовать pgcrypto в PostgreSQL
   
   # User Agent parsing
   npm install ua-parser-js
   
   # Hashing для audit log integrity
   npm install crypto-js
   ```

4. ✅ Настроить переменные окружения:
   ```bash
   # .env.local
   
   # WebAuthn
   RP_ID=apricode.io  # Relying Party ID (ваш домен)
   RP_NAME="Apricode Exchange"
   ORIGIN=https://apricode.io
   
   # SSO Providers
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   GOOGLE_WORKSPACE_DOMAIN=apricode.io  # Restrict to domain
   
   AZURE_CLIENT_ID=
   AZURE_CLIENT_SECRET=
   AZURE_TENANT_ID=
   
   # Secrets encryption
   SECRETS_ENCRYPTION_KEY=  # AES-256 key (генерировать через crypto)
   
   # Session settings
   ADMIN_IDLE_TIMEOUT=15      # минуты
   ADMIN_MAX_SESSION=8        # часы
   CLIENT_IDLE_TIMEOUT=30
   CLIENT_MAX_SESSION=24
   
   # Audit log
   AUDIT_LOG_RETENTION_YEARS=5
   AUDIT_LOG_EXPORT_BUCKET=  # S3 bucket для экспорта
   
   # Break-glass
   BREAK_GLASS_ENABLED=false  # Активировать только в экстренных случаях
   ```

### Этап 2: Миграция базы данных (2-3 дня)

**2.1. Создать новые таблицы**
```bash
# Миграция 1: Создать Admin, Role, Permission
prisma migrate dev --name create_admin_and_roles

# Миграция 2: Создать WebAuthn, SsoSession
prisma migrate dev --name create_webauthn_and_sso

# Миграция 3: Создать AdminSession, MfaChallenge
prisma migrate dev --name create_admin_sessions
```

**2.2. Мигрировать существующих админов**
```typescript
// scripts/migrate-admins.ts
import { prisma } from '@/lib/prisma';

async function migrateAdmins() {
  // Получить всех ADMIN пользователей
  const adminUsers = await prisma.user.findMany({
    where: { role: 'ADMIN' }
  });
  
  for (const user of adminUsers) {
    // Создать Admin запись
    await prisma.admin.create({
      data: {
        id: user.id, // Сохранить ID для обратной совместимости
        email: user.email,
        password: user.password,
        firstName: user.profile?.firstName || 'Admin',
        lastName: user.profile?.lastName || 'User',
        role: 'ADMIN', // По умолчанию ADMIN
        authMethod: 'PASSWORD',
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        
        // Мигрировать 2FA
        twoFactorAuth: user.twoFactorAuth ? {
          create: {
            totpEnabled: user.twoFactorAuth.totpEnabled,
            totpSecret: user.twoFactorAuth.totpSecret,
            backupCodes: user.twoFactorAuth.backupCodes,
          }
        } : undefined,
        
        // Мигрировать настройки
        settings: user.adminSettings ? {
          create: {
            idleTimeout: 15,
            maxSessionDuration: 8,
            loginNotifications: true,
            // ... остальные настройки
          }
        } : undefined
      }
    });
    
    console.log(`✅ Migrated admin: ${user.email}`);
  }
  
  console.log(`✅ Migrated ${adminUsers.length} admins`);
}

migrateAdmins();
```

### Этап 3: Реализация аутентификации (3-5 дней)

**3.1. Dual Auth Provider (NextAuth + Passport)**
```typescript
// src/lib/auth/admin-auth.ts

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GoogleWorkspace from 'next-auth/providers/google';
import AzureAD from 'next-auth/providers/azure-ad';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyWebAuthnAssertion } from '@simplewebauthn/server';

export const adminAuth = NextAuth({
  providers: [
    // 1. Credentials (Email/Password + TOTP)
    Credentials({
      id: 'admin-credentials',
      name: 'Admin Credentials',
      async authorize(credentials) {
        // ... bcrypt + TOTP verification
      }
    }),
    
    // 2. Google Workspace SSO
    GoogleWorkspace({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          hd: "apricode.io" // Restrict to domain
        }
      },
      async profile(profile) {
        // Find or create Admin
        let admin = await prisma.admin.findUnique({
          where: {
            ssoProvider_ssoSubject: {
              ssoProvider: 'google-workspace',
              ssoSubject: profile.sub
            }
          }
        });
        
        if (!admin) {
          // Auto-provision admin (if email allowed)
          admin = await prisma.admin.create({
            data: {
              email: profile.email,
              firstName: profile.given_name,
              lastName: profile.family_name,
              authMethod: 'SSO',
              ssoProvider: 'google-workspace',
              ssoSubject: profile.sub,
              role: 'SUPPORT', // Default role for SSO
            }
          });
        }
        
        return {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          authMethod: 'SSO'
        };
      }
    }),
    
    // 3. Azure AD SSO (Microsoft 365)
    AzureAD({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      tenantId: process.env.AZURE_TENANT_ID!,
      // ... similar to Google
    })
  ],
  
  callbacks: {
    async signIn({ user, account }) {
      // Check if admin is active
      const admin = await prisma.admin.findUnique({
        where: { id: user.id },
        select: { isActive: true, isSuspended: true }
      });
      
      if (!admin?.isActive || admin.isSuspended) {
        return false;
      }
      
      // Update lastLogin
      await prisma.admin.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });
      
      return true;
    },
    
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.authMethod = user.authMethod;
      }
      
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.authMethod = token.authMethod as string;
      }
      
      // Check idle timeout & max duration
      await checkSessionValidity(session.user.id);
      
      return session;
    }
  },
  
  pages: {
    signIn: '/admin/login',
    error: '/admin/login'
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours max
    updateAge: 15 * 60, // Update every 15 minutes
  }
});
```

**3.2. WebAuthn Implementation**
```typescript
// src/lib/auth/webauthn.ts

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';

export async function registerWebAuthn(adminId: string, deviceName: string) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { email: true }
  });
  
  const options = await generateRegistrationOptions({
    rpName: 'Apricode Exchange',
    rpID: process.env.RP_ID!, // apricode.io
    userID: adminId,
    userName: admin!.email,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Touch ID, Windows Hello
      requireResidentKey: false,
      userVerification: 'required'
    }
  });
  
  // Save challenge to DB
  await prisma.mfaChallenge.create({
    data: {
      adminId,
      action: 'REGISTER_WEBAUTHN',
      challengeType: 'WEBAUTHN',
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    }
  });
  
  return options;
}

export async function verifyWebAuthn(adminId: string, response: any) {
  const challenge = await prisma.mfaChallenge.findFirst({
    where: {
      adminId,
      action: 'REGISTER_WEBAUTHN',
      status: 'PENDING',
      expiresAt: { gt: new Date() }
    }
  });
  
  if (!challenge) {
    throw new Error('Challenge expired or not found');
  }
  
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: process.env.ORIGIN!,
    expectedRPID: process.env.RP_ID!
  });
  
  if (verification.verified) {
    // Save credential
    await prisma.webAuthnCredential.create({
      data: {
        adminId,
        credentialId: verification.registrationInfo!.credentialID,
        publicKey: verification.registrationInfo!.credentialPublicKey,
        counter: verification.registrationInfo!.counter,
        deviceName,
        aaguid: verification.registrationInfo!.aaguid,
        isActive: true
      }
    });
    
    // Mark challenge as verified
    await prisma.mfaChallenge.update({
      where: { id: challenge.id },
      data: { status: 'VERIFIED', verifiedAt: new Date() }
    });
  }
  
  return verification.verified;
}
```

### Этап 4: Система прав (3-4 дня)

**4.1. Permission Service**
```typescript
// src/lib/services/permission.service.ts

export class PermissionService {
  /**
   * Check if admin has permission
   */
  async hasPermission(
    adminId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        role: true,
        isActive: true,
        isSuspended: true
      }
    });
    
    if (!admin?.isActive || admin.isSuspended) {
      return false;
    }
    
    // Check role permissions
    const permission = await prisma.rolePermission.findFirst({
      where: {
        roleCode: admin.role,
        permission: {
          resource,
          action
        }
      },
      include: {
        permission: true
      }
    });
    
    return !!permission;
  }
  
  /**
   * Get all permissions for admin
   */
  async getAdminPermissions(adminId: string): Promise<string[]> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });
    
    return admin?.role.permissions.map(rp => 
      `${rp.permission.resource}:${rp.permission.action}`
    ) || [];
  }
  
  /**
   * Require permission (throw if not allowed)
   */
  async requirePermission(
    adminId: string,
    resource: string,
    action: string
  ): Promise<void> {
    const allowed = await this.hasPermission(adminId, resource, action);
    
    if (!allowed) {
      throw new ForbiddenError(
        `Permission denied: ${resource}:${action}`
      );
    }
  }
}

export const permissionService = new PermissionService();
```

**4.2. Updated Auth Utils**
```typescript
// src/lib/auth-utils.ts

import { permissionService } from '@/lib/services/permission.service';

/**
 * Require specific permission
 */
export async function requirePermission(
  resource: string,
  action: string
) {
  const session = await auth();
  
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null
    };
  }
  
  // Check permission
  const allowed = await permissionService.hasPermission(
    session.user.id,
    resource,
    action
  );
  
  if (!allowed) {
    return {
      error: NextResponse.json(
        { 
          error: 'Forbidden', 
          message: `Permission denied: ${resource}:${action}` 
        },
        { status: 403 }
      ),
      session: null
    };
  }
  
  return { error: null, session };
}
```

### Этап 5: Step-up MFA (2-3 дня)

```typescript
// src/lib/services/step-up-mfa.service.ts

export class StepUpMfaService {
  /**
   * Request step-up MFA challenge
   */
  async requestChallenge(
    adminId: string,
    action: string,
    resourceType?: string,
    resourceId?: string
  ): Promise<{ challengeId: string; options: any }> {
    // Generate WebAuthn challenge
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        twoFactorAuth: {
          include: {
            credentials: {
              where: { isActive: true }
            }
          }
        }
      }
    });
    
    if (!admin) {
      throw new Error('Admin not found');
    }
    
    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: process.env.RP_ID!,
      allowCredentials: admin.twoFactorAuth?.credentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: cred.transports
      })) || []
    });
    
    // Save challenge
    const challenge = await prisma.mfaChallenge.create({
      data: {
        adminId,
        action,
        resourceType,
        resourceId,
        challengeType: 'WEBAUTHN',
        challenge: options.challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });
    
    return {
      challengeId: challenge.id,
      options
    };
  }
  
  /**
   * Verify step-up MFA
   */
  async verifyChallenge(
    challengeId: string,
    response: any
  ): Promise<boolean> {
    const challenge = await prisma.mfaChallenge.findUnique({
      where: { id: challengeId },
      include: {
        admin: {
          include: {
            twoFactorAuth: {
              include: {
                credentials: true
              }
            }
          }
        }
      }
    });
    
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    
    if (challenge.status !== 'PENDING') {
      throw new Error('Challenge already used');
    }
    
    if (challenge.expiresAt < new Date()) {
      throw new Error('Challenge expired');
    }
    
    // Find credential
    const credential = challenge.admin.twoFactorAuth?.credentials.find(
      c => c.credentialId === response.id
    );
    
    if (!credential) {
      throw new Error('Credential not found');
    }
    
    // Verify assertion
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: process.env.ORIGIN!,
      expectedRPID: process.env.RP_ID!,
      authenticator: {
        credentialID: credential.credentialId,
        credentialPublicKey: credential.publicKey,
        counter: credential.counter
      }
    });
    
    if (verification.verified) {
      // Update challenge
      await prisma.mfaChallenge.update({
        where: { id: challengeId },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedWith: credential.id
        }
      });
      
      // Update credential counter
      await prisma.webAuthnCredential.update({
        where: { id: credential.id },
        data: {
          counter: verification.authenticationInfo.newCounter,
          lastUsed: new Date()
        }
      });
      
      // Log to audit
      await prisma.auditLog.create({
        data: {
          userId: challenge.adminId,
          action: `STEP_UP_MFA_VERIFIED`,
          entity: challenge.resourceType || 'System',
          entityId: challenge.resourceId || challengeId,
          metadata: {
            action: challenge.action,
            credentialId: credential.id,
            deviceName: credential.deviceName
          }
        }
      });
      
      return true;
    }
    
    // Increment attempts
    await prisma.mfaChallenge.update({
      where: { id: challengeId },
      data: {
        attempts: { increment: 1 },
        status: challenge.attempts + 1 >= challenge.maxAttempts ? 'FAILED' : 'PENDING'
      }
    });
    
    return false;
  }
}

export const stepUpMfaService = new StepUpMfaService();
```

**Использование в API routes:**
```typescript
// src/app/api/admin/payouts/[id]/approve/route.ts

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Check auth
  const { error, session } = await requirePermission('finance', 'approve');
  if (error) return error;
  
  // 2. Request step-up MFA
  const body = await request.json();
  
  if (!body.mfaChallengeId) {
    // First call - request challenge
    const { challengeId, options } = await stepUpMfaService.requestChallenge(
      session!.user.id,
      'APPROVE_PAYOUT',
      'PayOut',
      params.id
    );
    
    return NextResponse.json({
      success: false,
      requiresMfa: true,
      challengeId,
      options
    });
  }
  
  // 3. Verify MFA
  const verified = await stepUpMfaService.verifyChallenge(
    body.mfaChallengeId,
    body.mfaResponse
  );
  
  if (!verified) {
    return NextResponse.json(
      { success: false, error: 'MFA verification failed' },
      { status: 403 }
    );
  }
  
  // 4. Proceed with approval
  await prisma.payOut.update({
    where: { id: params.id },
    data: {
      status: 'APPROVED',
      processedBy: session!.user.id,
      processedAt: new Date()
    }
  });
  
  return NextResponse.json({ success: true });
}
```

### Этап 6: Session Management (1-2 дня)

```typescript
// src/lib/services/admin-session.service.ts

export class AdminSessionService {
  /**
   * Create new session
   */
  async createSession(
    adminId: string,
    request: NextRequest
  ): Promise<AdminSession> {
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const device = parser.getDevice();
    const os = parser.getOS();
    
    // Get admin settings
    const settings = await prisma.adminSettings.findUnique({
      where: { adminId }
    });
    
    const idleTimeout = settings?.idleTimeout || 15;
    const maxDuration = settings?.maxSessionDuration || 8;
    
    const session = await prisma.adminSession.create({
      data: {
        adminId,
        sessionToken: generateSecureToken(),
        sessionKey: `${ipAddress}-${device.type || 'desktop'}-${browser.name}`,
        ipAddress,
        deviceType: device.type || 'desktop',
        browser: browser.name,
        browserVersion: browser.version,
        os: os.name,
        osVersion: os.version,
        userAgent,
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + maxDuration * 60 * 60 * 1000),
        idleTimeout,
        maxDuration
      }
    });
    
    return session;
  }
  
  /**
   * Check session validity (idle timeout + max duration)
   */
  async checkSessionValidity(sessionToken: string): Promise<boolean> {
    const session = await prisma.adminSession.findUnique({
      where: { sessionToken },
      select: {
        isActive: true,
        lastActivity: true,
        expiresAt: true,
        idleTimeout: true
      }
    });
    
    if (!session || !session.isActive) {
      return false;
    }
    
    const now = new Date();
    
    // Check max duration
    if (now > session.expiresAt) {
      await this.invalidateSession(sessionToken, 'MAX_DURATION_EXCEEDED');
      return false;
    }
    
    // Check idle timeout
    const idleMinutes = (now.getTime() - session.lastActivity.getTime()) / (60 * 1000);
    if (idleMinutes > session.idleTimeout!) {
      await this.invalidateSession(sessionToken, 'IDLE_TIMEOUT');
      return false;
    }
    
    // Update last activity
    await prisma.adminSession.update({
      where: { sessionToken },
      data: { lastActivity: now }
    });
    
    return true;
  }
  
  /**
   * Invalidate session
   */
  async invalidateSession(sessionToken: string, reason: string): Promise<void> {
    await prisma.adminSession.update({
      where: { sessionToken },
      data: { isActive: false }
    });
    
    // Log
    const session = await prisma.adminSession.findUnique({
      where: { sessionToken }
    });
    
    if (session) {
      await prisma.auditLog.create({
        data: {
          userId: session.adminId,
          action: 'SESSION_INVALIDATED',
          entity: 'AdminSession',
          entityId: session.id,
          metadata: { reason }
        }
      });
    }
  }
  
  /**
   * Revoke all sessions for admin
   */
  async revokeAllSessions(adminId: string, exceptToken?: string): Promise<number> {
    const result = await prisma.adminSession.updateMany({
      where: {
        adminId,
        isActive: true,
        ...(exceptToken ? { sessionToken: { not: exceptToken } } : {})
      },
      data: { isActive: false }
    });
    
    return result.count;
  }
}

export const adminSessionService = new AdminSessionService();
```

---

## 🔒 Журналирование и контроль

### Audit Log (неизменяемый журнал действий)

**Требования:**
- ✅ Запись **каждого** действия администратора
- ✅ **Неизменяемость**: записи нельзя редактировать/удалять
- ✅ Хранение **≥ 5 лет** (compliance требование)
- ✅ Полная информация: актор, роль, IP, UA, время, before/after

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  
  // Who (Актор)
  userId    String?  // Admin ID (null для системных событий)
  userEmail String?  // Email на момент действия (для истории)
  userRole  String?  // Роль на момент действия
  
  // What (Действие)
  action    String   // LOGIN, KYC_APPROVED, PAYOUT_APPROVED, ROLE_CHANGED
  entity    String   // User, Order, KycSession, PayOut, Admin
  entityId  String   // ID сущности
  
  // Changes (До/После)
  oldValue  Json?    // Старое значение
  newValue  Json?    // Новое значение
  changes   Json?    // Diff объект для детализации
  
  // Context (Контекст)
  metadata  Json?    // Дополнительная информация
  reason    String?  @db.Text // Обоснование (для критических действий)
  
  // When & Where (Где и когда)
  ipAddress String
  userAgent String   @db.Text
  country   String?
  city      String?
  
  // MFA verification (если требовалось)
  mfaRequired  Boolean @default(false)
  mfaMethod    String? // TOTP, WEBAUTHN
  mfaVerifiedAt DateTime?
  
  // Compliance
  severity     String  @default("INFO") // INFO, WARNING, CRITICAL
  isReviewable Boolean @default(false) // Требует review от compliance
  reviewedAt   DateTime?
  reviewedBy   String? // Compliance officer ID
  
  // Immutability (неизменяемость)
  createdAt DateTime @default(now())
  hash      String?  // SHA-256 hash записи для проверки целостности
  
  // Relations
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  @@index([userId])
  @@index([entity, entityId])
  @@index([action])
  @@index([createdAt])
  @@index([severity])
  @@index([isReviewable])
  @@index([userRole]) // Для фильтрации по ролям
}
```

**Критические события (CRITICAL severity):**
```typescript
const CRITICAL_ACTIONS = [
  'PAYOUT_APPROVED',           // Утверждение выплаты
  'ADMIN_ROLE_CHANGED',        // Изменение роли админа
  'SUPER_ADMIN_CREATED',       // Создание SUPER_ADMIN
  'API_KEY_CREATED',           // Создание API ключа
  'INTEGRATION_KEY_UPDATED',   // Обновление ключей интеграций
  'USER_IMPERSONATED',         // Вход от имени пользователя
  'AML_STR_SUBMITTED',         // Отправка STR/SAR
  'BREAK_GLASS_USED',          // Использование emergency аккаунта
  'MFA_DISABLED',              // Отключение MFA
  'LIMITS_CHANGED',            // Изменение лимитов
  'TENANT_DELETED',            // Удаление tenant'а
];
```

### System Log (системные события)

**Назначение:** Логирование технических событий, вебхуков, интеграций

```prisma
model SystemLog {
  id            String   @id @default(cuid())
  
  // Event type
  eventType     String   // WEBHOOK_RECEIVED, INTEGRATION_SYNC, API_ERROR, SLA_BREACH
  source        String   // KYCAID, RAPYD, TATUM, COINGECKO, SYSTEM
  
  // Details
  endpoint      String?  // URL endpoint
  method        String?  // HTTP method
  statusCode    Int?
  requestBody   Json?    // Sanitized (no secrets)
  responseBody  Json?    // Sanitized
  errorMessage  String?  @db.Text
  errorStack    String?  @db.Text
  
  // Performance
  responseTime  Int?     // milliseconds
  
  // Metadata
  metadata      Json?
  severity      String   @default("INFO") // INFO, WARNING, ERROR, CRITICAL
  
  // Timestamps
  createdAt     DateTime @default(now())
  
  @@index([eventType])
  @@index([source])
  @@index([severity])
  @@index([createdAt])
  @@index([statusCode])
}
```

### Export механизм

```typescript
// src/lib/services/audit-export.service.ts

export class AuditExportService {
  /**
   * Export audit logs по периоду
   */
  async exportLogs(
    startDate: Date,
    endDate: Date,
    format: 'CSV' | 'JSON',
    filters?: {
      userId?: string;
      action?: string;
      entity?: string;
      severity?: string;
    }
  ): Promise<Blob> {
    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        ...filters
      },
      orderBy: { createdAt: 'asc' }
    });
    
    if (format === 'CSV') {
      return this.generateCSV(logs);
    } else {
      return this.generateJSON(logs);
    }
  }
  
  /**
   * Scheduled export для compliance (ежемесячно)
   */
  async scheduleMonthlyExport(adminId: string): Promise<void> {
    // Создать задачу для экспорта в конце каждого месяца
    // Сохранить в secure storage (S3 + encryption)
  }
}
```

**UI для экспорта в админке:**
```typescript
// Admin Panel → Audit Logs → Download Logs
<Button onClick={handleExportLogs}>
  <Download className="w-4 h-4 mr-2" />
  Download Audit Logs
</Button>

// Date range picker + format selector (CSV/JSON)
```

## 📊 Метрики успеха

### Безопасность:
- ✅ 100% админов используют Passkeys или TOTP (2FA обязательна)
- ✅ Все критические действия требуют Step-up MFA
- ✅ Сессии автоматически истекают (idle: 15 мин, max: 8 часов)
- ✅ Все действия логируются в неизменяемый Audit Log
- ✅ Break-glass аккаунт доступен только из физического сейфа
- ✅ Phishing-resistant аутентификация (Passkeys)

### Производительность:
- Permission check: < 50ms (кеширование разрешений в Redis)
- WebAuthn verification: < 100ms
- Session check: < 30ms (кеш в памяти + DB)
- Audit log write: < 20ms (асинхронная запись)

### Compliance:
- ✅ Разделение обязанностей (RBAC с 8 ролями)
- ✅ Принцип 4-eyes для критических операций
- ✅ Аудит всех действий (неизменяемый, 5+ лет)
- ✅ MFA для критических операций (PSD2/SCA compliant)
- ✅ Idle timeout для защиты от незакрытых сессий
- ✅ Export логов для внешних проверок (CSV/JSON)
- ✅ STR/SAR submission tracking (AML compliance)

---

## ⚠️ Риски и митигация

### Риск 1: Миграция существующих админов
**Митигация:**
- Автоматическая миграция через скрипт
- Сохранение ID для обратной совместимости
- Постепенный переход (dual mode)

### Риск 2: SSO недоступен
**Митигация:**
- Fallback на password + TOTP
- Backup codes
- Emergency access procedure

### Риск 3: WebAuthn не поддерживается устройством
**Митигация:**
- TOTP как резервный метод
- Backup codes
- Email verification как последнее средство

---

## 🎯 Timeline

| Этап | Длительность | Приоритет |
|------|-------------|-----------|
| 1. Подготовка | 1-2 дня | P0 |
| 2. Миграция БД | 2-3 дня | P0 |
| 3. Аутентификация | 3-5 дней | P0 |
| 4. Система прав | 3-4 дня | P0 |
| 5. Step-up MFA | 2-3 дня | P0 |
| 6. Session Management | 1-2 дня | P0 |
| 7. Тестирование | 3-5 дней | P0 |
| **ИТОГО** | **15-24 дня** | **P0** |

---

## ✅ Чеклист готовности к production

### Безопасность:
- [ ] Все админы мигрированы в таблицу `Admin`
- [ ] Роли и права настроены
- [ ] SSO настроен и протестирован
- [ ] WebAuthn работает на всех основных платформах
- [ ] Step-up MFA работает для критических действий
- [ ] Session management (idle + max duration) работает
- [ ] Audit logging покрывает все действия

### Тестирование:
- [ ] Unit tests для всех сервисов
- [ ] Integration tests для auth flow
- [ ] E2E tests для admin login + MFA
- [ ] Load tests для permission checks
- [ ] Security audit пройден

### Документация:
- [ ] Admin onboarding guide
- [ ] SSO setup guide
- [ ] WebAuthn setup guide
- [ ] Permission matrix документирована
- [ ] Emergency access procedure

---

**Готов начинать реализацию?** 🚀

