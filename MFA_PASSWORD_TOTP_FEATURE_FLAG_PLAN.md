# 🎚️ Feature Flag: Password + TOTP для администраторов

## 🎯 Цель

Сделать **опциональным** использование Password + TOTP для входа администраторов через **feature flag** в системных настройках.

### Требования:
- ✅ **По умолчанию выключено** (только Passkey)
- ✅ **Только SUPER_ADMIN** может включить/выключить
- ✅ **Не ломает текущую систему**
- ✅ **Обратная совместимость**
- ✅ **Audit log** всех изменений

---

## 🏗️ Архитектурное решение

### 1. Feature Flag в SystemSettings

**Добавляем новую настройку:**

```typescript
{
  key: 'adminPasswordAuthEnabled',
  value: 'false', // ← По умолчанию ВЫКЛЮЧЕНО
  type: 'BOOLEAN',
  category: 'security',
  description: 'Allow admins to use Password + TOTP instead of Passkey',
  isPublic: false // ← Не публичная настройка
}
```

**Почему SystemSettings?**
- ✅ Одна настройка для всей системы
- ✅ Уже есть UI для управления
- ✅ Уже есть API с RBAC проверкой
- ✅ Уже есть audit log
- ✅ Легко читать из любой части приложения

---

## 📋 План внедрения (безопасный)

### Этап 1: Добавить feature flag в базу данных (10 мин)

**Файл:** `prisma/seed-settings.ts`

```typescript
// Добавить в конец массива defaultSettings:
{
  key: 'adminPasswordAuthEnabled',
  value: 'false', // ← По умолчанию ВЫКЛЮЧЕНО
  type: 'BOOLEAN' as const,
  category: 'security',
  description: 'Allow administrators to use Password + TOTP authentication as an alternative to Passkey (biometric/security key). Recommended: Keep disabled for maximum security.',
  isPublic: false
},
{
  key: 'adminPasswordAuthForRoles',
  value: '["ADMIN","SUPPORT","FINANCE"]', // ← Только для некоторых ролей
  type: 'JSON' as const,
  category: 'security',
  description: 'Admin roles allowed to use Password + TOTP (if enabled). SUPER_ADMIN always requires Passkey.',
  isPublic: false
}
```

**Применить:**
```bash
npx tsx prisma/seed-settings.ts
```

---

### Этап 2: Создать utility для проверки feature flag (20 мин)

**Файл:** `src/lib/features/admin-auth-features.ts`

```typescript
/**
 * Feature flags for admin authentication
 */

import { prisma } from '@/lib/prisma';
import { AdminRole } from '@prisma/client';

// Cache для performance (обновляется каждые 5 минут)
let cachedSettings: {
  passwordAuthEnabled: boolean;
  allowedRoles: AdminRole[];
  cachedAt: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get admin auth feature flags
 */
export async function getAdminAuthFeatures() {
  const now = Date.now();
  
  // Return cached if fresh
  if (cachedSettings && (now - cachedSettings.cachedAt) < CACHE_TTL) {
    return cachedSettings;
  }

  // Fetch from database
  const [passwordAuthSetting, allowedRolesSetting] = await Promise.all([
    prisma.systemSettings.findUnique({
      where: { key: 'adminPasswordAuthEnabled' }
    }),
    prisma.systemSettings.findUnique({
      where: { key: 'adminPasswordAuthForRoles' }
    })
  ]);

  let allowedRoles: AdminRole[] = ['ADMIN', 'SUPPORT', 'FINANCE'];
  try {
    if (allowedRolesSetting?.value) {
      allowedRoles = JSON.parse(allowedRolesSetting.value);
    }
  } catch (error) {
    console.error('Failed to parse adminPasswordAuthForRoles:', error);
  }

  cachedSettings = {
    passwordAuthEnabled: passwordAuthSetting?.value === 'true',
    allowedRoles,
    cachedAt: now
  };

  return cachedSettings;
}

/**
 * Check if password auth is enabled for specific admin role
 */
export async function isPasswordAuthEnabledForRole(role: AdminRole): Promise<boolean> {
  const features = await getAdminAuthFeatures();
  
  // SUPER_ADMIN always requires Passkey (maximum security)
  if (role === 'SUPER_ADMIN') {
    return false;
  }
  
  return features.passwordAuthEnabled && features.allowedRoles.includes(role);
}

/**
 * Clear cache (call after updating settings)
 */
export function clearAdminAuthFeaturesCache() {
  cachedSettings = null;
}
```

---

### Этап 3: Модифицировать API для проверки feature flag (30 мин)

#### 3.1. API: Check admin auth methods

**Файл:** `src/app/api/admin/auth/check-methods/route.ts` (новый)

```typescript
/**
 * Check available authentication methods for admin
 * 
 * GET /api/admin/auth/check-methods?email=admin@example.com
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isPasswordAuthEnabledForRole } from '@/lib/features/admin-auth-features';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find admin
    const admin = await prisma.admin.findFirst({
      where: {
        OR: [
          { email },
          { workEmail: email }
        ],
        isActive: true,
        isSuspended: false
      },
      include: {
        twoFactorAuth: true,
        webAuthnCreds: true
      }
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Check available methods
    const hasPasskey = admin.webAuthnCreds && admin.webAuthnCreds.length > 0;
    const hasPasswordTotp = admin.password && admin.twoFactorAuth?.totpEnabled;
    
    // Check if password auth is enabled for this role
    const passwordAuthAllowed = await isPasswordAuthEnabledForRole(admin.role);

    return NextResponse.json({
      success: true,
      methods: {
        passkey: {
          available: hasPasskey,
          required: !passwordAuthAllowed, // Always required if password auth disabled
          recommended: true
        },
        passwordTotp: {
          available: hasPasswordTotp && passwordAuthAllowed,
          required: false,
          enabled: passwordAuthAllowed
        }
      },
      admin: {
        email: admin.email,
        role: admin.role,
        firstName: admin.firstName,
        lastName: admin.lastName
      }
    });
  } catch (error) {
    console.error('Check admin auth methods error:', error);
    return NextResponse.json(
      { error: 'Failed to check authentication methods' },
      { status: 500 }
    );
  }
}
```

---

### Этап 4: Модифицировать Login UI с проверкой (1 день)

**Файл:** `src/app/(admin)/admin/auth/login/page.tsx`

```tsx
// Добавить в state
const [availableMethods, setAvailableMethods] = useState<{
  passkey: { available: boolean; required: boolean; recommended: boolean };
  passwordTotp: { available: boolean; required: boolean; enabled: boolean };
} | null>(null);

// Модифицировать handleEmailSubmit
const handleEmailSubmit = async (data: EmailInput) => {
  setIsCheckingEmail(true);
  setError(null);

  try {
    // Проверить доступные методы аутентификации
    const response = await fetch(
      `/api/admin/auth/check-methods?email=${encodeURIComponent(data.email)}`
    );

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || 'Failed to verify email');
      setIsCheckingEmail(false);
      return;
    }

    // Сохранить доступные методы
    setAvailableMethods(result.methods);
    setAdminEmail(data.email);
    setIsCheckingEmail(false);
  } catch (error) {
    console.error('Email check error:', error);
    setError('An unexpected error occurred. Please try again.');
    setIsCheckingEmail(false);
  }
};

// UI для выбора метода
{adminEmail && availableMethods && (
  <div className="space-y-4">
    {/* Если доступны оба метода - показать выбор */}
    {availableMethods.passkey.available && 
     availableMethods.passwordTotp.available && (
      <Tabs defaultValue="passkey" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="passkey">
            <Shield className="w-4 h-4 mr-2" />
            Passkey
            {availableMethods.passkey.recommended && (
              <Badge variant="secondary" className="ml-2">Recommended</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="password">
            <Key className="w-4 h-4 mr-2" />
            Password + 2FA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="passkey">
          <PasskeyLoginButton
            email={adminEmail}
            onSuccess={() => window.location.href = '/admin'}
            onError={setError}
          />
        </TabsContent>

        <TabsContent value="password">
          <PasswordTotpLogin
            email={adminEmail}
            onSuccess={() => window.location.href = '/admin'}
            onError={setError}
          />
        </TabsContent>
      </Tabs>
    )}

    {/* Если только Passkey доступен */}
    {availableMethods.passkey.required && !availableMethods.passwordTotp.available && (
      <div>
        <PasskeyLoginButton
          email={adminEmail}
          onSuccess={() => window.location.href = '/admin'}
          onError={setError}
        />
        <p className="text-xs text-muted-foreground mt-2 text-center">
          🔒 Passkey authentication required for your role
        </p>
      </div>
    )}

    {/* Если только Password + TOTP доступен */}
    {!availableMethods.passkey.available && availableMethods.passwordTotp.available && (
      <PasswordTotpLogin
        email={adminEmail}
        onSuccess={() => window.location.href = '/admin'}
        onError={setError}
      />
    )}
  </div>
)}
```

---

### Этап 5: UI для настройки в /admin/settings (1 день)

**Файл:** `src/app/(admin)/admin/settings/page.tsx`

Добавить новую вкладку "Security":

```tsx
<TabsList>
  <TabsTrigger value="brand">Brand</TabsTrigger>
  <TabsTrigger value="seo">SEO</TabsTrigger>
  <TabsTrigger value="legal">Legal</TabsTrigger>
  <TabsTrigger value="system">System</TabsTrigger>
  <TabsTrigger value="security">Security</TabsTrigger> {/* ← Новая вкладка */}
</TabsList>

<TabsContent value="security">
  <Card>
    <CardHeader>
      <CardTitle>🔐 Admin Authentication Security</CardTitle>
      <CardDescription>
        Configure authentication methods for administrators
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Feature Flag */}
      <div className="space-y-4 p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <Label htmlFor="adminPasswordAuthEnabled" className="text-base font-semibold">
              Allow Password + TOTP Authentication
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, administrators can use password + authenticator app instead of Passkey (biometric/security key).
            </p>
            <Alert className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Security Notice</AlertTitle>
              <AlertDescription className="text-xs">
                <strong>Passkey (biometric/security key)</strong> provides the highest security and is phishing-resistant.
                <br />
                <strong>Password + TOTP</strong> is more convenient but slightly less secure.
                <br />
                <strong>SUPER_ADMIN</strong> always requires Passkey regardless of this setting.
              </AlertDescription>
            </Alert>
          </div>
          <Switch
            id="adminPasswordAuthEnabled"
            checked={settings.adminPasswordAuthEnabled === true}
            onCheckedChange={(checked) => {
              handleSettingChange('adminPasswordAuthEnabled', checked);
            }}
            disabled={saving}
          />
        </div>

        {/* Показать только если feature включен */}
        {settings.adminPasswordAuthEnabled && (
          <div className="space-y-2 pl-4 border-l-2">
            <Label className="text-sm font-medium">
              Allowed Roles
            </Label>
            <p className="text-xs text-muted-foreground">
              Select which admin roles can use Password + TOTP:
            </p>
            <div className="space-y-2">
              {['ADMIN', 'COMPLIANCE', 'TREASURY_APPROVER', 'FINANCE', 'SUPPORT', 'READ_ONLY'].map(role => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={settings.adminPasswordAuthForRoles?.includes(role)}
                    onCheckedChange={(checked) => {
                      const currentRoles = settings.adminPasswordAuthForRoles || [];
                      const newRoles = checked
                        ? [...currentRoles, role]
                        : currentRoles.filter(r => r !== role);
                      handleSettingChange('adminPasswordAuthForRoles', newRoles);
                    }}
                  />
                  <Label htmlFor={`role-${role}`} className="text-sm font-normal">
                    {role}
                  </Label>
                </div>
              ))}
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>SUPER_ADMIN</strong> is excluded from this list and always requires Passkey.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      {/* Существующие настройки безопасности */}
      {/* ... */}
    </CardContent>
  </Card>
</TabsContent>
```

---

### Этап 6: Модифицировать auth-admin.ts (1 день)

**Файл:** `src/auth-admin.ts`

```typescript
import { isPasswordAuthEnabledForRole } from '@/lib/features/admin-auth-features';

export const { handlers: adminHandlers, signIn: adminSignIn, signOut: adminSignOut, auth: getAdminSession } = NextAuth({
  basePath: '/api/admin/auth',
  providers: [
    // Существующий Credentials provider для OTAT (Passkey flow)
    Credentials({
      id: 'credentials',
      name: 'One-Time Token',
      // ... существующий код ...
    }),

    // ✅ НОВЫЙ Credentials provider для Password + TOTP
    Credentials({
      id: 'password-totp',
      name: 'Password + TOTP',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totpCode: { label: 'TOTP Code', type: 'text' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password || !credentials?.totpCode) {
            return null;
          }

          // 1. Find admin
          const admin = await prisma.admin.findFirst({
            where: {
              OR: [
                { email: credentials.email as string },
                { workEmail: credentials.email as string }
              ],
              isActive: true,
              isSuspended: false
            },
            include: {
              twoFactorAuth: true
            }
          });

          if (!admin) {
            console.error('❌ Admin not found:', credentials.email);
            return null;
          }

          // 2. ✅ CHECK FEATURE FLAG
          const passwordAuthAllowed = await isPasswordAuthEnabledForRole(admin.role);
          
          if (!passwordAuthAllowed) {
            console.error('❌ Password auth not enabled for role:', admin.role);
            return null;
          }

          // 3. Verify password
          if (!admin.password) {
            console.error('❌ Admin has no password:', admin.email);
            return null;
          }

          const passwordValid = await verifyPassword(
            credentials.password as string,
            admin.password
          );

          if (!passwordValid) {
            console.error('❌ Invalid password for:', admin.email);
            return null;
          }

          // 4. Verify TOTP
          if (!admin.twoFactorAuth?.totpEnabled || !admin.twoFactorAuth?.totpSecret) {
            console.error('❌ TOTP not configured for:', admin.email);
            return null;
          }

          const totpValid = await verifyTotpCode(
            admin.twoFactorAuth.totpSecret,
            admin.email,
            credentials.totpCode as string
          );

          if (!totpValid) {
            console.error('❌ Invalid TOTP for:', admin.email);
            return null;
          }

          // 5. Success - update last login
          await prisma.admin.update({
            where: { id: admin.id },
            data: { lastLogin: new Date() }
          });

          // 6. Log authentication
          await prisma.adminAuditLog.create({
            data: {
              adminId: admin.id,
              action: 'ADMIN_LOGIN',
              entity: 'Admin',
              entityId: admin.id,
              metadata: {
                authMethod: 'PASSWORD_TOTP',
                email: admin.email,
                ipAddress: 'unknown', // Will be set by middleware
                userAgent: 'unknown'
              }
            }
          });

          console.log('✅ Admin authenticated via Password + TOTP:', admin.email);

          return {
            id: admin.id,
            email: admin.email || admin.workEmail,
            name: `${admin.firstName} ${admin.lastName}`,
            role: admin.role
          };
        } catch (error) {
          console.error('❌ Password + TOTP auth error:', error);
          return null;
        }
      }
    })
  ],
  // ... остальная конфигурация ...
});
```

---

### Этап 7: Cache invalidation при изменении настроек (20 мин)

**Файл:** `src/app/api/admin/settings/[key]/route.ts`

```typescript
import { clearAdminAuthFeaturesCache } from '@/lib/features/admin-auth-features';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  // ... существующий код ...

  // ✅ Clear cache if security setting changed
  const { key } = await params;
  if (key === 'adminPasswordAuthEnabled' || key === 'adminPasswordAuthForRoles') {
    clearAdminAuthFeaturesCache();
    console.log('🔄 Admin auth features cache cleared');
  }

  // ... существующий код ...
}
```

---

## 🔒 Безопасность

### 1. По умолчанию ВЫКЛЮЧЕНО
```typescript
value: 'false' // ← Максимальная безопасность по умолчанию
```

### 2. SUPER_ADMIN всегда требует Passkey
```typescript
if (role === 'SUPER_ADMIN') {
  return false; // ← Нельзя включить Password auth
}
```

### 3. Audit Log всех изменений
```typescript
await auditService.log({
  action: 'SETTINGS_UPDATE',
  entity: 'SystemSettings',
  entityId: 'adminPasswordAuthEnabled',
  metadata: { oldValue, newValue, changedBy: adminId }
});
```

### 4. Cache с TTL
```typescript
const CACHE_TTL = 5 * 60 * 1000; // 5 минут
// Защита от race conditions и performance
```

### 5. Только SUPER_ADMIN может менять
```typescript
// В /api/admin/settings/[key]/route.ts
const authResult = await requireAdminRole('SUPER_ADMIN');
```

---

## ✅ Преимущества архитектуры

### 1. **Безопасность**
- ✅ По умолчанию выключено (opt-in, не opt-out)
- ✅ SUPER_ADMIN всегда требует Passkey
- ✅ Audit log всех изменений
- ✅ Feature flag проверяется при каждом логине

### 2. **Гибкость**
- ✅ Можно включить для конкретных ролей
- ✅ Можно включить временно и выключить обратно
- ✅ Админы могут использовать оба метода (если оба настроены)

### 3. **Обратная совместимость**
- ✅ Не ломает существующий Passkey flow
- ✅ Существующие админы продолжают работать
- ✅ Новый provider не мешает старому

### 4. **Performance**
- ✅ Cache с TTL (не читаем БД каждый раз)
- ✅ Invalidation cache при изменениях
- ✅ Быстрые проверки

### 5. **UX**
- ✅ UI показывает только доступные методы
- ✅ Понятные сообщения об ошибках
- ✅ SUPER_ADMIN видит настройки в /admin/settings

---

## 🧪 Тестирование

### Тест-кейсы:

#### 1. Feature flag выключен (default)
```
✅ Админ видит только Passkey
✅ Password + TOTP endpoint возвращает 401
✅ SUPER_ADMIN может войти через Passkey
```

#### 2. Feature flag включен
```
✅ Админ видит выбор методов (если оба настроены)
✅ Password + TOTP работает для разрешенных ролей
✅ SUPER_ADMIN все равно требует Passkey
```

#### 3. Роли
```
✅ SUPER_ADMIN не может использовать Password + TOTP
✅ ADMIN может (если включено и роль в списке)
✅ SUPPORT может (если включено и роль в списке)
```

#### 4. Cache
```
✅ Настройки кешируются на 5 минут
✅ Cache очищается при изменении настроек
✅ Новые настройки применяются сразу после clear
```

---

## 📅 Timeline

### Полная реализация: **3-4 дня**

```
День 1:
  - Этап 1: Feature flag в БД (10 мин)
  - Этап 2: Utility для проверки (20 мин)
  - Этап 3: API check-methods (30 мин)
  - Этап 4: Модифицировать Login UI (4 часа)

День 2:
  - Этап 5: UI в /admin/settings (6 часов)
  - Этап 6: auth-admin.ts (2 часа)

День 3:
  - Этап 7: Cache invalidation (20 мин)
  - Создать PasswordTotpLogin компонент (4 часа)
  - Создать API для TOTP setup (2 часа)

День 4:
  - Тестирование всех сценариев (4 часа)
  - Документация для админов (2 часа)
  - Финальные правки (2 часа)
```

---

## 🚀 Начать?

**Преимущества подхода:**
- 🔒 **Максимальная безопасность** (по умолчанию выключено)
- 🎛️ **Полный контроль** (SUPER_ADMIN решает)
- 🔄 **Обратимость** (можно выключить в любой момент)
- 🚀 **Быстрое внедрение** (3-4 дня)
- ✅ **Не ломает систему** (обратная совместимость)

**Хотите начать реализацию?** 🎯

