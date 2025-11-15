# Notification System - Краткий план

## 🎯 Цель
Создать централизованную систему уведомлений с поддержкой email, in-app, SMS каналов и очередью обработки.

---

## 📊 Database Schema (4 таблицы)

### 1. NotificationEvent
```prisma
model NotificationEvent {
  id          String   @id @default(cuid())
  eventKey    String   @unique // 'ORDER_CREATED', 'KYC_APPROVED'
  name        String   // "Order Created"
  category    EventCategory // ORDER, KYC, PAYMENT, SECURITY
  channels    NotificationChannel[] // ['EMAIL', 'IN_APP']
  priority    EventPriority @default(NORMAL)
  isActive    Boolean  @default(true)
  
  @@index([eventKey])
}

enum EventCategory { ORDER, KYC, PAYMENT, SECURITY, SYSTEM }
enum EventPriority { LOW, NORMAL, HIGH, URGENT }
enum NotificationChannel { EMAIL, IN_APP, SMS, PUSH }
```

### 2. NotificationQueue
```prisma
model NotificationQueue {
  id            String   @id @default(cuid())
  eventKey      String
  userId        String?
  recipientEmail String?
  channel       NotificationChannel
  subject       String?
  message       String   @db.Text
  data          Json
  status        QueueStatus @default(PENDING)
  attempts      Int      @default(0)
  scheduledFor  DateTime @default(now())
  sentAt        DateTime?
  error         String?
  
  @@index([status, scheduledFor])
  @@index([userId])
}

enum QueueStatus { PENDING, PROCESSING, SENT, FAILED, CANCELLED }
```

### 3. NotificationHistory (для in-app)
```prisma
model NotificationHistory {
  id          String   @id @default(cuid())
  userId      String
  eventKey    String
  channel     NotificationChannel
  title       String
  message     String   @db.Text
  data        Json?
  isRead      Boolean  @default(false)
  actionUrl   String?
  createdAt   DateTime @default(now())
  
  @@index([userId, isRead])
}
```

### 4. NotificationSubscription (настройки пользователя)
```prisma
model NotificationSubscription {
  id            String   @id @default(cuid())
  userId        String
  eventKey      String
  emailEnabled  Boolean  @default(true)
  inAppEnabled  Boolean  @default(true)
  smsEnabled    Boolean  @default(false)
  
  @@unique([userId, eventKey])
}
```

---

## 🔧 Services (3 сервиса)

### 1. NotificationService (ядро)
```typescript
// src/lib/services/notification.service.ts

class NotificationService {
  // Главный метод - триггерит событие
  async trigger(options: {
    eventKey: string;
    userId?: string;
    recipientEmail?: string;
    data: Record<string, any>;
  }): Promise<void> {
    // 1. Получить событие
    const event = await this.getEvent(options.eventKey);
    
    // 2. Получить подписки пользователя
    const subscription = await this.getSubscription(options.userId, options.eventKey);
    
    // 3. Определить активные каналы
    const channels = this.getActiveChannels(event, subscription);
    
    // 4. Создать задачи в очереди
    for (const channel of channels) {
      await prisma.notificationQueue.create({
        data: {
          eventKey: options.eventKey,
          userId: options.userId,
          recipientEmail: options.recipientEmail,
          channel,
          data: options.data,
          message: await this.renderMessage(options.eventKey, options.data, channel)
        }
      });
    }
  }
  
  // Обработка очереди (cron job)
  async processQueue(): Promise<void> {
    const tasks = await prisma.notificationQueue.findMany({
      where: { status: 'PENDING', scheduledFor: { lte: new Date() } },
      take: 100
    });
    
    for (const task of tasks) {
      await this.processTask(task);
    }
  }
  
  // Обработка одной задачи
  private async processTask(task: NotificationQueue): Promise<void> {
    switch (task.channel) {
      case 'EMAIL':
        await this.sendEmail(task);
        break;
      case 'IN_APP':
        await this.sendInApp(task);
        break;
    }
  }
  
  // Отправка email
  private async sendEmail(task: NotificationQueue): Promise<void> {
    const emailProvider = await integrationFactory.getEmailProvider();
    const content = await this.renderEmailContent(task);
    
    await emailProvider.sendEmail({
      to: task.recipientEmail,
      subject: content.subject,
      html: content.html
    });
    
    await prisma.notificationQueue.update({
      where: { id: task.id },
      data: { status: 'SENT', sentAt: new Date() }
    });
  }
  
  // Отправка in-app
  private async sendInApp(task: NotificationQueue): Promise<void> {
    await prisma.notificationHistory.create({
      data: {
        userId: task.userId,
        eventKey: task.eventKey,
        channel: 'IN_APP',
        title: task.subject,
        message: task.message,
        data: task.data
      }
    });
  }
}

export const notificationService = new NotificationService();
```

### 2. EventEmitter (простой интерфейс)
```typescript
// src/lib/services/event-emitter.service.ts

class EventEmitterService {
  async emit(eventKey: string, data: Record<string, any>): Promise<void> {
    await notificationService.trigger({
      eventKey,
      userId: data.userId,
      data
    });
  }
}

export const eventEmitter = new EventEmitterService();
```

### 3. NotificationContent (временный, до шаблонов)
```typescript
// src/lib/services/notification-content.service.ts

class NotificationContentService {
  renderEmail(eventKey: string, data: any): { subject: string; html: string } {
    switch (eventKey) {
      case 'ORDER_CREATED':
        return {
          subject: `Order ${data.orderNumber} Created`,
          html: `
            <h1>Order Created</h1>
            <p>Order: ${data.orderNumber}</p>
            <p>Amount: ${data.cryptoAmount} ${data.cryptoCurrency}</p>
            <p>Total: ${data.fiatAmount} ${data.fiatCurrency}</p>
          `
        };
      
      case 'KYC_APPROVED':
        return {
          subject: 'KYC Verification Approved',
          html: '<h1>Your KYC has been approved!</h1>'
        };
    }
  }
}
```

---

## 🔌 Интеграция с кодом

### Пример 1: Order Created
```typescript
// src/app/api/orders/route.ts

// ❌ Было:
const order = await prisma.order.create({ ... });
// TODO: Send email

// ✅ Стало:
const order = await prisma.order.create({ ... });

await eventEmitter.emit('ORDER_CREATED', {
  userId: order.userId,
  orderId: order.id,
  orderNumber: order.paymentReference,
  cryptoAmount: order.cryptoAmount,
  cryptoCurrency: order.currencyCode,
  fiatAmount: order.totalFiat,
  fiatCurrency: order.fiatCurrencyCode
});
```

### Пример 2: KYC Approved
```typescript
// src/lib/services/kyc.service.ts

const session = await prisma.kycSession.update({
  where: { id },
  data: { status: 'APPROVED' }
});

await eventEmitter.emit('KYC_APPROVED', {
  userId: session.userId,
  kycLevel: 'L1'
});
```

---

## 📧 Default Events (seed data)

```typescript
// prisma/seed-notifications.ts

const events = [
  // Orders
  { eventKey: 'ORDER_CREATED', name: 'Order Created', category: 'ORDER', channels: ['EMAIL', 'IN_APP'] },
  { eventKey: 'ORDER_COMPLETED', name: 'Order Completed', category: 'ORDER', channels: ['EMAIL', 'IN_APP'] },
  { eventKey: 'ORDER_CANCELLED', name: 'Order Cancelled', category: 'ORDER', channels: ['EMAIL', 'IN_APP'] },
  { eventKey: 'ORDER_EXPIRED', name: 'Order Expired', category: 'ORDER', channels: ['EMAIL', 'IN_APP'] },
  
  // KYC
  { eventKey: 'KYC_APPROVED', name: 'KYC Approved', category: 'KYC', channels: ['EMAIL', 'IN_APP'] },
  { eventKey: 'KYC_REJECTED', name: 'KYC Rejected', category: 'KYC', channels: ['EMAIL', 'IN_APP'] },
  { eventKey: 'KYC_PENDING', name: 'KYC Pending Review', category: 'KYC', channels: ['EMAIL', 'IN_APP'] },
  
  // Payment
  { eventKey: 'PAYMENT_RECEIVED', name: 'Payment Received', category: 'PAYMENT', channels: ['EMAIL', 'IN_APP'] },
  { eventKey: 'PAYMENT_CONFIRMED', name: 'Payment Confirmed', category: 'PAYMENT', channels: ['EMAIL', 'IN_APP'] },
  
  // Security
  { eventKey: 'PASSWORD_CHANGED', name: 'Password Changed', category: 'SECURITY', channels: ['EMAIL'] },
  { eventKey: 'LOGIN_NEW_DEVICE', name: 'Login from New Device', category: 'SECURITY', channels: ['EMAIL'] },
  
  // Admin
  { eventKey: 'ADMIN_INVITED', name: 'Admin Invited', category: 'SYSTEM', channels: ['EMAIL'] },
  { eventKey: 'ADMIN_ROLE_CHANGED', name: 'Admin Role Changed', category: 'SYSTEM', channels: ['EMAIL'] }
];
```

---

## 🚀 Implementation Steps

### Step 1: Database (30 min)
```bash
# 1. Добавить модели в schema.prisma
# 2. Создать миграцию
npx prisma migrate dev --name add_notification_system

# 3. Создать seed
npx prisma db seed
```

### Step 2: Services (2 hours)
```bash
# Создать файлы:
src/lib/services/notification.service.ts
src/lib/services/event-emitter.service.ts
src/lib/services/notification-content.service.ts
```

### Step 3: Cron Job (30 min)
```typescript
// src/app/api/cron/process-notifications/route.ts

export async function GET() {
  await notificationService.processQueue();
  return NextResponse.json({ success: true });
}
```

### Step 4: Integration (1 hour)
```bash
# Добавить eventEmitter.emit() в:
- src/app/api/orders/route.ts (ORDER_CREATED)
- src/lib/services/kyc.service.ts (KYC_APPROVED, KYC_REJECTED)
- src/app/api/admin/orders/[id]/route.ts (ORDER_COMPLETED)
```

### Step 5: API для In-App (30 min)
```typescript
// src/app/api/notifications/route.ts

export async function GET() {
  const notifications = await prisma.notificationHistory.findMany({
    where: { userId, channel: 'IN_APP' },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  
  return NextResponse.json({ notifications });
}

// Mark as read
export async function PATCH(request: NextRequest) {
  const { notificationId } = await request.json();
  
  await prisma.notificationHistory.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() }
  });
  
  return NextResponse.json({ success: true });
}
```

---

## ✅ Результат

### Что получим:
1. ✅ Централизованная система событий
2. ✅ Очередь для асинхронной обработки
3. ✅ Email + In-App уведомления
4. ✅ Retry mechanism
5. ✅ Настройки пользователя (подписки)
6. ✅ История уведомлений
7. ✅ Готовность к шаблонам (Phase 2)

### Как использовать:
```typescript
// Просто emit событие из любого места
await eventEmitter.emit('ORDER_CREATED', { userId, orderId, ... });

// Всё остальное происходит автоматически:
// - Проверка подписок
// - Создание задач в очереди
// - Отправка email
// - Создание in-app уведомления
// - Логирование
```

---

## 📈 Phase 2: Email Templates (потом)

После реализации базовой системы добавим:
1. EmailTemplate model
2. Template editor в админке
3. Handlebars/Liquid для рендеринга
4. White-label support (BrandSettings)
5. A/B testing

---

**Время реализации:** 4-5 часов  
**Сложность:** Средняя  
**Зависимости:** Prisma, IntegrationFactory (уже есть)

**Начинаем?** 🚀

