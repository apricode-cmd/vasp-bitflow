# 🏢 SaaS Multi-Tenancy Architecture Analysis

## 📊 Текущее состояние

### Что уже есть:
- ✅ `orgId` в некоторых моделях (AdminAuditLog, UserAuditLog, EmailTemplate, Admin)
- ✅ SystemSettings (white labeling)
- ✅ Legal company info
- ✅ Brand customization (logo, colors, name)
- ✅ Email templates
- ✅ API keys system
- ✅ Audit logging

### Что отсутствует:
- ❌ Полная изоляция данных по организациям
- ❌ Organization/Tenant модель
- ❌ Subscription/Billing система
- ❌ Custom domains/subdomains
- ❌ Per-tenant database connections

---

## 🎯 Варианты Multi-Tenancy архитектуры

### Вариант 1: Database-per-Tenant (Ваш выбор) ⭐

**Концепция:** Каждый клиент = отдельная база данных

#### Архитектура:

```
┌─────────────────────────────────────────────────────────────┐
│                    MASTER DATABASE                          │
│  (Organizations, Subscriptions, Billing, Routing)           │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
│   CLIENT 1 DB  │  │   CLIENT 2 DB  │  │   CLIENT 3 DB  │
│                │  │                │  │                │
│  Users         │  │  Users         │  │  Users         │
│  Orders        │  │  Orders        │  │  Orders        │
│  KYC           │  │  KYC           │  │  KYC           │
│  Settings      │  │  Settings      │  │  Settings      │
└────────────────┘  └────────────────┘  └────────────────┘
```

#### Преимущества:
- ✅ **Полная изоляция данных** - максимальная безопасность
- ✅ **Простое масштабирование** - каждый клиент на своем сервере
- ✅ **Легкий backup/restore** - по клиенту отдельно
- ✅ **Кастомизация схемы** - можно менять схему для конкретного клиента
- ✅ **Compliance** - легко соответствовать GDPR, SOC2
- ✅ **Миграция** - клиента можно перенести на другой сервер
- ✅ **Удаление** - удалить клиента = удалить базу

#### Недостатки:
- ❌ **Сложность управления** - много баз данных
- ❌ **Стоимость** - каждая база = отдельные ресурсы
- ❌ **Миграции** - нужно мигрировать все базы
- ❌ **Мониторинг** - сложнее отслеживать все базы
- ❌ **Аналитика** - сложно делать cross-tenant аналитику

#### Реализация:

```typescript
// 1. Master Database Schema
model Organization {
  id                String   @id @default(cuid())
  name              String
  slug              String   @unique // client1, client2
  databaseUrl       String   // Connection string to tenant DB
  databaseHost      String?
  databaseName      String
  status            OrgStatus @default(ACTIVE)
  
  // White label settings
  brandName         String
  primaryColor      String
  logoUrl           String?
  customDomain      String?  // custom.domain.com
  
  // Subscription
  plan              String   // starter, pro, enterprise
  maxUsers          Int      @default(100)
  maxOrders         Int      @default(1000)
  
  // Billing
  stripeCustomerId  String?
  subscriptionId    String?
  trialEndsAt       DateTime?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([slug])
  @@index([customDomain])
}

// 2. Tenant Database Schema (каждая база)
// Обычная схема User, Order, KYC и т.д. БЕЗ orgId
```

```typescript
// 3. Database Connection Manager
class TenantDatabaseManager {
  private connections: Map<string, PrismaClient> = new Map();
  
  async getConnection(orgSlug: string): Promise<PrismaClient> {
    // Check cache
    if (this.connections.has(orgSlug)) {
      return this.connections.get(orgSlug)!;
    }
    
    // Get org from master DB
    const org = await masterPrisma.organization.findUnique({
      where: { slug: orgSlug }
    });
    
    if (!org) throw new Error('Organization not found');
    
    // Create new connection
    const client = new PrismaClient({
      datasources: {
        db: { url: org.databaseUrl }
      }
    });
    
    this.connections.set(orgSlug, client);
    return client;
  }
}
```

```typescript
// 4. Middleware для определения tenant
// middleware.ts
export async function middleware(request: NextRequest) {
  // Определяем tenant по subdomain или custom domain
  const hostname = request.headers.get('host') || '';
  
  // client1.apricode.io -> client1
  const subdomain = hostname.split('.')[0];
  
  // Или по custom domain
  const org = await getOrgByDomain(hostname);
  
  // Добавляем в headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', org.slug);
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

```typescript
// 5. API Route с tenant context
export async function GET(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug');
  const prisma = await getTenantDB(tenantSlug);
  
  // Работаем с tenant базой
  const users = await prisma.user.findMany();
  
  return NextResponse.json(users);
}
```

---

### Вариант 2: Schema-per-Tenant (PostgreSQL Schemas)

**Концепция:** Одна база, разные PostgreSQL schemas

```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE DATABASE                          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Schema:    │  │  Schema:    │  │  Schema:    │        │
│  │  client1    │  │  client2    │  │  client3    │        │
│  │             │  │             │  │             │        │
│  │  Users      │  │  Users      │  │  Users      │        │
│  │  Orders     │  │  Orders     │  │  Orders     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │  Schema: public (Organizations, Routing)        │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

#### Преимущества:
- ✅ Изоляция данных (на уровне schema)
- ✅ Проще управление чем отдельные базы
- ✅ Одна миграция для всех
- ✅ Легче backup всей базы

#### Недостатки:
- ❌ Все в одной базе - риск
- ❌ Сложнее масштабирование
- ❌ PostgreSQL specific
- ❌ Лимит на количество schemas

---

### Вариант 3: Row-Level Security (Single Database)

**Концепция:** Одна база, фильтрация по orgId

```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE DATABASE                          │
│                                                             │
│  Users Table:                                               │
│  ┌────────────────────────────────────────────────┐        │
│  │ id  │ email      │ orgId    │ ...              │        │
│  │ 1   │ user1@...  │ client1  │ ...              │        │
│  │ 2   │ user2@...  │ client2  │ ...              │        │
│  │ 3   │ user3@...  │ client1  │ ...              │        │
│  └────────────────────────────────────────────────┘        │
│                                                             │
│  WHERE orgId = 'client1' -> Automatic filtering            │
└─────────────────────────────────────────────────────────────┘
```

#### Преимущества:
- ✅ Простая реализация
- ✅ Легкая аналитика
- ✅ Одна миграция
- ✅ Меньше ресурсов

#### Недостатки:
- ❌ Риск утечки данных (ошибка в WHERE)
- ❌ Сложнее compliance
- ❌ Медленнее при большом количестве клиентов
- ❌ Нельзя кастомизировать схему

---

## 🎯 Рекомендация для вашего случая

### **Database-per-Tenant** (Вариант 1) ⭐⭐⭐⭐⭐

**Почему:**
1. Вы SaaS провайдер - продаете платформу
2. Клиенты хотят изоляцию данных
3. Compliance требования (GDPR, финансы)
4. Возможность кастомизации под клиента
5. Простое удаление/миграция клиента

---

## 📋 План миграции на Database-per-Tenant

### Phase 1: Инфраструктура (2-3 недели)

#### 1.1 Master Database
```prisma
// prisma/schema-master.prisma
model Organization {
  id                String      @id @default(cuid())
  name              String
  slug              String      @unique
  
  // Database connection
  databaseUrl       String      // Encrypted
  databaseHost      String
  databaseName      String
  databaseUser      String
  
  // White label
  brandName         String
  brandLogo         String?
  brandLogoDark     String?
  primaryColor      String      @default("#06b6d4")
  customDomain      String?     @unique
  
  // Legal
  companyLegalName  String
  companyTaxNumber  String?
  companyAddress    String?
  
  // Subscription
  plan              PlanType    @default(STARTER)
  status            OrgStatus   @default(TRIAL)
  maxUsers          Int         @default(10)
  maxOrders         Int         @default(100)
  maxVolume         Float       @default(10000)
  
  // Billing
  stripeCustomerId  String?
  subscriptionId    String?
  trialEndsAt       DateTime?
  billingEmail      String
  
  // Contact
  ownerEmail        String
  ownerName         String
  supportEmail      String?
  
  // Status
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  activatedAt       DateTime?
  suspendedAt       DateTime?
  deletedAt         DateTime?
  
  @@index([slug])
  @@index([customDomain])
  @@index([status])
}

enum PlanType {
  TRIAL
  STARTER
  PRO
  ENTERPRISE
}

enum OrgStatus {
  TRIAL
  ACTIVE
  SUSPENDED
  CANCELLED
}
```

#### 1.2 Tenant Database Manager
```typescript
// src/lib/tenant-db.ts
import { PrismaClient } from '@prisma/client';

class TenantDatabaseManager {
  private static instance: TenantDatabaseManager;
  private connections: Map<string, PrismaClient> = new Map();
  private masterDB: PrismaClient;
  
  private constructor() {
    this.masterDB = new PrismaClient({
      datasources: { db: { url: process.env.MASTER_DATABASE_URL } }
    });
  }
  
  static getInstance(): TenantDatabaseManager {
    if (!this.instance) {
      this.instance = new TenantDatabaseManager();
    }
    return this.instance;
  }
  
  async getOrganization(identifier: string): Promise<Organization> {
    // By slug or custom domain
    return await this.masterDB.organization.findFirst({
      where: {
        OR: [
          { slug: identifier },
          { customDomain: identifier }
        ],
        status: 'ACTIVE'
      }
    });
  }
  
  async getTenantDB(orgSlug: string): Promise<PrismaClient> {
    // Check cache
    if (this.connections.has(orgSlug)) {
      return this.connections.get(orgSlug)!;
    }
    
    // Get org
    const org = await this.getOrganization(orgSlug);
    if (!org) throw new Error('Organization not found');
    
    // Decrypt database URL
    const databaseUrl = decrypt(org.databaseUrl);
    
    // Create connection
    const client = new PrismaClient({
      datasources: { db: { url: databaseUrl } }
    });
    
    // Test connection
    await client.$connect();
    
    // Cache
    this.connections.set(orgSlug, client);
    
    console.log(`[TENANT-DB] Connected to ${orgSlug}`);
    return client;
  }
  
  async createTenantDatabase(org: Organization): Promise<void> {
    // 1. Create database
    await this.masterDB.$executeRaw`
      CREATE DATABASE ${org.databaseName}
    `;
    
    // 2. Run migrations
    await this.runMigrations(org.databaseUrl);
    
    // 3. Seed initial data
    await this.seedTenantData(org);
  }
  
  async deleteTenantDatabase(orgSlug: string): Promise<void> {
    const org = await this.getOrganization(orgSlug);
    
    // 1. Disconnect
    const client = this.connections.get(orgSlug);
    if (client) {
      await client.$disconnect();
      this.connections.delete(orgSlug);
    }
    
    // 2. Drop database
    await this.masterDB.$executeRaw`
      DROP DATABASE IF EXISTS ${org.databaseName}
    `;
  }
}

export const tenantDB = TenantDatabaseManager.getInstance();
```

#### 1.3 Middleware для tenant resolution
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { tenantDB } from '@/lib/tenant-db';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // Skip for static files
  if (
    hostname.startsWith('localhost') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/health')
  ) {
    return NextResponse.next();
  }
  
  // Determine tenant
  let tenantSlug: string;
  
  if (hostname.includes('.apricode.io')) {
    // Subdomain: client1.apricode.io
    tenantSlug = hostname.split('.')[0];
  } else {
    // Custom domain: exchange.client.com
    const org = await tenantDB.getOrganization(hostname);
    if (!org) {
      return NextResponse.redirect(new URL('/404', request.url));
    }
    tenantSlug = org.slug;
  }
  
  // Add to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Phase 2: API Adaptation (1-2 недели)

#### 2.1 Helper для получения tenant DB
```typescript
// src/lib/get-tenant-db.ts
import { NextRequest } from 'next/server';
import { tenantDB } from './tenant-db';

export async function getTenantDB(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug');
  
  if (!tenantSlug) {
    throw new Error('Tenant not identified');
  }
  
  return await tenantDB.getTenantDB(tenantSlug);
}
```

#### 2.2 Обновление API routes
```typescript
// Было:
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const users = await prisma.user.findMany();
  return NextResponse.json(users);
}

// Стало:
import { getTenantDB } from '@/lib/get-tenant-db';

export async function GET(request: NextRequest) {
  const prisma = await getTenantDB(request);
  const users = await prisma.user.findMany();
  return NextResponse.json(users);
}
```

### Phase 3: Provisioning System (1 неделя)

```typescript
// src/app/api/admin/organizations/route.ts
export async function POST(request: NextRequest) {
  const data = await request.json();
  
  // 1. Create organization in master DB
  const org = await masterPrisma.organization.create({
    data: {
      name: data.name,
      slug: generateSlug(data.name),
      databaseName: `tenant_${generateId()}`,
      databaseUrl: encrypt(generateDatabaseUrl()),
      ownerEmail: data.email,
      plan: 'TRIAL',
      trialEndsAt: addDays(new Date(), 14)
    }
  });
  
  // 2. Create tenant database
  await tenantDB.createTenantDatabase(org);
  
  // 3. Send welcome email
  await sendWelcomeEmail(org);
  
  return NextResponse.json(org);
}
```

### Phase 4: Billing Integration (1-2 недели)

```typescript
// Stripe subscription webhook
export async function POST(request: NextRequest) {
  const event = await stripe.webhooks.constructEvent(
    body,
    signature,
    webhookSecret
  );
  
  switch (event.type) {
    case 'customer.subscription.created':
      await activateOrganization(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await suspendOrganization(event.data.object);
      break;
  }
}
```

---

## 💰 Стоимость и ресурсы

### Database costs (примерно):
- **Supabase:** $25/месяц за базу (до 8GB)
- **AWS RDS:** $15-50/месяц за инстанс
- **DigitalOcean:** $15/месяц за managed DB

### Pricing strategy:
- **Starter:** $99/мес (1 база, 10 users, 100 orders/мес)
- **Pro:** $299/мес (1 база, 50 users, 1000 orders/мес)
- **Enterprise:** $999/мес (1 база, unlimited, custom)

---

## 🚀 Альтернативный подход: Hybrid

**Для начала:**
1. Starter/Pro клиенты → Row-level (orgId) - дешевле
2. Enterprise клиенты → Отдельная база - изоляция

**Потом:**
Все переводим на отдельные базы по мере роста.

---

## ❓ Вопросы для решения:

1. **Где хостить базы клиентов?**
   - Supabase (managed, дорого)
   - AWS RDS (гибко, средняя цена)
   - Self-hosted PostgreSQL (дешево, сложно)

2. **Как делать миграции?**
   - Автоматически для всех баз
   - Или по запросу клиента

3. **Backup strategy?**
   - Автоматический backup каждой базы
   - Point-in-time recovery

4. **Monitoring?**
   - Как мониторить 100+ баз данных?
   - Alerts при проблемах

Что думаете? Какой вариант ближе? 🤔

