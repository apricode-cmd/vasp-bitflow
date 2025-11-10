# Resend Email Integration Guide

## 📧 Overview

Resend интегрирован как модуль через **IntegrationFactory** с поддержкой:
- ✅ White-label email templates
- ✅ Variable substitution
- ✅ Email logging
- ✅ Multiple provider support (easy to add SendGrid, AWS SES, etc.)
- ✅ Automatic failover (если добавить fallback provider)

---

## 🏗️ Architecture

### Integration Flow

```
EventEmitter
    ↓
NotificationService
    ↓
EmailNotificationService
    ↓
IntegrationFactory.getEmailProvider()
    ↓
ResendAdapter (implements IEmailProvider)
    ↓
Resend SDK
```

### Key Components

1. **ResendAdapter** (`src/lib/integrations/providers/email/ResendAdapter.ts`)
   - Implements `IEmailProvider` interface
   - Wraps Resend SDK
   - Registered in `IntegrationRegistry`

2. **EmailNotificationService** (`src/lib/services/email-notification.service.ts`)
   - Uses `IntegrationFactory.getEmailProvider()`
   - Renders templates via `EmailTemplateService`
   - Logs emails to `EmailLog`

3. **EmailTemplateService** (`src/lib/services/email-template.service.ts`)
   - Renders templates with white-label branding
   - Variable substitution (`{{variableName}}`)
   - Fallback to default templates

---

## ⚙️ Configuration

### 1. Environment Variables

```env
# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx

# From Email (must be verified domain)
EMAIL_FROM=noreply@yourdomain.com
```

### 2. Database Configuration

Resend настройки хранятся в таблице `Integration`:

```sql
INSERT INTO "Integration" (service, isEnabled, status, config)
VALUES (
  'resend',
  true,
  'active',
  '{"apiKey": "re_xxx", "fromEmail": "noreply@yourdomain.com"}'::jsonb
);
```

**Или через seed:**

```typescript
// prisma/seed.ts
{
  service: 'resend',
  isEnabled: true,
  status: 'active',
  config: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.EMAIL_FROM
  }
}
```

### 3. Verify Domain in Resend

1. Go to https://resend.com/domains
2. Add your domain
3. Add DNS records (SPF, DKIM, DMARC)
4. Wait for verification (usually 5-10 minutes)

---

## 🚀 Usage

### 1. Send Email via Event (Recommended)

```typescript
import { eventEmitter } from '@/lib/services/event-emitter.service';

// Emit event - automatically sends email + in-app notification
await eventEmitter.emit('ORDER_CREATED', {
  userId: 'user123',
  orderId: 'order456',
  amount: 100,
  currency: 'EUR',
});
```

**What happens:**
1. Event emitted
2. NotificationService checks user preferences
3. Queues EMAIL + IN_APP notifications
4. EmailNotificationService renders template with white-label branding
5. IntegrationFactory gets Resend provider
6. Email sent via Resend SDK
7. Email logged to database

### 2. Send Email Directly

```typescript
import { sendNotificationEmail } from '@/lib/services/email-notification.service';

await sendNotificationEmail({
  to: 'user@example.com',
  templateKey: 'ORDER_CREATED',
  data: {
    userId: 'user123',
    orderId: 'order456',
    amount: 100,
    currency: 'EUR',
    actionUrl: '/orders/order456',
  },
});
```

### 3. Send Custom Email (No Template)

```typescript
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';

const emailProvider = await integrationFactory.getEmailProvider();

await emailProvider.sendEmail({
  to: 'user@example.com',
  subject: 'Custom Email',
  html: '<h1>Hello!</h1>',
  text: 'Hello!',
});
```

---

## 📝 Email Templates

### Available Templates

1. **ORDER_CREATED** - Order creation confirmation
2. **ORDER_COMPLETED** - Order completion with transaction hash
3. **KYC_APPROVED** - KYC approval notification
4. **KYC_REJECTED** - KYC rejection with reason
5. **GENERIC** - Generic notification template

### Template Variables

All templates automatically include white-label variables:
- `{{platformName}}` - from SystemSettings.brandName
- `{{brandLogo}}` - from SystemSettings.brandLogo
- `{{primaryColor}}` - from SystemSettings.primaryColor
- `{{supportEmail}}` - from SystemSettings.supportEmail
- `{{supportPhone}}` - from SystemSettings.supportPhone
- `{{currentYear}}` - Current year

**Event-specific variables:**
```typescript
// ORDER_CREATED
{
  orderId: 'order456',
  amount: 100,
  currency: 'EUR',
  actionUrl: '/orders/order456'
}

// ORDER_COMPLETED
{
  orderId: 'order456',
  cryptoAmount: 0.5,
  cryptoCurrency: 'BTC',
  walletAddress: 'bc1q...',
  txHash: '0x...',
  actionUrl: '/orders/order456'
}

// KYC_APPROVED
{
  kycSessionId: 'kyc123',
  actionUrl: '/buy'
}

// KYC_REJECTED
{
  kycSessionId: 'kyc123',
  reason: 'Invalid document',
  actionUrl: '/kyc'
}
```

### Create Custom Template

```typescript
import { emailTemplateService } from '@/lib/services/email-template.service';

await emailTemplateService.upsertTemplate({
  key: 'PAYMENT_FAILED',
  name: 'Payment Failed Email',
  category: 'TRANSACTIONAL',
  subject: 'Payment Failed - {{platformName}}',
  htmlContent: `
    <h1>Payment Failed</h1>
    <p>Your payment for order #{{orderId}} has failed.</p>
    <p>Reason: {{reason}}</p>
    <a href="{{actionUrl}}">Try Again</a>
  `,
  textContent: 'Payment Failed\n\nYour payment for order #{{orderId}} has failed.\n\nReason: {{reason}}',
  variables: ['orderId', 'reason', 'actionUrl'],
  orgId: null, // global template
  createdBy: 'admin123',
});
```

---

## 🔧 Testing

### Test Resend Connection

```bash
# In admin panel: Integrations → Resend → Test Connection
```

**Or via API:**

```typescript
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';

const emailProvider = await integrationFactory.getEmailProvider();
const result = await emailProvider.test();

console.log(result);
// { success: true, message: 'Resend connection successful', timestamp: ... }
```

### Test Email Sending

```typescript
import { sendNotificationEmail } from '@/lib/services/email-notification.service';

const result = await sendNotificationEmail({
  to: 'test@example.com',
  templateKey: 'ORDER_CREATED',
  data: {
    orderId: 'TEST123',
    amount: 100,
    currency: 'EUR',
    actionUrl: '/orders/TEST123',
  },
});

console.log(result);
// { success: true, messageId: 'xxx-xxx-xxx' }
```

---

## 📊 Monitoring

### Email Logs

All emails are logged to `EmailLog` table:

```sql
SELECT * FROM "EmailLog"
WHERE status = 'FAILED'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Check Email Stats

```typescript
import { prisma } from '@/lib/prisma';

// Total emails sent today
const sentToday = await prisma.emailLog.count({
  where: {
    status: 'SENT',
    sentAt: {
      gte: new Date(new Date().setHours(0, 0, 0, 0))
    }
  }
});

// Failed emails
const failed = await prisma.emailLog.count({
  where: {
    status: 'FAILED'
  }
});

console.log({ sentToday, failed });
```

---

## 🔄 Adding Another Email Provider

### 1. Create Adapter

```typescript
// src/lib/integrations/providers/email/SendGridAdapter.ts
import { IEmailProvider } from '../../categories/IEmailProvider';

export class SendGridAdapter implements IEmailProvider {
  public readonly providerId = 'sendgrid';
  public readonly category = IntegrationCategory.EMAIL;

  async initialize(config: BaseIntegrationConfig) {
    // Initialize SendGrid client
  }

  async sendEmail(params: EmailParams) {
    // Send via SendGrid
  }

  async test() {
    // Test connection
  }

  // ... other methods
}

export const sendGridAdapter = new SendGridAdapter();
```

### 2. Register in IntegrationRegistry

```typescript
// src/lib/integrations/IntegrationRegistry.ts
import { sendGridAdapter } from './providers/email/SendGridAdapter';

this.register({
  providerId: 'sendgrid',
  category: IntegrationCategory.EMAIL,
  displayName: 'SendGrid',
  description: 'Email delivery service by Twilio',
  icon: '📧',
  documentationUrl: 'https://sendgrid.com/docs',
  instance: sendGridAdapter
});
```

### 3. Add to Database

```sql
INSERT INTO "Integration" (service, isEnabled, status, config)
VALUES (
  'sendgrid',
  false,  -- disabled by default
  'inactive',
  '{"apiKey": "SG.xxx"}'::jsonb
);
```

### 4. Switch Provider

В админ-панели: **Integrations → SendGrid → Enable**

Система автоматически переключится на SendGrid для всех email отправок.

---

## 🚨 Troubleshooting

### Email Not Sending

1. **Check Integration Status**
   ```sql
   SELECT * FROM "Integration" WHERE service = 'resend';
   ```
   - `isEnabled` должен быть `true`
   - `status` должен быть `'active'`

2. **Check API Key**
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"from":"onboarding@resend.dev","to":"delivered@resend.dev","subject":"Test","html":"<p>Test</p>"}'
   ```

3. **Check Domain Verification**
   - Go to https://resend.com/domains
   - Ensure domain is verified

4. **Check Email Logs**
   ```sql
   SELECT * FROM "EmailLog"
   WHERE status = 'FAILED'
   ORDER BY "createdAt" DESC
   LIMIT 10;
   ```

### Rate Limiting

Resend free tier: **100 emails/day**

For production:
1. Upgrade Resend plan
2. Or add fallback provider (SendGrid, AWS SES)

---

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Node.js SDK](https://github.com/resendlabs/resend-node)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Domain Verification Guide](https://resend.com/docs/dashboard/domains/introduction)

---

## ✅ Checklist

### Production Deployment

- [ ] Get Resend API key from https://resend.com/api-keys
- [ ] Verify domain in Resend dashboard
- [ ] Add environment variables (`RESEND_API_KEY`, `EMAIL_FROM`)
- [ ] Update database configuration
- [ ] Test email sending
- [ ] Monitor email logs
- [ ] Set up alerts for failed emails
- [ ] Consider adding fallback provider

---

**Status:** Fully Integrated ✅  
**Updated:** 2025-11-10

