# 🔍 Notification & Email System - Comprehensive Audit

**Дата:** 2025-01-16  
**Версия:** 1.0  
**Статус:** ✅ Готов к production с minor fixes

---

## 📋 Executive Summary

Система уведомлений и email в проекте **Apricode Exchange CRM** представляет собой современную, многоканальную архитектуру с поддержкой white-label брендинга и асинхронной обработки.

### ✅ Сильные стороны
- **Enterprise-level архитектура** с разделением ответственности
- **Асинхронная очередь** для надежной доставки
- **White-label поддержка** для кастомизации email
- **Модульная система** провайдеров (легко добавить SendGrid, SES)
- **Автоматическая retry логика** при сбоях
- **Детальный audit trail** (EmailLog, NotificationHistory)

### ⚠️ Найденные проблемы
1. **CRITICAL**: Нет EMAIL провайдера в базе данных
2. **HIGH**: Deprecated email.ts используется в регистрации
3. **MEDIUM**: Отсутствует cron job для очереди уведомлений
4. **MEDIUM**: Нет мониторинга failed email
5. **LOW**: Отсутствует rate limiting для bulk emails

---

## 🏗️ Архитектура системы

### Компоненты и их роли

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUSINESS LOGIC                           │
│  (API Routes: /orders, /admin/orders/[id], /auth/register)     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ eventEmitter.emit('ORDER_CREATED', ...)
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                   EVENT EMITTER SERVICE                          │
│  • Генерирует notification content                              │
│  • Определяет subject, message, data                            │
│  • Передает в NotificationService                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ notificationService.send(...)
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                  NOTIFICATION SERVICE                            │
│  • Проверяет NotificationEvent в БД                             │
│  • Фильтрует по user preferences                                │
│  • Создает NotificationQueue entries                            │
│  • AUTO-PROCESS: отправляет сразу (не ждет cron)               │
│  • Создает NotificationHistory (для IN_APP)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ buildRealData() → email-data-builders
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                EMAIL NOTIFICATION SERVICE                        │
│  • Получает email provider (IntegrationFactory)                 │
│  • Рендерит email template (EmailTemplateService)               │
│  • Отправляет через provider (ResendAdapter)                    │
│  • Логирует в EmailLog                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                   INTEGRATION FACTORY                            │
│  • Загружает Integration из БД                                  │
│  • Дешифрует API key (encryption.service)                       │
│  • Инициализирует ResendAdapter                                 │
│  • Кеширует provider                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                     RESEND ADAPTER                               │
│  • Wraps Resend SDK                                             │
│  • Отправляет email через Resend API                            │
│  • Возвращает messageId                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Текущее состояние

### 1. Database Schema (✅ Отлично)

#### Таблицы
- **NotificationEvent** (17 events seeded) - конфигурация событий
- **NotificationQueue** - очередь для retry механики
- **NotificationHistory** - история для IN_APP уведомлений
- **NotificationSubscription** - user preferences
- **EmailLog** - audit trail для всех email
- **EmailTemplate** - white-label templates
- **Integration** - email provider конфигурация

#### Enums
```prisma
NotificationChannel: EMAIL | IN_APP | SMS | PUSH
EventCategory: ORDER | KYC | PAYMENT | SECURITY | SYSTEM | ADMIN | MARKETING
QueueStatus: PENDING | PROCESSING | SENT | FAILED | CANCELLED | SKIPPED
```

### 2. Seeded Events (✅ 17 events)

**ORDER (4):**
- `ORDER_CREATED` → Email + IN_APP
- `ORDER_PAYMENT_RECEIVED` → Email + IN_APP
- `ORDER_COMPLETED` → Email + IN_APP
- `ORDER_CANCELLED` → Email + IN_APP

**KYC (4):**
- `KYC_SUBMITTED` → Email + IN_APP
- `KYC_APPROVED` → Email + IN_APP
- `KYC_REJECTED` → Email + IN_APP
- `KYC_DOCUMENTS_REQUIRED` → Email + IN_APP

**PAYMENT (3):**
- `PAYMENT_PENDING` → Email + IN_APP
- `PAYMENT_CONFIRMED` → Email + IN_APP
- `PAYMENT_FAILED` → Email + IN_APP

**SECURITY (5):**
- `SECURITY_LOGIN` → Email
- `SECURITY_PASSWORD_CHANGED` → Email
- `SECURITY_2FA_ENABLED` → Email
- `SECURITY_2FA_DISABLED` → Email
- `SECURITY_SUSPICIOUS_ACTIVITY` → Email + IN_APP

**SYSTEM (1):**
- `SYSTEM_MAINTENANCE` → Email + IN_APP

### 3. Services (✅ Хорошо, но есть проблемы)

#### ✅ EmailNotificationService (`email-notification.service.ts`)
**Функциональность:**
- Отправка email с white-label templates
- Интеграция с IntegrationFactory
- Логирование в EmailLog
- Bulk email поддержка

**Статус:** ✅ Полностью реализован

#### ✅ NotificationService (`notification.service.ts`)
**Функциональность:**
- Управление NotificationQueue
- User preference filtering
- Auto-processing (не ждет cron)
- Retry логика (maxAttempts: 3)
- Quiet hours support

**Статус:** ✅ Полностью реализован

**⚠️ Проблема:**
```typescript
// Строка 196: Auto-process immediately
this.processNotification(queueEntry).catch(error => {
  console.error(`❌ Auto-process failed for ${queueEntry.id}:`, error);
});
```
- ✅ **Хорошо**: Emails отправляются сразу, не ждут cron
- ⚠️ **Плохо**: Если auto-process fail → нужен cron для retry

#### ✅ EventEmitterService (`event-emitter.service.ts`)
**Функциональность:**
- Генерация notification content
- Маппинг events → notifications
- Platform name из settings

**Статус:** ✅ Полностью реализован

#### ✅ EmailTemplateService (`email-template.service.ts`)
**Функциональность:**
- White-label branding (logo, colors)
- Variable substitution (`{{variableName}}`)
- Fallback templates
- Absolute URLs для email links

**Статус:** ✅ Полностью реализован

#### ⚠️ EmailService (`email.ts`) - DEPRECATED
**Проблема:**
```typescript
/**
 * Email Service (DEPRECATED)
 * 
 * ⚠️ DEPRECATED: Use email-notification.service.ts instead
 */
```

**Но все еще используется в:**
- `src/app/api/auth/register/route.ts` (WELCOME_EMAIL)

**Решение:** Удалить использование старого сервиса

---

## 🚨 Критические проблемы

### 1. ❌ CRITICAL: Email provider не настроен в БД

**Проблема:**
```typescript
// IntegrationFactory.getEmailProvider()
const integration = await prisma.integration.findFirst({
  where: {
    service: { in: ['resend'] },
    isEnabled: true,
    status: 'active'
  }
});

if (!integration) {
  // Fallback to first available provider (для backward compatibility)
  const provider = categoryProviders[0].instance;
  await this.initializeProvider(provider, {}); // ❌ Empty config!
  return provider;
}
```

**Воздействие:**
- Email могут НЕ отправляться (если нет fallback)
- Нет API key → ResendAdapter.isConfigured() = false
- Email логируются как FAILED

**Проверка:**
```sql
SELECT * FROM "Integration" WHERE service = 'resend';
-- Должна быть запись с isEnabled=true, apiKey (encrypted), fromEmail
```

**Решение:**
1. Добавить Resend в БД через Admin UI (`/admin/integrations`)
2. Или через SQL:
```sql
INSERT INTO "Integration" (id, name, service, category, isEnabled, status, apiKey, config)
VALUES (
  gen_random_uuid(),
  'Resend Email',
  'resend',
  'EMAIL',
  true,
  'active',
  'encrypted:...',  -- Encrypted API key
  '{"fromEmail": "noreply@yourdomain.com"}'
);
```

---

### 2. ⚠️ HIGH: Deprecated email.ts используется

**Проблема:**
```typescript
// src/app/api/auth/register/route.ts (строка ~210)
import { sendWelcomeEmail } from '@/lib/services/email'; // ❌ DEPRECATED

await sendWelcomeEmail(user.email, validatedData.firstName);
```

**Почему плохо:**
- Hardcoded HTML templates
- Нет white-label поддержки
- Нет логирования в EmailLog
- Прямой вызов Resend (обходит IntegrationFactory)

**Решение:**
```typescript
// ✅ ПРАВИЛЬНО: Использовать eventEmitter
await eventEmitter.emit('WELCOME_EMAIL', {
  userId: user.id,
  recipientEmail: user.email,
  userName: `${validatedData.firstName} ${validatedData.lastName}`,
});
```

**Где еще проверить:**
```bash
grep -r "from '@/lib/services/email'" src/app/api/
```

---

### 3. ⚠️ MEDIUM: Нет cron job для NotificationQueue

**Проблема:**
- `NotificationService.processPendingNotifications()` существует
- Но нет cron job, который вызывает этот метод

**Воздействие:**
- Если auto-process fail → email не retry
- Scheduled notifications не отправятся

**Текущее поведение:**
```typescript
// notification.service.ts: 196
// 🔥 AUTO-PROCESS: Send immediately if not scheduled for future
const isScheduledForFuture = scheduledFor && scheduledFor > new Date();
if (!isScheduledForFuture) {
  this.processNotification(queueEntry).catch(error => {
    console.error(`❌ Auto-process failed for ${queueEntry.id}:`, error);
    // ⚠️ Error logged, но НЕТ retry без cron
  });
}
```

**Решение:**
1. **Vercel Cron** (если на Vercel):
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/process-notifications",
    "schedule": "*/5 * * * *"
  }]
}
```

2. **API route**:
```typescript
// src/app/api/cron/process-notifications/route.ts
export async function GET(request: NextRequest) {
  // Проверка CRON_SECRET
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await notificationService.processPendingNotifications(100);
  
  return NextResponse.json({ success: true });
}
```

3. **Альтернатива**: Node-cron (если self-hosted)

---

### 4. ⚠️ MEDIUM: Нет мониторинга failed emails

**Проблема:**
- EmailLog хранит FAILED emails
- Но нет UI/алерта для админов

**Решение:**
1. **Admin Dashboard widget**:
```typescript
// GET /api/admin/email-logs/failed-summary
const failedToday = await prisma.emailLog.count({
  where: {
    status: 'FAILED',
    createdAt: { gte: new Date(Date.now() - 24*60*60*1000) }
  }
});
```

2. **Alert через Slack/Email**:
```typescript
// В cron job
if (failedToday > 10) {
  await sendAlertToAdmin(`⚠️ ${failedToday} emails failed today`);
}
```

---

### 5. ⚠️ LOW: Нет rate limiting для bulk emails

**Проблема:**
```typescript
// email-notification.service.ts: 144
for (const email of recipients) {
  await sendNotificationEmail({ ...options, to: email });
  
  // ⚠️ Только 100ms между emails
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

**Риски:**
- Resend rate limits (100 emails/sec)
- Может привести к ban

**Решение:**
```typescript
// Использовать Resend batch API
const { data, error } = await resend.batch.send(emailsArray);
```

---

## 🔧 Рекомендации по улучшению

### Priority 1: Critical Fixes (1-2 часа)

#### 1.1 Настроить Email Provider
```sql
-- Проверить Integration таблицу
SELECT * FROM "Integration" WHERE category = 'EMAIL';

-- Если нет записи → добавить через Admin UI или SQL
```

#### 1.2 Удалить использование deprecated email.ts
```typescript
// src/app/api/auth/register/route.ts
- import { sendWelcomeEmail } from '@/lib/services/email';
- await sendWelcomeEmail(user.email, validatedData.firstName);

+ await eventEmitter.emit('WELCOME_EMAIL', {
+   userId: user.id,
+   recipientEmail: user.email,
+   userName: `${validatedData.firstName} ${validatedData.lastName}`,
+ });
```

---

### Priority 2: Production Readiness (3-4 часа)

#### 2.1 Добавить Cron Job
- Создать `/api/cron/process-notifications/route.ts`
- Настроить Vercel Cron (или node-cron)
- Добавить CRON_SECRET в ENV

#### 2.2 Email Monitoring Dashboard
- Widget на Admin Dashboard
- Failed emails за last 24h
- Retry статистика

#### 2.3 Health Check для Email
```typescript
// src/app/api/health/route.ts (уже существует)
async function checkEmail(): Promise<ServiceHealth> {
  try {
    const emailProvider = await integrationFactory.getEmailProvider();
    if (!emailProvider) {
      return { status: 'error', message: 'No email provider configured' };
    }

    const testResult = await emailProvider.test();
    
    return {
      status: testResult.success ? 'ok' : 'error',
      message: testResult.message,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
```

---

### Priority 3: Enhancements (Optional, 2-3 дня)

#### 3.1 Batch Email API
```typescript
// Использовать Resend batch
async sendBulkEmails(emails: EmailParams[]): Promise<{...}> {
  if (!this.client) throw new Error('Not configured');
  
  const { data, error } = await this.client.batch.send(
    emails.map(e => ({
      from: this.config.fromEmail,
      to: e.to,
      subject: e.subject,
      html: e.html
    }))
  );
  
  return { sent: data?.length || 0, results: data };
}
```

#### 3.2 Email Template Editor
- Rich text editor в Admin UI
- Live preview
- Test send button

#### 3.3 Advanced Analytics
- Open rate tracking (Resend webhooks)
- Click tracking
- Bounce handling

#### 3.4 Multi-language Support
```typescript
// EmailTemplateService
async render(options: RenderOptions & { locale?: string }) {
  const template = await this.getTemplate(
    options.templateKey, 
    options.orgId, 
    options.locale // 'en' | 'ru' | 'pl'
  );
}
```

---

## ✅ Что уже работает отлично

### 1. Auto-Processing (✅)
```typescript
// notification.service.ts: 193-200
// Emails отправляются СРАЗУ, не ждут cron
if (!isScheduledForFuture) {
  this.processNotification(queueEntry).catch(error => {
    console.error(`❌ Auto-process failed`, error);
  });
}
```

**Benefit:** Instant delivery для критических уведомлений

### 2. Real Data Builders (✅)
```typescript
// email-data-builders.ts
export async function buildOrderEmailData(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { include: { profile: true } },
      currency: true,
      fiatCurrency: true,
      paymentMethod: { include: { paymentAccount: true } }
    }
  });
  
  return {
    orderId: order.id,
    userName: `${order.user.profile?.firstName} ${order.user.profile?.lastName}`,
    amount: order.cryptoAmount.toFixed(8),
    currency: order.currency.code,
    // ... все данные из БД
  };
}
```

**Benefit:** Email содержат актуальные данные из БД, не hardcoded

### 3. White-Label Support (✅)
```typescript
// email-template.service.ts
const settings = await getPublicSettings();

const allVariables = {
  brandName: settings.brandName || 'Apricode Exchange',
  brandLogo: emailUrls.logo(settings.brandLogo),
  primaryColor: settings.primaryColor || '#06b6d4',
  supportEmail: settings.supportEmail,
  // ...
};
```

**Benefit:** Email автоматически брендируются

### 4. Retry Mechanism (✅)
```typescript
// notification.service.ts
data: {
  attempts: { increment: 1 },
  maxAttempts: 3
}

if (updatedNotification.attempts >= updatedNotification.maxAttempts) {
  // Mark as FAILED
} else {
  // Reset to PENDING for retry
}
```

**Benefit:** Надежная доставка

### 5. Audit Trail (✅)
- **EmailLog**: Каждый email (SENT/FAILED)
- **NotificationHistory**: In-app уведомления
- **NotificationQueue**: Очередь с attempts

**Benefit:** Полная прозрачность

---

## 📋 Checklist для Production

### Pre-Deployment

- [ ] **CRITICAL**: Проверить Integration для Resend в БД
- [ ] **CRITICAL**: Проверить RESEND_API_KEY и EMAIL_FROM в ENV
- [ ] **HIGH**: Заменить deprecated email.ts на eventEmitter
- [ ] **MEDIUM**: Настроить cron job для retry
- [ ] **MEDIUM**: Добавить monitoring для failed emails
- [ ] **LOW**: Проверить rate limiting

### Testing Checklist

#### Email Flow Test
```bash
# 1. Register new user
POST /api/auth/register
# ✅ Check: WELCOME_EMAIL sent

# 2. Create order
POST /api/orders
# ✅ Check: ORDER_CREATED email sent

# 3. Update order status (admin)
PATCH /api/admin/orders/[id]
# ✅ Check: ORDER_COMPLETED email sent

# 4. Check EmailLog
SELECT * FROM "EmailLog" ORDER BY "createdAt" DESC LIMIT 10;
# ✅ Все emails status = 'SENT'
```

#### Integration Test
```bash
# Test email provider connection
GET /api/health
# ✅ email.status = 'ok'

# Test send email (admin)
POST /api/admin/test-email
# ✅ Email received
```

#### Notification Queue Test
```sql
-- Check pending notifications
SELECT * FROM "NotificationQueue" WHERE status = 'PENDING';

-- Check failed notifications
SELECT * FROM "NotificationQueue" WHERE status = 'FAILED';

-- Check attempts
SELECT eventKey, AVG(attempts) as avg_attempts
FROM "NotificationQueue"
GROUP BY eventKey;
```

---

## 📊 Performance Metrics

### Current Configuration
- **Auto-process**: Instant (не ждет cron)
- **Retry attempts**: 3
- **Timeout**: N/A (зависит от Resend)
- **Bulk rate limit**: 100ms между emails
- **Queue processing**: N/A (нет cron пока)

### Recommended Metrics
```typescript
// Monitor in production:
const metrics = {
  emailsSentLast24h: await countEmails('SENT', 24),
  emailsFailedLast24h: await countEmails('FAILED', 24),
  averageRetries: await avgRetries(),
  queueLength: await countPending(),
  averageProcessingTime: await avgProcessingTime()
};
```

---

## 🔐 Security Considerations

### ✅ Хорошо
1. **API keys encrypted** в БД (encryption.service)
2. **Email validation** через Zod schemas
3. **User preference filtering** (нельзя спамить)
4. **Audit logging** (кто, когда, что)

### ⚠️ Улучшить
1. **Rate limiting** для bulk emails
2. **Webhook verification** для Resend webhooks
3. **CRON_SECRET** для cron endpoints

---

## 📝 Environment Variables Required

```bash
# Email Provider (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# Cron Job (optional, но рекомендуется)
CRON_SECRET=random_secret_for_cron_endpoints

# Database (уже есть)
DATABASE_URL=postgresql://...

# Encryption (для API keys в БД)
ENCRYPTION_KEY=32_byte_hex_key
```

---

## 🎯 Roadmap

### Q1 2025 (Current Phase)
- [x] Core notification system
- [x] Email provider integration
- [x] White-label templates
- [ ] Cron job для retry
- [ ] Admin monitoring dashboard

### Q2 2025 (Future)
- [ ] SMS integration (Twilio)
- [ ] Push notifications (Firebase)
- [ ] Multi-language templates
- [ ] Advanced analytics (open/click rates)
- [ ] Webhook от Resend (bounces, complaints)

### Q3 2025 (Advanced)
- [ ] A/B testing для templates
- [ ] Smart send time optimization
- [ ] Personalization engine
- [ ] Unsubscribe management

---

## 📚 Key Files Reference

### Services
```
src/lib/services/
├── notification.service.ts       # Main notification orchestrator
├── event-emitter.service.ts      # Event → Notification mapping
├── email-notification.service.ts # Email sending with templates
├── email-template.service.ts     # Template rendering
├── email-data-builders.ts        # Real data from DB
├── email.ts                      # ❌ DEPRECATED
└── encryption.service.ts         # API key encryption
```

### Integrations
```
src/lib/integrations/
├── IntegrationFactory.ts                 # Provider factory
├── IntegrationRegistry.ts                # Provider registry
├── providers/email/ResendAdapter.ts      # Resend wrapper
└── categories/IEmailProvider.ts          # Email interface
```

### API Routes (где вызывается)
```
src/app/api/
├── orders/route.ts                       # ORDER_CREATED
├── admin/orders/[id]/route.ts            # ORDER_COMPLETED, etc.
├── auth/register/route.ts                # WELCOME_EMAIL (⚠️ old)
├── admin/kyc/[id]/route.ts               # KYC_APPROVED/REJECTED
└── kyc/webhook/route.ts                  # KYC webhooks
```

### Database Schema
```
prisma/schema.prisma
├── NotificationEvent (17 events)
├── NotificationQueue (retry queue)
├── NotificationHistory (in-app)
├── NotificationSubscription (user prefs)
├── EmailLog (audit trail)
├── EmailTemplate (white-label)
└── Integration (provider config)
```

---

## 🚀 Deployment Commands

```bash
# 1. Check Integration database
npx prisma studio
# Navigate to Integration table
# Ensure 'resend' exists with isEnabled=true

# 2. Build project
npm run build

# 3. Run migrations (production)
npx prisma migrate deploy

# 4. Verify email provider
curl https://yourdomain.com/api/health | jq '.email'

# 5. Test send email
curl -X POST https://yourdomain.com/api/admin/test-email \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com"}'

# 6. Monitor logs
tail -f /var/log/app/notifications.log
# Watch for: ✅ Email sent, ❌ Email failed
```

---

## 📞 Support & Troubleshooting

### Issue: Emails не отправляются

**1. Проверить Integration**
```sql
SELECT * FROM "Integration" WHERE service = 'resend';
```
- Должна быть запись
- `isEnabled = true`
- `apiKey` (encrypted)
- `config.fromEmail`

**2. Проверить EmailLog**
```sql
SELECT status, error, COUNT(*)
FROM "EmailLog"
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
GROUP BY status, error;
```

**3. Проверить Health Check**
```bash
curl https://yourdomain.com/api/health | jq '.email'
```

**4. Проверить Resend Dashboard**
- https://resend.com/emails
- Проверить API key validity
- Проверить domain verification

### Issue: Emails delayed

**1. Проверить NotificationQueue**
```sql
SELECT status, COUNT(*), MAX(attempts)
FROM "NotificationQueue"
WHERE status IN ('PENDING', 'PROCESSING')
GROUP BY status;
```

**2. Проверить Cron Job**
```bash
# Если на Vercel
vercel logs --since=1h | grep "process-notifications"
```

### Issue: Failed emails

**1. Проверить error details**
```sql
SELECT "eventKey", "error", "errorDetails", COUNT(*)
FROM "NotificationQueue"
WHERE status = 'FAILED'
GROUP BY "eventKey", "error", "errorDetails"
ORDER BY COUNT(*) DESC;
```

**2. Common errors:**
- `"No email provider configured"` → Нет Integration
- `"Resend API error: Invalid API key"` → Неверный RESEND_API_KEY
- `"No recipient email available"` → User без email

---

## ✅ Conclusion

**Система готова к production с minor fixes:**

### Must Fix (Critical):
1. ✅ Проверить/добавить Resend Integration в БД
2. ✅ Заменить deprecated email.ts

### Should Fix (High Priority):
3. ✅ Добавить cron job для retry
4. ✅ Добавить monitoring dashboard

### Nice to Have:
5. Rate limiting для bulk emails
6. Advanced analytics
7. Multi-language support

**Estimated time:** 4-6 hours для Critical + High Priority fixes

**После этого:** Полностью production-ready система с enterprise-level архитектурой! 🚀

---

**Автор:** AI Assistant  
**Последнее обновление:** 2025-01-16

