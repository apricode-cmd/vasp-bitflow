# 🔔 Аудит системы уведомлений и Email

**Дата:** 2025-11-12  
**Статус:** 🔴 Найдены критические проблемы производительности

---

## 🎯 Executive Summary

Система уведомлений имеет **серьезные проблемы масштабируемости**:
- ❌ Последовательная обработка (1 email за раз)
- ❌ Отсутствие rate limiting для Resend API
- ❌ 3-4 DB запроса на каждое уведомление
- ❌ Fire-and-forget errors без proper handling
- ❌ Нет batch processing

**Риски для production:**
- 🔴 **HIGH**: Превышение лимитов Resend API → блокировка аккаунта
- 🟠 **MEDIUM**: Медленная отправка при большом объеме (100+ emails)
- 🟠 **MEDIUM**: Database перегрузка при массовых уведомлениях
- 🟡 **LOW**: Потеря части уведомлений из-за unhandled errors

---

## 🔍 Найденные проблемы (в порядке критичности)

### 🔴 КРИТИЧНО #1: Fire-and-forget в processNotification

**Файл:** `src/lib/services/notification.service.ts:197`

```typescript
// 🔥 AUTO-PROCESS: Send immediately if not scheduled for future
const isScheduledForFuture = scheduledFor && scheduledFor > new Date();
if (!isScheduledForFuture) {
  // ❌ ПРОБЛЕМА: .catch() без await - ошибки игнорируются!
  this.processNotification(queueEntry).catch(error => {
    console.error(`❌ Auto-process failed for ${queueEntry.id}:`, error);
  });
}
```

**Что происходит:**
1. Уведомление создается в очереди
2. Вызывается `processNotification()` без `await`
3. Если отправка падает - API response уже отправлен клиенту как "success"
4. Клиент думает что email отправлен, но на самом деле он в FAILED

**Риск:**
- Пользователь видит "Order created successfully" но не получает email
- Admin видит "success" но уведомление провалилось
- Нет visibility ошибок в production

**Решение:**
```typescript
// Опция 1: Делать await (блокирующий - медленнее)
await this.processNotification(queueEntry);

// Опция 2: Background job (рекомендуется)
// Не ждать отправки, но трекать status через queue
```

---

### 🔴 КРИТИЧНО #2: Sequential bulk email sending

**Файл:** `src/lib/services/email-notification.service.ts:144-161`

```typescript
export async function sendBulkEmails(...) {
  for (const email of recipients) {
    // ❌ ПРОБЛЕМА: Ждем каждый email по очереди!
    const result = await sendNotificationEmail({
      ...options,
      to: email,
    });
    
    // 100ms задержка между emails
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

**Что происходит:**
- 100 emails = 100 последовательных запросов к Resend
- При 200ms на email (network + processing) = **20 секунд** для 100 emails!
- API route висит 20 секунд → timeout на Vercel (10 секунд)

**Решение:**
```typescript
// Batch processing с concurrency limit
const BATCH_SIZE = 10;
for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
  const batch = recipients.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(email => sendNotificationEmail({...options, to: email})));
  await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
}
```

---

### 🔴 КРИТИЧНО #3: Нет rate limiting для Resend API

**Проблема:** Resend Free plan = **100 emails/day**, paid = **3,000 emails/hour**

**Текущий код:**
```typescript
// src/lib/integrations/providers/email/ResendAdapter.ts
async sendEmail(params: EmailParams) {
  // ❌ Нет проверки лимитов!
  const { data, error } = await this.client.emails.send({...});
}
```

**Риск:**
1. Массовая рассылка (например, 500 KYC approvals)
2. Превышение лимита Resend
3. **HTTP 429 Too Many Requests** → аккаунт заблокирован на час
4. Все последующие emails (важные!) не отправляются

**Решение:**
```typescript
// lib/services/rate-limiter.ts
class EmailRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  
  async sendWithLimit(emailFn: () => Promise<any>) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await emailFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const emailFn = this.queue.shift()!;
      await emailFn();
      
      // Resend limit: 10 emails/second = 100ms delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.processing = false;
  }
}
```

---

### 🟠 ВАЖНО #4: Множественные DB запросы на уведомление

**Файл:** `src/lib/services/notification.service.ts:561-641`

```typescript
private async processNotification(notification) {
  // 1. UPDATE: Mark as PROCESSING
  await prisma.notificationQueue.update({
    where: { id: notification.id },
    data: { status: 'PROCESSING', processedAt: new Date(), attempts: { increment: 1 } }
  });
  
  // 2. SEND EMAIL (внутри еще запросы!)
  const result = await this.sendEmail(notification);
  
  // 3. UPDATE: Mark as SENT/FAILED
  await prisma.notificationQueue.update({
    where: { id: notification.id },
    data: { status: 'SENT', sentAt: new Date(), messageId }
  });
  
  // 4. Внутри sendEmail -> CREATE EmailLog
  await prisma.emailLog.create({...});
}
```

**Итого:** 
- 1 уведомление = **4 DB queries**
- 100 уведомлений = **400 DB queries**
- При `connection_limit=10` → очередь и slowdown

**Решение:**
```typescript
// Batch updates
await prisma.$transaction([
  prisma.notificationQueue.updateMany({
    where: { id: { in: successIds } },
    data: { status: 'SENT', sentAt: new Date() }
  }),
  prisma.emailLog.createMany({
    data: emailLogs
  })
]);
```

---

### 🟠 ВАЖНО #5: processPendingNotifications - sequential processing

**Файл:** `src/lib/services/notification.service.ts:550-551`

```typescript
for (const notification of pending) {
  // ❌ Ждем каждое уведомление
  await this.processNotification(notification);
}
```

**Проблема:**
- 100 pending notifications = обработка по одному
- При 500ms на уведомление = **50 секунд**
- Cron job / manual trigger висит долго

**Решение:**
```typescript
// Parallel processing с concurrency limit
const CONCURRENCY = 5;
const chunks = [];
for (let i = 0; i < pending.length; i += CONCURRENCY) {
  chunks.push(pending.slice(i, i + CONCURRENCY));
}

for (const chunk of chunks) {
  await Promise.allSettled(
    chunk.map(notification => this.processNotification(notification))
  );
}
```

---

### 🟡 MINOR #6: Нет exponential backoff для retry

**Файл:** `src/lib/services/notification.service.ts:620-627`

```typescript
// Reset to PENDING for retry
await prisma.notificationQueue.update({
  where: { id: notification.id },
  data: {
    status: 'PENDING',
    error,
  },
});
```

**Проблема:**
- Retry сразу → если Resend API down, будем спамить
- Нет increasing delay (1s, 2s, 4s, 8s...)

**Решение:**
```typescript
const retryDelay = Math.min(1000 * Math.pow(2, attempts), 60000); // Max 1 minute
const nextAttempt = new Date(Date.now() + retryDelay);

await prisma.notificationQueue.update({
  where: { id: notification.id },
  data: {
    status: 'PENDING',
    scheduledFor: nextAttempt, // Retry через delay
    error,
  },
});
```

---

### 🟡 MINOR #7: Template rendering на каждый email

**Файл:** `src/lib/services/email-notification.service.ts:49-56`

```typescript
// 2. Render template
const rendered = await emailTemplateService.render({
  templateKey: templateKey || 'GENERIC',
  variables: {
    ...data,
    message,
  },
  orgId,
});
```

**Проблема:**
- Для bulk emails (100 пользователей) рендерим один и тот же template 100 раз
- Каждый render = DB query для template + variable interpolation

**Решение:**
```typescript
// Cache rendered templates for bulk
const templateCache = new Map();

function getCachedTemplate(templateKey, baseVariables) {
  const cacheKey = `${templateKey}:${JSON.stringify(baseVariables)}`;
  if (!templateCache.has(cacheKey)) {
    const rendered = emailTemplateService.render({...});
    templateCache.set(cacheKey, rendered);
  }
  return templateCache.get(cacheKey);
}
```

---

### 🟡 MINOR #8: Excessive console logging

**Проблема:** На каждый email - 5-10 console.log

```typescript
console.log('📧 Sending email via Resend:', {...});
console.log('✅ Email sent successfully via Resend:', data.id);
console.log(`✅ Email sent to ${to} via ${emailProvider.providerId}: ${subject}`);
```

**Риск:**
- В production логи забиваются
- На Vercel логи дорогие ($20/month за расширенные логи)

**Решение:**
```typescript
// Использовать structured logging
if (process.env.NODE_ENV === 'production') {
  // Minimal logging в production
  logger.info('email_sent', { messageId, recipient: to });
} else {
  console.log('📧 Sending email via Resend:', {...});
}
```

---

## 📊 Ожидаемая производительность (ДО оптимизации)

| Сценарий | Текущее время | DB Queries | Риски |
|----------|---------------|------------|-------|
| **1 email** | 300-500ms | 4 queries | ✅ OK |
| **10 emails (bulk)** | 3-5 секунд | 40 queries | 🟡 Slow |
| **100 emails (bulk)** | 30-50 секунд | 400 queries | 🔴 Timeout, Rate limit |
| **1000 emails (newsletter)** | 5-8 минут | 4000 queries | 🔴 Impossible |

---

## ✅ План оптимизации (приоритеты)

### 🔴 PRIORITY 1: Rate Limiting (сложность: MEDIUM, время: 2 часа)

**Файлы:**
- `src/lib/services/rate-limiter.ts` (новый)
- `src/lib/integrations/providers/email/ResendAdapter.ts` (обновить)

**Цель:** Защита от превышения Resend API limits

**Expected improvement:** 
- ✅ Избежать блокировки аккаунта
- ⬇️ 0% failed emails из-за rate limit

---

### 🔴 PRIORITY 2: Background Queue Processing (сложность: HIGH, время: 4 часа)

**Подход:**
1. Убрать fire-and-forget из `send()`
2. Все уведомления → queue с status PENDING
3. Отдельный worker/cron обрабатывает queue
4. API возвращает сразу: `{ success: true, queueId: '...' }`

**Файлы:**
- `src/lib/services/notification.service.ts` (рефакторинг)
- `src/app/api/cron/process-notifications/route.ts` (новый Vercel cron)

**Expected improvement:**
- ⬇️ 80% API response time (не ждем отправки email)
- ✅ Proper error tracking
- ✅ Retry механизм работает надежно

---

### 🟠 PRIORITY 3: Batch DB Operations (сложность: MEDIUM, время: 2 часа)

**Цель:** Уменьшить количество DB queries

**Изменения:**
```typescript
// Вместо:
for (notification of notifications) {
  await prisma.notificationQueue.update({...});
  await prisma.emailLog.create({...});
}

// Делать:
await prisma.$transaction([
  prisma.notificationQueue.updateMany({
    where: { id: { in: ids } },
    data: { status: 'SENT' }
  }),
  prisma.emailLog.createMany({
    data: emailLogs
  })
]);
```

**Expected improvement:**
- ⬇️ 75% DB queries (100 notifications: 400 → 100 queries)
- ⬇️ 50% processing time

---

### 🟠 PRIORITY 4: Parallel Processing (сложность: LOW, время: 1 час)

**Файлы:**
- `src/lib/services/notification.service.ts:processPendingNotifications`
- `src/lib/services/email-notification.service.ts:sendBulkEmails`

**Изменения:**
- Process 5-10 notifications в параллель
- Batch bulk emails по 10 штук

**Expected improvement:**
- ⬇️ 80% bulk email time (50s → 10s для 100 emails)

---

### 🟡 PRIORITY 5: Template Caching (сложность: LOW, время: 1 час)

**Expected improvement:**
- ⬇️ 30-50% template rendering time для bulk emails

---

### 🟡 PRIORITY 6: Exponential Backoff & Monitoring (сложность: LOW, время: 2 часа)

**Добавить:**
- Exponential backoff для retry (1s, 2s, 4s, 8s...)
- Alert если >10% notifications failed
- Dashboard с метриками (sent/failed/pending)

---

## 📈 Ожидаемая производительность (ПОСЛЕ оптимизации)

| Сценарий | Новое время | DB Queries | Улучшение |
|----------|-------------|------------|-----------|
| **1 email** | 50-100ms (API) + background | 2 queries | ⬇️ 80% latency |
| **10 emails (bulk)** | 100-200ms (API) + background | 10 queries | ⬇️ 95% latency |
| **100 emails (bulk)** | 200-300ms (API) + 8-12s background | 20 queries | ⬇️ 75% total time |
| **1000 emails (newsletter)** | 300ms (API) + 1-2 min background | 100 queries | ⬇️ 70% total time |

---

## 🚀 Quick Wins (можно сделать сегодня)

### 1. Add Rate Limiting (30 минут)

```typescript
// src/lib/services/email-notification.service.ts
import pLimit from 'p-limit';

const emailLimit = pLimit(10); // Max 10 concurrent emails

export async function sendBulkEmails(recipients, options) {
  const results = await Promise.allSettled(
    recipients.map(email => 
      emailLimit(() => sendNotificationEmail({ ...options, to: email }))
    )
  );
  
  // Process results...
}
```

**Install:** `npm install p-limit`

---

### 2. Fix fire-and-forget (15 минут)

```typescript
// src/lib/services/notification.service.ts:197
if (!isScheduledForFuture) {
  // Option 1: Just queue it, don't auto-process
  // Remove this.processNotification() call entirely
  
  // Option 2: Await it (slower but safer)
  try {
    await this.processNotification(queueEntry);
  } catch (error) {
    console.error(`❌ Failed to send notification ${queueEntry.id}:`, error);
    // Notification is already in queue with PENDING status, will retry
  }
}
```

---

### 3. Add exponential backoff (20 минут)

```typescript
// src/lib/services/notification.service.ts
const retryDelay = Math.min(1000 * Math.pow(2, notification.attempts), 60000);
const scheduledFor = new Date(Date.now() + retryDelay);

await prisma.notificationQueue.update({
  where: { id: notification.id },
  data: {
    status: 'PENDING',
    scheduledFor, // ← Add this
    error,
  },
});
```

---

## 🔗 Дополнительные ресурсы

- [Resend Rate Limits](https://resend.com/docs/api-reference/introduction#rate-limit)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Prisma Batch Operations](https://www.prisma.io/docs/concepts/components/prisma-client/crud#batch-operations)

---

**Следующие шаги:**
1. Обсудить приоритеты с командой
2. Начать с Quick Wins (1 час)
3. Затем Priority 1-2 (6-8 часов)
4. Протестировать на staging
5. Deploy на production

---

**Автор:** AI Assistant  
**Статус:** Ready for implementation

