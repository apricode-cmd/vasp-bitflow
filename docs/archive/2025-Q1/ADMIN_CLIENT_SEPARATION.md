# 🔐 Полное разделение Client и Admin - Архитектура

## 📋 Принцип разделения

### 1. Разные таблицы БД
```
User (CLIENT)          →  Клиенты платформы
Admin (ADMIN+)         →  Сотрудники компании
```

### 2. Разные пути аутентификации

**Клиенты:**
- Путь входа: `/login`
- Регистрация: `/register`
- NextAuth: `src/auth-client.ts`
- Provider: Credentials (email + password + TOTP)
- Сессии: Cookie `next-auth.session-token`

**Админы:**
- Путь входа: `/admin/auth/login`
- NextAuth: `src/auth-admin.ts`
- Provider: Multiple (Credentials + SSO + Passkeys)
- Сессии: Cookie `admin.session-token` (отдельный)
- Break-glass: `/admin/auth/emergency`

### 3. Разные маршруты

```typescript
// CLIENT ROUTES
/                        → Landing (публичная)
/login                   → Client login
/register                → Client registration
/dashboard               → Client dashboard
/orders                  → Client orders
/kyc                     → Client KYC
/profile                 → Client profile

// ADMIN ROUTES (полностью отдельно)
/admin/auth/login        → Admin login (Passkeys/SSO/Password+TOTP)
/admin/auth/emergency    → Break-glass emergency access
/admin/auth/setup-passkey → Setup Passkey after first login
/admin                   → Admin dashboard
/admin/users             → Manage users
/admin/orders            → Manage orders
/admin/kyc               → KYC approval
/admin/compliance        → AML/Compliance
/admin/settings          → System settings
/admin/audit             → Audit logs
/admin/sessions          → Session manager
```

### 4. Разные API endpoints

```typescript
// CLIENT API
/api/auth/[...nextauth]  → Client NextAuth (User table)
/api/orders              → Client orders
/api/profile             → Client profile

// ADMIN API (полностью отдельно)
/api/admin/auth/[...nextauth] → Admin NextAuth (Admin table)
/api/admin/users         → Admin: manage users
/api/admin/orders        → Admin: manage orders
/api/admin/permissions   → Admin: check permissions
/api/admin/sessions      → Admin: session manager
/api/admin/audit         → Admin: audit logs
```

### 5. Разные middleware

```typescript
// src/middleware.ts

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ADMIN ROUTES - используем admin auth
  if (path.startsWith('/admin')) {
    const adminSession = await getAdminSession(); // from auth-admin.ts
    
    if (!adminSession) {
      return NextResponse.redirect(new URL('/admin/auth/login', request.url));
    }
    
    // Check admin permissions
    const hasAccess = await checkAdminPermission(adminSession.user.id, path);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.next();
  }
  
  // CLIENT ROUTES - используем client auth
  if (path.startsWith('/dashboard') || path.startsWith('/orders')) {
    const clientSession = await getClientSession(); // from auth-client.ts
    
    if (!clientSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    return NextResponse.next();
  }
  
  return NextResponse.next();
}
```

### 6. Две NextAuth конфигурации

**src/auth-client.ts** (для клиентов):
```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';

export const { 
  handlers: clientHandlers, 
  signIn: clientSignIn, 
  signOut: clientSignOut,
  auth: getClientSession 
} = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        // Ищем в таблице User (только CLIENT)
        const user = await prisma.user.findUnique({
          where: { 
            email: credentials.email,
            role: 'CLIENT' // ВАЖНО!
          }
        });
        
        if (!user || !user.isActive) return null;
        
        // Verify password + TOTP
        // ...
        
        return { id: user.id, email: user.email, role: 'CLIENT' };
      }
    })
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours for clients
  },
  
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token', // Default cookie
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  
  pages: {
    signIn: '/login',
    error: '/login'
  }
});
```

**src/auth-admin.ts** (для админов):
```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GoogleWorkspace from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import { verifyPasskey } from '@/lib/auth/passkey';

export const { 
  handlers: adminHandlers, 
  signIn: adminSignIn, 
  signOut: adminSignOut,
  auth: getAdminSession 
} = NextAuth({
  providers: [
    // 1. Passkeys (primary)
    Credentials({
      id: 'passkey',
      name: 'Passkey',
      async authorize(credentials) {
        const { email, passkeyResponse } = credentials;
        
        // Verify passkey
        const admin = await verifyPasskey(email, passkeyResponse);
        if (!admin) return null;
        
        return { 
          id: admin.id, 
          email: admin.email, 
          role: admin.role,
          authMethod: 'PASSKEY'
        };
      }
    }),
    
    // 2. Password + TOTP (fallback)
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      async authorize(credentials) {
        // Ищем в таблице Admin
        const admin = await prisma.admin.findUnique({
          where: { email: credentials.email }
        });
        
        if (!admin || !admin.isActive) return null;
        
        // Verify password + TOTP
        // ...
        
        return { 
          id: admin.id, 
          email: admin.email, 
          role: admin.role,
          authMethod: 'PASSWORD'
        };
      }
    }),
    
    // 3. SSO (Google Workspace)
    GoogleWorkspace({
      clientId: process.env.GOOGLE_ADMIN_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_ADMIN_SECRET!,
      authorization: {
        params: {
          hd: "apricode.io", // Restrict to domain
          prompt: "consent"
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
          // Auto-provision if email is allowed
          admin = await prisma.admin.create({
            data: {
              email: profile.email,
              firstName: profile.given_name,
              lastName: profile.family_name,
              role: 'SUPPORT', // Default role
              authMethod: 'SSO',
              ssoProvider: 'google-workspace',
              ssoSubject: profile.sub
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
    })
  ],
  
  callbacks: {
    async signIn({ user, account }) {
      // Check if admin is active
      const admin = await prisma.admin.findUnique({
        where: { id: user.id }
      });
      
      if (!admin?.isActive || admin.isSuspended) {
        return false;
      }
      
      // Create AdminSession
      await createAdminSession(user.id, request);
      
      return true;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.authMethod = token.authMethod;
        
        // Check session validity (idle + max duration)
        await checkAdminSessionValidity(token.sessionToken);
      }
      
      return session;
    }
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours for admins
    updateAge: 15 * 60, // Update every 15 minutes
  },
  
  cookies: {
    sessionToken: {
      name: 'admin.session-token', // ОТДЕЛЬНЫЙ cookie для админов!
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/admin', // Только для /admin путей
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  
  pages: {
    signIn: '/admin/auth/login',
    error: '/admin/auth/login'
  }
});
```

### 7. API Routes разделение

**Client API** (обычный NextAuth):
```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { clientHandlers } from '@/auth-client';

export const { GET, POST } = clientHandlers;
```

**Admin API** (отдельный):
```typescript
// src/app/api/admin/auth/[...nextauth]/route.ts
import { adminHandlers } from '@/auth-admin';

export const { GET, POST } = adminHandlers;
```

### 8. Безопасность

**Защита от переключения:**
- Админ НЕ МОЖЕТ войти через `/login` (только User table)
- Клиент НЕ МОЖЕТ войти через `/admin/auth/login` (только Admin table)
- Разные cookie names → нет конфликтов
- Разные session strategies

**Audit logging:**
- Все входы админов логируются в `AdminSession`
- Все действия админов → `AuditLog` с `adminId`
- Клиенты → обычный `SystemLog`

### 9. Break-glass Emergency Access

```typescript
// src/app/admin/auth/emergency/page.tsx
// Специальный вход для экстренных случаев
// Требует длинный пароль из сейфа + TOTP
// Автоматически деактивируется через 24 часа
// Логирует CRITICAL audit event
```

## Преимущества:

✅ **Безопасность**: Полное разделение клиентов и админов
✅ **Compliance**: Соответствие SOC 2, ISO 27001
✅ **Масштабируемость**: Легко добавить новые роли
✅ **Аудит**: Четкое разделение действий
✅ **Гибкость**: Разные auth методы для разных групп

## Структура файлов:

```
src/
├── auth-client.ts              # NextAuth для клиентов (User)
├── auth-admin.ts               # NextAuth для админов (Admin)
├── middleware.ts               # Маршрутизация по ролям
├── app/
│   ├── (client)/               # Client routes
│   │   ├── login/
│   │   ├── register/
│   │   ├── dashboard/
│   │   └── orders/
│   │
│   ├── (admin)/                # Admin routes
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── emergency/
│   │   │   └── setup-passkey/
│   │   ├── dashboard/
│   │   ├── users/
│   │   └── settings/
│   │
│   └── api/
│       ├── auth/               # Client API
│       │   └── [...nextauth]/
│       └── admin/              # Admin API
│           ├── auth/
│           │   └── [...nextauth]/
│           ├── users/
│           └── permissions/
│
└── lib/
    ├── auth/
    │   ├── client-utils.ts     # Client auth helpers
    │   ├── admin-utils.ts      # Admin auth helpers
    │   ├── passkey.ts          # Passkey verification
    │   └── session.ts          # Session management
    └── middleware/
        ├── client-auth.ts      # Client middleware
        └── admin-auth.ts       # Admin middleware
```

