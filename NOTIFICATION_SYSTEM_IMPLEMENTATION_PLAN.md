# 🚀 Notification System - Детальный план внедрения

## 📊 Анализ текущей системы

### ✅ Что УЖЕ работает:

#### 1. **Email Service** (базовый)
```typescript
// src/lib/services/email.ts
- sendWelcomeEmail() - приветственное письмо
- sendKycStatusEmail() - статус KYC
- sendOrderConfirmationEmail() - подтверждение заказа
- sendOrderStatusEmail() - статус заказа
```
**Проблемы:**
- ❌ Функции НЕ вызываются нигде в коде (мертвый код)
- ❌ Нет очереди - отправка синхронная
- ❌ Нет retry механизма
- ❌ Нет логирования отправок
- ❌ HTML хардкодится в коде

#### 2. **In-App Notifications** (динамические)
```typescript
// src/app/api/notifications/route.ts
- GET /api/notifications - возвращает уведомления
- Генерируются динамически из Orders + KYC (нет отдельной таблицы)
```
**Проблемы:**
- ❌ Нет таблицы NotificationHistory
- ❌ Нет отметки "прочитано"
- ❌ Нет персистентности
- ❌ Только Orders + KYC (нет других событий)

#### 3. **Integration System** (готов)
```typescript
// src/lib/integrations/
- IntegrationFactory ✅
- IEmailProvider ✅
- ResendAdapter ✅
```
**Статус:** Готово к использованию!

#### 4. **Database Models**
```prisma
✅ EmailLog - есть (но не используется)
✅ Integration - есть
✅ SystemSettings - есть
❌ NotificationEvent - НЕТ
❌ NotificationQueue - НЕТ
❌ NotificationHistory - НЕТ
❌ NotificationSubscription - НЕТ
```

---

## 🎯 Стратегия внедрения (без поломок)

### Принципы:
1. ✅ **Обратная совместимость** - старые функции продолжают работать
2. ✅ **Постепенная миграция** - новая система работает параллельно
3. ✅ **Безопасность** - тестируем на каждом этапе
4. ✅ **Откат** - можем вернуться назад на любом этапе

---

## 📋 PHASE 1: Database Foundation (2 hours)

### Цель: Добавить новые таблицы БЕЗ изменения существующих

### Step 1.1: Добавить новые модели в schema.prisma
```prisma
// ✅ Добавляем 4 новые таблицы:
- NotificationEvent
- NotificationQueue
- NotificationHistory
- NotificationSubscription

// ⚠️ НЕ ТРОГАЕМ существующие:
- EmailLog (оставляем как есть)
- Order, KycSession, User (не меняем)
```

### Step 1.2: Создать миграцию
```bash
npx prisma migrate dev --name add_notification_system
```

### Step 1.3: Seed начальные события
```typescript
// prisma/seed-notifications.ts
await prisma.notificationEvent.createMany({
  data: [
    // Orders
    { eventKey: 'ORDER_CREATED', name: 'Order Created', category: 'ORDER', channels: ['EMAIL', 'IN_APP'] },
    { eventKey: 'ORDER_PAYMENT_RECEIVED', name: 'Payment Received', category: 'ORDER', channels: ['EMAIL', 'IN_APP'] },
    { eventKey: 'ORDER_PROCESSING', name: 'Order Processing', category: 'ORDER', channels: ['IN_APP'] },
    { eventKey: 'ORDER_COMPLETED', name: 'Order Completed', category: 'ORDER', channels: ['EMAIL', 'IN_APP'] },
    { eventKey: 'ORDER_CANCELLED', name: 'Order Cancelled', category: 'ORDER', channels: ['EMAIL', 'IN_APP'] },
    { eventKey: 'ORDER_EXPIRED', name: 'Order Expired', category: 'ORDER', channels: ['EMAIL'] },
    
    // KYC
    { eventKey: 'KYC_STARTED', name: 'KYC Started', category: 'KYC', channels: ['IN_APP'] },
    { eventKey: 'KYC_APPROVED', name: 'KYC Approved', category: 'KYC', channels: ['EMAIL', 'IN_APP'] },
    { eventKey: 'KYC_REJECTED', name: 'KYC Rejected', category: 'KYC', channels: ['EMAIL', 'IN_APP'] },
    { eventKey: 'KYC_DOCUMENTS_REQUIRED', name: 'Additional Documents Required', category: 'KYC', channels: ['EMAIL', 'IN_APP'] },
    
    // Security
    { eventKey: 'USER_REGISTERED', name: 'User Registered', category: 'SECURITY', channels: ['EMAIL'] },
    { eventKey: 'PASSWORD_CHANGED', name: 'Password Changed', category: 'SECURITY', channels: ['EMAIL'] },
    { eventKey: 'LOGIN_NEW_DEVICE', name: 'Login from New Device', category: 'SECURITY', channels: ['EMAIL'] },
    
    // System
    { eventKey: 'SYSTEM_MAINTENANCE', name: 'System Maintenance', category: 'SYSTEM', channels: ['EMAIL', 'IN_APP'] },
  ]
});
```

### ✅ Checkpoint 1: Проверка
```bash
# Проверить что миграция прошла
npx prisma studio

# Проверить что таблицы созданы
# Проверить что seed добавил события
```

---

## 📋 PHASE 2: Core Services (3 hours)

### Цель: Создать сервисы БЕЗ интеграции в существующий код

### Step 2.1: NotificationService (основной)
```typescript
// src/lib/services/notification.service.ts

class NotificationService {
  /**
   * Trigger notification (главная функция)
   */
  async trigger(params: {
    eventKey: string;
    userId?: string;
    recipientEmail?: string;
    data: Record<string, any>;
  }): Promise<void> {
    // 1. Получить событие
    const event = await this.getEvent(params.eventKey);
    if (!event || !event.isActive) return;
    
    // 2. Получить подписки пользователя (если userId есть)
    const subscriptions = params.userId 
      ? await this.getUserSubscriptions(params.userId, params.eventKey)
      : null;
    
    // 3. Определить каналы для отправки
    const channels = this.determineChannels(event, subscriptions);
    
    // 4. Создать задачи в очереди для каждого канала
    for (const channel of channels) {
      await this.enqueue({
        eventKey: params.eventKey,
        userId: params.userId,
        recipientEmail: params.recipientEmail,
        channel,
        data: params.data
      });
    }
  }
  
  /**
   * Process queue (вызывается cron job)
   */
  async processQueue(batchSize: number = 10): Promise<void> {
    const tasks = await prisma.notificationQueue.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: new Date() },
        attempts: { lt: 3 }
      },
      take: batchSize,
      orderBy: { scheduledFor: 'asc' }
    });
    
    for (const task of tasks) {
      await this.processTask(task);
    }
  }
  
  /**
   * Process single task
   */
  private async processTask(task: NotificationQueue): Promise<void> {
    try {
      // Обновить статус на PROCESSING
      await prisma.notificationQueue.update({
        where: { id: task.id },
        data: { status: 'PROCESSING', attempts: { increment: 1 } }
      });
      
      // Отправить по каналу
      switch (task.channel) {
        case 'EMAIL':
          await this.sendEmail(task);
          break;
        case 'IN_APP':
          await this.sendInApp(task);
          break;
      }
      
      // Обновить статус на SENT
      await prisma.notificationQueue.update({
        where: { id: task.id },
        data: { status: 'SENT', sentAt: new Date() }
      });
      
    } catch (error: any) {
      console.error('Task processing error:', error);
      
      // Обновить статус на FAILED если превышены попытки
      const newStatus = task.attempts >= 2 ? 'FAILED' : 'PENDING';
      await prisma.notificationQueue.update({
        where: { id: task.id },
        data: { 
          status: newStatus, 
          error: error.message,
          failedAt: newStatus === 'FAILED' ? new Date() : null
        }
      });
    }
  }
  
  /**
   * Send email через IntegrationFactory
   */
  private async sendEmail(task: NotificationQueue): Promise<void> {
    // 1. Получить email провайдер
    const emailProvider = await integrationFactory.getEmailProvider();
    
    // 2. Рендерить контент (пока простой, потом через шаблоны)
    const content = await this.renderEmailContent(task);
    
    // 3. Отправить
    const result = await emailProvider.sendEmail({
      to: task.recipientEmail || task.user?.email,
      subject: content.subject,
      html: content.html,
      text: content.text,
      tags: {
        eventKey: task.eventKey,
        userId: task.userId || 'guest'
      }
    });
    
    // 4. Логировать в EmailLog (обратная совместимость)
    await prisma.emailLog.create({
      data: {
        userId: task.userId,
        recipient: task.recipientEmail || task.user?.email,
        subject: content.subject,
        htmlContent: content.html,
        textContent: content.text,
        status: result.success ? 'SENT' : 'FAILED',
        messageId: result.messageId,
        error: result.error,
        sentAt: result.success ? new Date() : null,
        // Новые поля
        eventKey: task.eventKey,
        providerId: emailProvider.providerId,
        tags: [task.eventKey, task.channel]
      }
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Email send failed');
    }
  }
  
  /**
   * Send in-app notification
   */
  private async sendInApp(task: NotificationQueue): Promise<void> {
    if (!task.userId) return;
    
    await prisma.notificationHistory.create({
      data: {
        userId: task.userId,
        eventKey: task.eventKey,
        channel: 'IN_APP',
        title: task.subject || this.getDefaultTitle(task.eventKey),
        message: task.message,
        data: task.data,
        actionUrl: this.getActionUrl(task)
      }
    });
  }
  
  /**
   * Render email content (временный, до шаблонов)
   */
  private async renderEmailContent(task: NotificationQueue): Promise<{
    subject: string;
    html: string;
    text: string;
  }> {
    // Пока используем простые шаблоны
    // В Phase 3 заменим на систему шаблонов
    
    const templates = {
      'ORDER_CREATED': {
        subject: (data: any) => `Order Confirmation - ${data.orderId}`,
        html: (data: any) => this.renderOrderCreatedEmail(data),
      },
      'ORDER_COMPLETED': {
        subject: (data: any) => `Order Completed - ${data.orderId}`,
        html: (data: any) => this.renderOrderCompletedEmail(data),
      },
      'KYC_APPROVED': {
        subject: () => 'KYC Verification Approved',
        html: (data: any) => this.renderKycApprovedEmail(data),
      },
      'USER_REGISTERED': {
        subject: () => 'Welcome to Apricode Exchange',
        html: (data: any) => this.renderWelcomeEmail(data),
      }
    };
    
    const template = templates[task.eventKey];
    if (!template) {
      throw new Error(`No template for event: ${task.eventKey}`);
    }
    
    const data = task.data as any;
    const subject = template.subject(data);
    const html = template.html(data);
    const text = this.htmlToText(html);
    
    return { subject, html, text };
  }
  
  /**
   * Get action URL for notification
   */
  private getActionUrl(task: NotificationQueue): string | null {
    const data = task.data as any;
    
    switch (task.eventKey) {
      case 'ORDER_CREATED':
      case 'ORDER_COMPLETED':
      case 'ORDER_CANCELLED':
        return data.orderId ? `/orders/${data.orderId}` : null;
      
      case 'KYC_APPROVED':
      case 'KYC_REJECTED':
        return '/kyc';
      
      default:
        return null;
    }
  }
}

export const notificationService = new NotificationService();
```

### Step 2.2: EventEmitter (простой интерфейс)
```typescript
// src/lib/services/event-emitter.service.ts

class EventEmitterService {
  /**
   * Emit event - главная функция для бизнес-логики
   */
  async emit(eventKey: string, data: Record<string, any>): Promise<void> {
    try {
      await notificationService.trigger({
        eventKey,
        userId: data.userId,
        recipientEmail: data.email,
        data
      });
    } catch (error) {
      console.error('Event emit error:', error);
      // НЕ бросаем ошибку - не должны ломать основной flow
    }
  }
}

export const eventEmitter = new EventEmitterService();
```

### Step 2.3: NotificationContent (временные шаблоны)
```typescript
// src/lib/services/notification-content.service.ts

class NotificationContentService {
  /**
   * Render welcome email (копия из старого email.ts)
   */
  renderWelcomeEmail(data: { firstName: string }): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to Apricode Exchange!</h1>
        <p>Hi ${data.firstName},</p>
        <p>Thank you for registering with Apricode Exchange. We're excited to have you on board!</p>
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Complete KYC verification to start buying cryptocurrency</li>
          <li>Browse our supported cryptocurrencies: BTC, ETH, USDT, SOL</li>
          <li>Place your first order with bank transfer</li>
        </ol>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>Apricode Exchange Team</p>
      </div>
    `;
  }
  
  // ... другие методы для каждого типа события
}

export const notificationContent = new NotificationContentService();
```

### ✅ Checkpoint 2: Тестирование сервисов
```typescript
// Тест в консоли или через API endpoint
await eventEmitter.emit('USER_REGISTERED', {
  userId: 'test-user-id',
  firstName: 'John',
  email: 'john@example.com'
});

// Проверить:
// 1. Создалась задача в NotificationQueue
// 2. Запустить processQueue()
// 3. Проверить EmailLog
// 4. Проверить NotificationHistory
```

---

## 📋 PHASE 3: API Endpoints (1 hour)

### Цель: Создать API для работы с уведомлениями

### Step 3.1: Обновить GET /api/notifications
```typescript
// src/app/api/notifications/route.ts

export async function GET(): Promise<NextResponse> {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = session.user.id;

  // ✅ НОВАЯ ЛОГИКА: Берем из NotificationHistory
  const notifications = await prisma.notificationHistory.findMany({
    where: { 
      userId,
      channel: 'IN_APP'
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return NextResponse.json({
    success: true,
    notifications: notifications.map(n => ({
      id: n.id,
      type: this.getCategoryFromEventKey(n.eventKey),
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      link: n.actionUrl
    }))
  });
}

// ✅ СТАРАЯ ЛОГИКА: Оставляем как fallback (если NotificationHistory пустая)
// ... существующий код как есть
```

### Step 3.2: Добавить PATCH /api/notifications (mark as read)
```typescript
// src/app/api/notifications/route.ts

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { notificationId } = await request.json();

  await prisma.notificationHistory.update({
    where: { 
      id: notificationId,
      userId: session.user.id // Security: только свои уведомления
    },
    data: { 
      isRead: true,
      readAt: new Date()
    }
  });

  return NextResponse.json({ success: true });
}
```

### Step 3.3: Cron Job для обработки очереди
```typescript
// src/app/api/cron/process-notifications/route.ts

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Security: Проверить cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await notificationService.processQueue(20); // Обработать 20 задач
    
    return NextResponse.json({ 
      success: true,
      message: 'Queue processed'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Step 3.4: Настроить Vercel Cron
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/process-notifications",
      "schedule": "* * * * *"
    }
  ]
}
```

### ✅ Checkpoint 3: Тестирование API
```bash
# 1. Создать тестовое уведомление
curl -X POST http://localhost:3000/api/test/create-notification

# 2. Получить уведомления
curl http://localhost:3000/api/notifications

# 3. Отметить как прочитанное
curl -X PATCH http://localhost:3000/api/notifications \
  -d '{"notificationId": "xxx"}'

# 4. Запустить cron вручную
curl http://localhost:3000/api/cron/process-notifications \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

## 📋 PHASE 4: Integration (2 hours)

### Цель: Интегрировать eventEmitter в существующий код

### Step 4.1: User Registration
```typescript
// src/app/api/auth/register/route.ts

// ✅ ДОБАВИТЬ после создания пользователя:
const user = await prisma.user.create({ ... });

// ✅ НОВОЕ: Отправить через новую систему
await eventEmitter.emit('USER_REGISTERED', {
  userId: user.id,
  firstName: user.firstName,
  email: user.email
});

// ⚠️ СТАРОЕ: Закомментировать (но не удалять!)
// await sendWelcomeEmail(user.email, user.firstName);
```

### Step 4.2: Order Created
```typescript
// src/app/api/orders/route.ts

// ✅ ДОБАВИТЬ после создания заказа:
const order = await prisma.order.create({ ... });

// ✅ НОВОЕ: Отправить через новую систему
await eventEmitter.emit('ORDER_CREATED', {
  userId: order.userId,
  orderId: order.id,
  amount: order.cryptoAmount,
  currency: order.currency.symbol,
  totalFiat: order.fiatAmount,
  fiatCurrency: order.fiatCurrency.symbol,
  // Bank details для email
  bankName: bankDetails.bankName,
  iban: bankDetails.iban
});

// ⚠️ СТАРОЕ: Закомментировать
// await sendOrderConfirmationEmail(...);
```

### Step 4.3: Order Status Change
```typescript
// src/app/api/admin/orders/[id]/route.ts

// ✅ ДОБАВИТЬ после обновления статуса:
const order = await prisma.order.update({ ... });

// ✅ НОВОЕ: Определить событие по статусу
let eventKey = '';
switch (order.status) {
  case 'PAYMENT_PENDING':
    eventKey = 'ORDER_PAYMENT_RECEIVED';
    break;
  case 'PROCESSING':
    eventKey = 'ORDER_PROCESSING';
    break;
  case 'COMPLETED':
    eventKey = 'ORDER_COMPLETED';
    break;
  case 'CANCELLED':
    eventKey = 'ORDER_CANCELLED';
    break;
  case 'EXPIRED':
    eventKey = 'ORDER_EXPIRED';
    break;
}

if (eventKey) {
  await eventEmitter.emit(eventKey, {
    userId: order.userId,
    orderId: order.id,
    amount: order.cryptoAmount,
    currency: order.currency.symbol,
    status: order.status,
    transactionHash: order.transactionHash
  });
}

// ⚠️ СТАРОЕ: Закомментировать
// await sendOrderStatusEmail(...);
```

### Step 4.4: KYC Status Change
```typescript
// src/lib/services/kyc.service.ts (или где обновляется KYC)

// ✅ ДОБАВИТЬ после обновления KYC:
const kycSession = await prisma.kycSession.update({ ... });

// ✅ НОВОЕ: Отправить событие
if (kycSession.status === 'APPROVED') {
  await eventEmitter.emit('KYC_APPROVED', {
    userId: kycSession.userId,
    firstName: user.firstName
  });
} else if (kycSession.status === 'REJECTED') {
  await eventEmitter.emit('KYC_REJECTED', {
    userId: kycSession.userId,
    firstName: user.firstName,
    rejectionReason: kycSession.rejectionReason
  });
}

// ⚠️ СТАРОЕ: Закомментировать
// await sendKycStatusEmail(...);
```

### ✅ Checkpoint 4: End-to-End тестирование
```bash
# 1. Зарегистрировать нового пользователя
# 2. Проверить что пришел welcome email
# 3. Проверить NotificationHistory
# 4. Создать заказ
# 5. Проверить email и in-app уведомление
# 6. Обновить статус заказа
# 7. Проверить уведомления
```

---

## 📋 PHASE 5: User Settings (1 hour)

### Цель: Дать пользователям управление подписками

### Step 5.1: API для настроек
```typescript
// src/app/api/notifications/settings/route.ts

// GET - получить настройки
export async function GET(): Promise<NextResponse> {
  const { error, session } = await requireAuth();
  if (error) return error;

  const subscriptions = await prisma.notificationSubscription.findMany({
    where: { userId: session.user.id },
    include: { event: true }
  });

  return NextResponse.json({ subscriptions });
}

// PATCH - обновить настройки
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { eventKey, emailEnabled, inAppEnabled } = await request.json();

  await prisma.notificationSubscription.upsert({
    where: {
      userId_eventKey: {
        userId: session.user.id,
        eventKey
      }
    },
    create: {
      userId: session.user.id,
      eventKey,
      emailEnabled,
      inAppEnabled
    },
    update: {
      emailEnabled,
      inAppEnabled
    }
  });

  return NextResponse.json({ success: true });
}
```

### Step 5.2: UI страница настроек
```typescript
// src/app/(client)/notifications/settings/page.tsx
// (См. NOTIFICATION_SYSTEM_UI.md для полного кода)
```

---

## 📋 PHASE 6: Admin UI (2 hours)

### Цель: Админ-панель для управления уведомлениями

### Step 6.1: Admin API
```typescript
// src/app/api/admin/notifications/events/route.ts
// src/app/api/admin/notifications/queue/route.ts
// src/app/api/admin/notifications/analytics/route.ts
```

### Step 6.2: Admin Pages
```typescript
// src/app/(admin)/admin/notifications/page.tsx
// (См. NOTIFICATION_SYSTEM_UI.md для полного кода)
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// tests/services/notification.service.test.ts
describe('NotificationService', () => {
  it('should trigger notification', async () => {
    await notificationService.trigger({
      eventKey: 'ORDER_CREATED',
      userId: 'test-user',
      data: { orderId: '123' }
    });
    
    const queue = await prisma.notificationQueue.findMany({
      where: { userId: 'test-user' }
    });
    
    expect(queue).toHaveLength(2); // EMAIL + IN_APP
  });
});
```

### Integration Tests
```typescript
// tests/integration/notification-flow.test.ts
describe('Notification Flow', () => {
  it('should send email when order created', async () => {
    // 1. Create order
    const order = await createTestOrder();
    
    // 2. Check queue
    const queue = await prisma.notificationQueue.findFirst({
      where: { eventKey: 'ORDER_CREATED' }
    });
    expect(queue).toBeDefined();
    
    // 3. Process queue
    await notificationService.processQueue();
    
    // 4. Check EmailLog
    const emailLog = await prisma.emailLog.findFirst({
      where: { eventKey: 'ORDER_CREATED' }
    });
    expect(emailLog.status).toBe('SENT');
  });
});
```

---

## 🔄 Rollback Plan

### Если что-то пойдет не так:

#### Option 1: Откат миграции
```bash
# Откатить последнюю миграцию
npx prisma migrate resolve --rolled-back <migration_name>
```

#### Option 2: Отключить новую систему
```typescript
// src/lib/services/event-emitter.service.ts

class EventEmitterService {
  async emit(eventKey: string, data: Record<string, any>): Promise<void> {
    // ⚠️ EMERGENCY DISABLE
    if (process.env.DISABLE_NEW_NOTIFICATIONS === 'true') {
      console.log('New notification system disabled');
      return;
    }
    
    // ... остальной код
  }
}
```

#### Option 3: Вернуться к старым функциям
```typescript
// Раскомментировать старые вызовы:
await sendWelcomeEmail(user.email, user.firstName);
// await eventEmitter.emit('USER_REGISTERED', { ... }); // Закомментировать
```

---

## 📊 Success Metrics

### После внедрения проверить:

1. **Email Delivery Rate**
   - Target: > 95%
   - Query: `SELECT COUNT(*) FROM EmailLog WHERE status = 'SENT'`

2. **Queue Processing Time**
   - Target: < 5 minutes
   - Query: `SELECT AVG(TIMESTAMPDIFF(MINUTE, createdAt, sentAt)) FROM NotificationQueue`

3. **Failed Notifications**
   - Target: < 5%
   - Query: `SELECT COUNT(*) FROM NotificationQueue WHERE status = 'FAILED'`

4. **User Engagement**
   - In-App Read Rate: > 60%
   - Email Open Rate: > 30%

---

## 🎯 Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Database | 2 hours | None |
| Phase 2: Services | 3 hours | Phase 1 |
| Phase 3: API | 1 hour | Phase 2 |
| Phase 4: Integration | 2 hours | Phase 3 |
| Phase 5: User Settings | 1 hour | Phase 3 |
| Phase 6: Admin UI | 2 hours | Phase 3 |
| **Total** | **11 hours** | |

---

## ✅ Checklist перед запуском

### Pre-deployment:
- [ ] Все миграции применены
- [ ] Seed данные загружены
- [ ] Unit тесты проходят
- [ ] Integration тесты проходят
- [ ] Cron job настроен в Vercel
- [ ] CRON_SECRET добавлен в .env
- [ ] Backup базы данных создан

### Post-deployment:
- [ ] Проверить что cron job запускается
- [ ] Отправить тестовое уведомление
- [ ] Проверить EmailLog
- [ ] Проверить NotificationHistory
- [ ] Мониторить ошибки в Vercel Logs

---

## 🚀 Next Steps (Phase 2)

После успешного внедрения базовой системы:

1. **Email Templates** (White-label support)
2. **SMS Channel** (Twilio integration)
3. **Push Notifications** (Web Push API)
4. **Advanced Analytics** (Open rate, Click rate)
5. **A/B Testing** (Template variants)
6. **Digest Mode** (Daily/Weekly summaries)

---

**Готовы начинать с Phase 1?** 🚀

