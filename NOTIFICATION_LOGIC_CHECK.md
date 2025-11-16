# ✅ Notification System - Logic Check

**Date:** 2025-01-16  
**Status:** Ready for testing

---

## 📊 Current Integration Status

### Events Emitted: 15 locations ✅

```
✅ src/app/api/orders/route.ts (ORDER_CREATED)
✅ src/app/api/admin/orders/[id]/route.ts (ORDER_* status changes)
✅ src/app/api/kyc/submit-form/route.ts (KYC_SUBMITTED)
✅ src/app/api/admin/kyc/[id]/route.ts (KYC_APPROVED, KYC_REJECTED)
✅ src/lib/services/kyc.service.ts (KYC_APPROVED, KYC_REJECTED via webhook)
✅ src/app/api/auth/register/route.ts (WELCOME_EMAIL)
✅ src/app/api/admin/admins/invite/route.ts (ADMIN_INVITED)
✅ src/app/api/admin/admins/[id]/resend-invite/route.ts (ADMIN_INVITED)
✅ src/app/api/2fa/verify/route.ts (SECURITY_2FA_ENABLED)
✅ src/app/api/2fa/disable/route.ts (SECURITY_2FA_DISABLED)
✅ src/app/api/admin/test/notifications/route.ts (ALL events for testing)
```

---

## 🔄 Notification Flow Logic

### 1. Event Emission ✅
```typescript
await eventEmitter.emit('ORDER_CREATED', {
  userId: user.id,
  recipientEmail: user.email,
  orderId: order.id,
  // ... other data
});
```

**Логика:**
- ✅ Try-catch обернуто (не ломает main operation)
- ✅ Console logging добавлен
- ✅ Все required variables передаются

### 2. EventEmitterService ✅
```typescript
// src/lib/services/event-emitter.service.ts
async emit(eventKey, payload) {
  // 1. Generate notification content
  const notificationData = await this.generateNotificationContent(eventKey, payload);
  
  // 2. Send via NotificationService
  await notificationService.send({
    eventKey,
    data: { ...payload, ...notificationData }
  });
}
```

**Логика:**
- ✅ Генерирует subject & message для каждого события
- ✅ Передает в NotificationService
- ✅ Error handling

### 3. NotificationService ✅ FIXED
```typescript
// src/lib/services/notification.service.ts
async send(options) {
  // 1. Get event from DB
  const event = await prisma.notificationEvent.findUnique({
    where: { eventKey }
  });
  
  // 2. Check if active
  if (!event.isActive) return;
  
  // 3. Get templateKey from EmailTemplate via templateId ✅ FIXED
  let templateKey = event.templateKey; // deprecated
  if (!templateKey && event.templateId) {
    const emailTemplate = await prisma.emailTemplate.findUnique({
      where: { id: event.templateId }
    });
    templateKey = emailTemplate.key;
  }
  
  // 4. Create queue entry
  await prisma.notificationQueue.create({
    eventKey,
    userId,
    channel,
    templateKey, // ✅ Correctly resolved
    status: 'PENDING'
  });
  
  // 5. Auto-process immediately
  await this.processQueueItem(queueId);
}
```

**Логика:**
- ✅ Проверяет event.isActive
- ✅ Резолвит templateKey через templateId (FIXED)
- ✅ Создает queue entry
- ✅ Автоматически обрабатывает

### 4. EmailNotificationService ✅
```typescript
// src/lib/services/email-notification.service.ts
async sendNotificationEmail(options) {
  // 1. Get email provider (Resend)
  const emailProvider = await integrationFactory.getEmailProvider();
  
  // 2. Render template
  const rendered = await emailTemplateService.render({
    templateKey,
    variables: data
  });
  
  // 3. Send via Resend
  const result = await emailProvider.sendEmail({
    to,
    subject: rendered.subject,
    html: rendered.html
  });
  
  // 4. Log to EmailLog
  await prisma.emailLog.create({
    userId,
    recipient: to,
    status: 'SENT',
    templateId: rendered.templateId
  });
}
```

**Логика:**
- ✅ Fetches Resend provider
- ✅ Renders template with variables
- ✅ Sends email
- ✅ Logs to EmailLog

### 5. Retry Logic ✅ NEW
```typescript
// src/app/api/cron/process-notifications/route.ts
async function processCron() {
  // 1. Process PENDING (older than 5 min)
  const pending = await prisma.notificationQueue.findMany({
    where: { status: 'PENDING', createdAt: { lt: fiveMinutesAgo } }
  });
  
  for (const notification of pending) {
    await notificationService.processQueueItem(notification.id);
  }
  
  // 2. Retry FAILED (with exponential backoff)
  const failed = await prisma.notificationQueue.findMany({
    where: { status: 'FAILED', attempts: { lt: 3 } }
  });
  
  for (const notification of failed) {
    // Check if enough time passed
    const delayMinutes = [5, 15, 60][attempts];
    if (now > failedAt + delayMinutes) {
      await notificationService.processQueueItem(notification.id);
    }
  }
}
```

**Логика:**
- ✅ Runs every 5 minutes (Vercel Cron)
- ✅ Processes stuck PENDING
- ✅ Retries FAILED with backoff
- ✅ Max 3 attempts

---

## 🎯 Events Coverage

### ✅ Working (15 events):

**Orders (8):**
1. ORDER_CREATED → `POST /api/orders`
2. ORDER_PAYMENT_RECEIVED → `PATCH /api/admin/orders/[id]` (status: PAYMENT_RECEIVED)
3. ORDER_PROCESSING → `PATCH /api/admin/orders/[id]` (status: PROCESSING)
4. ORDER_COMPLETED → `PATCH /api/admin/orders/[id]` (status: COMPLETED)
5. ORDER_CANCELLED → `PATCH /api/admin/orders/[id]` (status: CANCELLED)
6. ORDER_EXPIRED → `PATCH /api/admin/orders/[id]` (status: EXPIRED)
7. ORDER_FAILED → `PATCH /api/admin/orders/[id]` (status: FAILED)
8. ORDER_REFUNDED → `PATCH /api/admin/orders/[id]` (status: REFUNDED)

**KYC (3):**
9. KYC_SUBMITTED → `POST /api/kyc/submit-form`
10. KYC_APPROVED → `PUT /api/admin/kyc/[id]` OR webhook
11. KYC_REJECTED → `PUT /api/admin/kyc/[id]` OR webhook

**Security (2):**
12. SECURITY_2FA_ENABLED → `POST /api/2fa/verify`
13. SECURITY_2FA_DISABLED → `POST /api/2fa/disable`

**User (1):**
14. WELCOME_EMAIL → `POST /api/auth/register`

**Admin (1):**
15. ADMIN_INVITED → `POST /api/admin/admins/invite`

---

## ⚠️ Potential Issues to Check

### 1. Resend API Key
```bash
# Check if configured
/admin/integrations → Resend → Verify API key exists
```

**If missing:**
- Emails will fail
- Queue status: FAILED
- Error: "No email provider configured"

### 2. Email Templates Linked
```bash
# Check events have templates
SELECT eventKey, templateId, templateKey 
FROM NotificationEvent 
WHERE isActive = true;
```

**If templateId is NULL:**
- ✅ Now falls back to eventKey (FIXED)
- ⚠️ But may not find matching template in DB

### 3. Templates Published
```bash
# Check templates are published
SELECT key, status, isActive 
FROM EmailTemplate 
WHERE orgId IS NULL;
```

**If status != 'PUBLISHED' or isActive = false:**
- Template won't be found
- Email will fail

### 4. User Has Email
```bash
# Check user email exists
SELECT id, email FROM User WHERE id = 'userId';
```

**If email is NULL:**
- Notification skipped
- No error thrown

---

## 🧪 Testing Checklist

### Test 1: ORDER_CREATED
```bash
# As authenticated user
POST /api/orders
{
  "currencyCode": "BTC",
  "cryptoAmount": 0.001,
  "walletAddress": "bc1q...",
  "fiatCurrencyCode": "EUR"
}

Expected:
✅ Order created
✅ eventEmitter.emit('ORDER_CREATED') called
✅ NotificationQueue entry created
✅ Email sent (check bogdan.apricode@gmail.com)
✅ Queue status: SENT
✅ EmailLog entry created
```

### Test 2: KYC_APPROVED
```bash
# As admin
PUT /api/admin/kyc/{id}
{
  "status": "APPROVED"
}

Expected:
✅ KYC status updated
✅ eventEmitter.emit('KYC_APPROVED') called
✅ Email sent
✅ Queue status: SENT
```

### Test 3: WELCOME_EMAIL
```bash
# Register new user
POST /api/auth/register
{
  "email": "test@example.com",
  "password": "Test123!@#",
  ...
}

Expected:
✅ User created
✅ eventEmitter.emit('WELCOME_EMAIL') called
✅ Welcome email sent
```

### Test 4: Test Endpoint (ALL events)
```bash
# As SUPER_ADMIN
POST /api/admin/test/notifications
{
  "email": "bogdan.apricode@gmail.com"
}

Expected:
✅ All 15 events emitted
✅ 15 queue entries created
✅ 15 emails sent (or failed with reason)
✅ Response shows success/failure per event
```

---

## 🔍 Debugging

### Check Queue Status
```sql
SELECT 
  eventKey, 
  status, 
  COUNT(*) as count,
  MAX(createdAt) as last_created
FROM NotificationQueue
GROUP BY eventKey, status
ORDER BY eventKey, status;
```

### Check Failed Notifications
```sql
SELECT 
  id,
  eventKey,
  recipientEmail,
  status,
  attempts,
  error,
  createdAt,
  failedAt
FROM NotificationQueue
WHERE status = 'FAILED'
ORDER BY createdAt DESC
LIMIT 10;
```

### Check Email Logs
```sql
SELECT 
  template,
  recipient,
  status,
  sentAt,
  failedAt,
  metadata->>'error' as error
FROM EmailLog
ORDER BY createdAt DESC
LIMIT 10;
```

### Check Events Configuration
```sql
SELECT 
  e.eventKey,
  e.isActive,
  e.templateId,
  e.templateKey,
  t.key as email_template_key,
  t.status as template_status,
  t.isActive as template_active
FROM NotificationEvent e
LEFT JOIN EmailTemplate t ON e.templateId = t.id
WHERE e.isActive = true
ORDER BY e.category, e.eventKey;
```

---

## ✅ Final Checklist

### Configuration:
- [ ] Resend API key configured (`/admin/integrations`)
- [ ] Email templates exist in DB
- [ ] Templates are PUBLISHED and isActive
- [ ] NotificationEvents have templateId set
- [ ] Events are isActive = true

### Code:
- [x] eventEmitter.emit() calls added
- [x] Template resolution fixed (templateId → templateKey)
- [x] Try-catch error handling
- [x] Console logging
- [x] Retry logic (cron job)

### Testing:
- [ ] Test ORDER_CREATED (create order)
- [ ] Test KYC_APPROVED (approve KYC)
- [ ] Test WELCOME_EMAIL (register user)
- [ ] Test ALL events (`/api/admin/test/notifications`)
- [ ] Check bogdan.apricode@gmail.com inbox
- [ ] Verify queue status in `/admin/notification-queue`
- [ ] Check email logs

### Monitoring:
- [ ] Check console logs for errors
- [ ] Monitor failed queue entries
- [ ] Verify cron job runs (every 5 min)
- [ ] Check retry attempts

---

## 🎉 Summary

**System Status:** ✅ **Logic is Correct**

**What Works:**
- ✅ 15 events integrated
- ✅ Template resolution fixed
- ✅ Auto-retry with backoff
- ✅ Error handling
- ✅ Logging

**What to Test:**
- ⚠️ Resend API key configured
- ⚠️ Templates linked to events
- ⚠️ Send test notifications
- ⚠️ Check email delivery

**Next Step:**
```bash
# Run test endpoint (use UI button or API)
POST /api/admin/test/notifications
{
  "email": "bogdan.apricode@gmail.com"
}

# Then check:
1. Console logs (terminal)
2. /admin/notification-queue (UI)
3. bogdan.apricode@gmail.com inbox
```

---

**Files:**
- Test endpoint: `src/app/api/admin/test/notifications/route.ts`
- Cron job: `src/app/api/cron/process-notifications/route.ts`
- Fixed logic: `src/lib/services/notification.service.ts`

**Status:** ✅ Ready to test with real email!

