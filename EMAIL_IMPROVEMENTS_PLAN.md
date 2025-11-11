# 📧 Email System Improvements Plan

## 🔍 Текущее состояние

### ✅ Что уже работает:
1. **Resend интеграция** - полностью настроена и работает
2. **6 базовых шаблонов** - ORDER_CREATED, ORDER_COMPLETED, KYC_APPROVED, WELCOME_EMAIL, PASSWORD_RESET, PAYMENT_RECEIVED
3. **White-label поддержка** - brandName, brandLogo, primaryColor, supportEmail, supportPhone
4. **Inline CSS** - все стили инлайновые для email клиентов
5. **Responsive дизайн** - адаптивная верстка для мобильных устройств

### ❌ Проблемы:

#### 1. **URL и ссылки**
- ❌ Используются заглушки: `{{orderUrl}}`, `{{dashboardUrl}}`, `{{resetUrl}}`
- ❌ Нет базового URL (APP_URL) для формирования полных ссылок
- ❌ В dev - `localhost:3000`, в prod - должен быть реальный домен
- ❌ Кнопки ведут на `#` в превью

#### 2. **Изображения**
- ❌ `{{brandLogo}}` - относительный путь `/uploads/logo.svg`
- ❌ В email должны быть абсолютные URL: `https://domain.com/uploads/logo.svg`
- ❌ В dev - `http://localhost:3000/uploads/...`
- ❌ В prod - Vercel Blob URL или CDN

#### 3. **Переменные шаблонов**
- ❌ Не все переменные подставляются из реальных данных
- ❌ Нет связи между Order/KYC/User данными и email шаблонами
- ❌ Тестовые данные захардкожены

#### 4. **Недостающие шаблоны**
Нужны дополнительные шаблоны для полного покрытия user journey:
- ❌ **KYC_REJECTED** - отклонение KYC
- ❌ **KYC_PENDING** - KYC на проверке
- ❌ **ORDER_CANCELLED** - отмена заказа
- ❌ **ORDER_EXPIRED** - истечение заказа (24 часа)
- ❌ **PAYMENT_FAILED** - ошибка платежа
- ❌ **WITHDRAWAL_COMPLETED** - вывод средств (для будущего)
- ❌ **EMAIL_VERIFICATION** - подтверждение email при регистрации
- ❌ **ADMIN_INVITED** - приглашение админа
- ❌ **SECURITY_ALERT** - подозрительная активность

---

## 🎯 План доработок

### **Phase 1: URL Management** (Priority: HIGH)

#### 1.1 Добавить APP_URL в конфигурацию
```typescript
// src/lib/config.ts
export const config = {
  // ...
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    isDevelopment: process.env.NODE_ENV === 'development',
  }
}
```

#### 1.2 Создать URL Helper
```typescript
// src/lib/utils/email-urls.ts
export function getEmailUrls() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    // Client URLs
    dashboard: `${baseUrl}/dashboard`,
    orders: `${baseUrl}/orders`,
    order: (id: string) => `${baseUrl}/orders/${id}`,
    kyc: `${baseUrl}/kyc`,
    profile: `${baseUrl}/profile`,
    buy: `${baseUrl}/buy`,
    
    // Auth URLs
    login: `${baseUrl}/login`,
    register: `${baseUrl}/register`,
    resetPassword: (token: string) => `${baseUrl}/auth/reset-password?token=${token}`,
    verifyEmail: (token: string) => `${baseUrl}/auth/verify-email?token=${token}`,
    
    // Admin URLs
    adminDashboard: `${baseUrl}/admin`,
    adminOrders: `${baseUrl}/admin/orders`,
    adminKyc: `${baseUrl}/admin/kyc`,
    adminSetupPasskey: (token: string) => `${baseUrl}/admin/auth/setup-passkey?token=${token}`,
    
    // Assets
    logo: (path: string) => path.startsWith('http') ? path : `${baseUrl}${path}`,
    asset: (path: string) => `${baseUrl}${path}`,
  };
}
```

#### 1.3 Обновить EmailTemplateService
```typescript
// src/lib/services/email-template.service.ts
import { getEmailUrls } from '@/lib/utils/email-urls';

async render(options: RenderOptions): Promise<RenderedEmail> {
  // ...
  const emailUrls = getEmailUrls();
  
  const allVariables: TemplateVariables = {
    // White-label
    brandName: settings.brandName || 'Apricode Exchange',
    brandLogo: emailUrls.logo(settings.brandLogo || '/logo.png'), // ✅ Absolute URL
    primaryColor: settings.primaryColor || '#06b6d4',
    supportEmail: settings.supportEmail || 'support@apricode.io',
    supportPhone: settings.supportPhone || '',
    currentYear: new Date().getFullYear(),
    
    // Base URLs (for templates)
    baseUrl: emailUrls.dashboard.replace('/dashboard', ''),
    dashboardUrl: emailUrls.dashboard,
    loginUrl: emailUrls.login,
    
    // User-provided variables
    ...variables,
  };
  // ...
}
```

---

### **Phase 2: Real Data Integration** (Priority: HIGH)

#### 2.1 Создать Email Data Builders
```typescript
// src/lib/services/email-data-builders.ts

export async function buildOrderEmailData(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { include: { profile: true } },
      tradingPair: { include: { cryptoCurrency: true, fiatCurrency: true } },
      paymentMethod: true,
    }
  });
  
  if (!order) throw new Error('Order not found');
  
  const emailUrls = getEmailUrls();
  
  return {
    // User
    userName: order.user.profile?.firstName || order.user.email.split('@')[0],
    userEmail: order.user.email,
    
    // Order
    orderId: order.id,
    orderNumber: order.orderNumber || order.id.slice(0, 8).toUpperCase(),
    orderUrl: emailUrls.order(order.id),
    
    // Amounts
    cryptoAmount: order.cryptoAmount.toFixed(8),
    cryptoCurrency: order.tradingPair.cryptoCurrency.symbol,
    fiatAmount: order.fiatAmount.toFixed(2),
    fiatCurrency: order.tradingPair.fiatCurrency.symbol,
    exchangeRate: order.exchangeRate.toFixed(2),
    fee: order.fee.toFixed(2),
    totalAmount: order.totalAmount.toFixed(2),
    
    // Payment
    walletAddress: order.walletAddress,
    paymentMethod: order.paymentMethod?.name || 'Bank Transfer',
    
    // Bank details (if available)
    bankDetails: order.paymentMethod ? {
      bankName: order.paymentMethod.bankName || '',
      accountNumber: order.paymentMethod.accountNumber || '',
      iban: order.paymentMethod.iban || '',
      swift: order.paymentMethod.swift || '',
      reference: order.orderNumber || order.id,
    } : undefined,
    
    // Timing
    expiresAt: order.expiresAt ? formatDate(order.expiresAt) : '24 hours',
    createdAt: formatDate(order.createdAt),
  };
}

export async function buildKycEmailData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, kycVerification: true }
  });
  
  if (!user) throw new Error('User not found');
  
  const emailUrls = getEmailUrls();
  
  return {
    userName: user.profile?.firstName || user.email.split('@')[0],
    userEmail: user.email,
    kycLevel: user.kycVerification?.level || 'BASIC',
    kycSessionId: user.kycVerification?.sessionId || '',
    approvedAt: user.kycVerification?.approvedAt ? formatDate(user.kycVerification.approvedAt) : '',
    dashboardUrl: emailUrls.dashboard,
    kycUrl: emailUrls.kyc,
    buyUrl: emailUrls.buy,
  };
}

export async function buildWelcomeEmailData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true }
  });
  
  if (!user) throw new Error('User not found');
  
  const emailUrls = getEmailUrls();
  
  return {
    userName: user.profile?.firstName || user.email.split('@')[0],
    userEmail: user.email,
    loginUrl: emailUrls.login,
    dashboardUrl: emailUrls.dashboard,
    kycUrl: emailUrls.kyc,
    profileUrl: emailUrls.profile,
  };
}

export async function buildPasswordResetEmailData(userId: string, resetToken: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true }
  });
  
  if (!user) throw new Error('User not found');
  
  const emailUrls = getEmailUrls();
  
  return {
    userName: user.profile?.firstName || user.email.split('@')[0],
    userEmail: user.email,
    resetUrl: emailUrls.resetPassword(resetToken),
    expiresIn: '1 hour',
  };
}

export async function buildAdminInviteEmailData(adminId: string, setupToken: string) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId }
  });
  
  if (!admin) throw new Error('Admin not found');
  
  const emailUrls = getEmailUrls();
  
  return {
    adminName: admin.firstName || admin.workEmail.split('@')[0],
    adminEmail: admin.workEmail,
    setupUrl: emailUrls.adminSetupPasskey(setupToken),
    expiresIn: '15 minutes',
    role: admin.role,
  };
}
```

#### 2.2 Обновить NotificationService
```typescript
// src/lib/services/notification.service.ts
import { buildOrderEmailData, buildKycEmailData, buildWelcomeEmailData } from './email-data-builders';

async queueNotification(options: QueueNotificationOptions) {
  // ...
  
  // Build real data based on event type
  let emailData = options.data;
  
  if (options.eventKey === 'ORDER_CREATED' && options.data.orderId) {
    emailData = await buildOrderEmailData(options.data.orderId);
  } else if (options.eventKey === 'KYC_APPROVED' && options.userId) {
    emailData = await buildKycEmailData(options.userId);
  } else if (options.eventKey === 'WELCOME_EMAIL' && options.userId) {
    emailData = await buildWelcomeEmailData(options.userId);
  }
  // ... other event types
  
  // Queue with real data
  await prisma.notificationQueue.create({
    data: {
      eventKey: options.eventKey,
      userId: options.userId,
      recipientEmail: options.recipientEmail,
      channel: options.channel,
      subject: options.subject,
      message: options.message,
      data: emailData, // ✅ Real data
      templateKey: options.templateKey,
      // ...
    }
  });
}
```

---

### **Phase 3: New Email Templates** (Priority: MEDIUM)

#### 3.1 Добавить недостающие шаблоны в presets.json
```json
[
  // ... existing templates
  {
    "key": "KYC_REJECTED",
    "name": "KYC Rejected",
    "description": "KYC verification rejected",
    "category": "COMPLIANCE",
    "subject": "KYC Verification Update - {{brandName}}",
    "preheader": "Your identity verification requires attention",
    "layout": "default",
    "variables": ["userName", "reason", "kycUrl", "supportEmail"],
    "bodyContent": "..."
  },
  {
    "key": "ORDER_CANCELLED",
    "name": "Order Cancelled",
    "description": "Order cancellation confirmation",
    "category": "TRANSACTIONAL",
    "subject": "Order #{{orderId}} Cancelled - {{brandName}}",
    "preheader": "Your order has been cancelled",
    "layout": "default",
    "variables": ["orderId", "userName", "reason", "dashboardUrl"],
    "bodyContent": "..."
  },
  {
    "key": "EMAIL_VERIFICATION",
    "name": "Email Verification",
    "description": "Email address verification",
    "category": "SYSTEM",
    "subject": "Verify Your Email - {{brandName}}",
    "preheader": "Please confirm your email address",
    "layout": "default",
    "variables": ["userName", "verifyUrl", "expiresIn"],
    "bodyContent": "..."
  },
  {
    "key": "ADMIN_INVITED",
    "name": "Admin Invitation",
    "description": "Admin user invitation",
    "category": "SYSTEM",
    "subject": "You've Been Invited to {{brandName}} Admin Panel",
    "preheader": "Set up your admin account",
    "layout": "default",
    "variables": ["adminName", "setupUrl", "expiresIn", "role"],
    "bodyContent": "..."
  }
]
```

#### 3.2 Создать HTML контент для новых шаблонов
- **KYC_REJECTED**: Объяснение причины, ссылка на повторную подачу
- **ORDER_CANCELLED**: Детали отмены, возврат средств (если применимо)
- **EMAIL_VERIFICATION**: Кнопка подтверждения, срок действия ссылки
- **ADMIN_INVITED**: Инструкции по настройке Passkey, роль, срок действия

---

### **Phase 4: Environment Variables** (Priority: HIGH)

#### 4.1 Добавить в .env
```bash
# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Dev
# NEXT_PUBLIC_APP_URL=https://exchange.apricode.io  # Prod

# Email Settings
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@apricode.io

# Vercel Blob (for logo uploads in production)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

#### 4.2 Обновить .env.example
```bash
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com

# File Storage (Production only)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

---

### **Phase 5: Testing & Validation** (Priority: HIGH)

#### 5.1 Тестовые сценарии
1. **Order Created Email**
   - Создать реальный заказ
   - Проверить все URL (orderUrl, dashboardUrl)
   - Проверить изображения (brandLogo)
   - Проверить реальные данные (amounts, currencies)

2. **KYC Approved Email**
   - Одобрить KYC
   - Проверить ссылки (dashboardUrl, buyUrl)
   - Проверить данные пользователя

3. **Welcome Email**
   - Зарегистрировать нового пользователя
   - Проверить все onboarding ссылки

4. **Admin Invite Email**
   - Пригласить админа
   - Проверить setupUrl с токеном
   - Проверить срок действия (15 минут)

#### 5.2 Создать E2E тесты
```typescript
// tests/email/order-created.test.ts
describe('ORDER_CREATED Email', () => {
  it('should send email with correct URLs', async () => {
    const order = await createTestOrder();
    const emailData = await buildOrderEmailData(order.id);
    
    expect(emailData.orderUrl).toContain(process.env.NEXT_PUBLIC_APP_URL);
    expect(emailData.brandLogo).toContain('http');
    expect(emailData.cryptoAmount).toBeDefined();
  });
});
```

---

### **Phase 6: UI Improvements** (Priority: LOW)

#### 6.1 Email Template Editor
- ✅ Добавить превью с реальными данными
- ✅ Показывать все доступные переменные
- ✅ Валидация URL переменных

#### 6.2 Test Email Page
- ✅ Выбор реального Order/User для тестирования
- ✅ Превью с подстановкой реальных данных
- ✅ Отправка на тестовый email

---

## 📊 Приоритизация

### **Must Have (Week 1)**
1. ✅ URL Management (Phase 1)
2. ✅ Real Data Integration (Phase 2)
3. ✅ Environment Variables (Phase 4)
4. ✅ Basic Testing (Phase 5.1)

### **Should Have (Week 2)**
1. ✅ New Templates: KYC_REJECTED, ORDER_CANCELLED, EMAIL_VERIFICATION (Phase 3)
2. ✅ E2E Tests (Phase 5.2)
3. ✅ Admin Invite Email

### **Nice to Have (Week 3)**
1. ✅ UI Improvements (Phase 6)
2. ✅ Additional templates (SECURITY_ALERT, PAYMENT_FAILED)
3. ✅ Email analytics (open rate, click rate)

---

## 🚀 Implementation Steps

### Step 1: Setup (30 min)
- [ ] Добавить `NEXT_PUBLIC_APP_URL` в `.env`
- [ ] Обновить `src/lib/config.ts`
- [ ] Создать `src/lib/utils/email-urls.ts`

### Step 2: Data Builders (2 hours)
- [ ] Создать `src/lib/services/email-data-builders.ts`
- [ ] Реализовать `buildOrderEmailData`
- [ ] Реализовать `buildKycEmailData`
- [ ] Реализовать `buildWelcomeEmailData`
- [ ] Реализовать `buildPasswordResetEmailData`
- [ ] Реализовать `buildAdminInviteEmailData`

### Step 3: Integration (1 hour)
- [ ] Обновить `EmailTemplateService.render()`
- [ ] Обновить `NotificationService.queueNotification()`
- [ ] Обновить `email-notification.service.ts`

### Step 4: New Templates (3 hours)
- [ ] Создать HTML для KYC_REJECTED
- [ ] Создать HTML для ORDER_CANCELLED
- [ ] Создать HTML для EMAIL_VERIFICATION
- [ ] Создать HTML для ADMIN_INVITED
- [ ] Обновить `presets.json`
- [ ] Обновить seed

### Step 5: Testing (2 hours)
- [ ] Тест ORDER_CREATED с реальным заказом
- [ ] Тест KYC_APPROVED с реальным пользователем
- [ ] Тест WELCOME_EMAIL при регистрации
- [ ] Тест ADMIN_INVITED при приглашении
- [ ] Проверить все URL и изображения

### Step 6: Documentation (30 min)
- [ ] Обновить README
- [ ] Обновить RESEND_INTEGRATION_GUIDE.md
- [ ] Создать EMAIL_VARIABLES.md

---

## 📝 Notes

### URL Strategy
- **Development**: `http://localhost:3000`
- **Staging**: `https://staging.apricode.io`
- **Production**: `https://exchange.apricode.io`

### Image Strategy
- **Development**: `/uploads/logo.svg` → `http://localhost:3000/uploads/logo.svg`
- **Production**: Vercel Blob → `https://xyz.public.blob.vercel-storage.com/logo.svg`

### Variable Naming Convention
- **User URLs**: `dashboardUrl`, `profileUrl`, `orderUrl`
- **Auth URLs**: `loginUrl`, `resetUrl`, `verifyUrl`
- **Admin URLs**: `adminDashboard`, `setupUrl`
- **Assets**: `brandLogo`, `ogImage`

---

## ✅ Success Criteria

1. ✅ Все email содержат абсолютные URL
2. ✅ Все изображения загружаются в email клиентах
3. ✅ Кнопки ведут на правильные страницы
4. ✅ Реальные данные подставляются из БД
5. ✅ Работает в dev (localhost) и prod (domain)
6. ✅ Все 10+ шаблонов покрывают user journey
7. ✅ Email валидны на 100% (проверка через Litmus/Email on Acid)

---

**Estimated Time**: 8-10 hours
**Priority**: HIGH
**Complexity**: MEDIUM

