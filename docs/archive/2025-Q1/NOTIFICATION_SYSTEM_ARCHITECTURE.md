# Notification System Architecture - Детальный анализ и план

## 🔍 Анализ текущей системы

### Что УЖЕ есть:

#### 1. **Audit & Logging** ✅
```typescript
// src/lib/services/audit.service.ts
- AuditService (для админов и системных событий)
- UserActivityService (40+ типов действий пользователя)
- SecurityAuditService (security события)
- AdminAuditLogService (действия админов)
```

#### 2. **Email Service** ✅
```typescript
// src/lib/services/email.ts
- sendWelcomeEmail() - базовая функция
- Интеграция с Resend
```

#### 3. **In-App Notifications** ✅
```typescript
// src/app/api/notifications/route.ts
- GET /api/notifications - возвращает уведомления из Orders + KYC
- Генерируются динамически из БД (нет отдельной таблицы)
```

#### 4. **Integration System** ✅
```typescript
// src/lib/integrations/
- IntegrationRegistry - реестр провайдеров
- IntegrationFactory - фабрика для получения активных провайдеров
- IEmailProvider - интерфейс для email провайдеров
- ResendAdapter - реализация Resend
```

#### 5. **Database Models** ✅
```prisma
- EmailLog - логи отправленных email
- Integration - настройки интеграций
- SystemSettings - системные настройки
```

---

## 🎯 Проблемы текущей системы

### 1. **Нет централизованной системы событий**
```typescript
// ❌ Сейчас: разбросано по коду
await prisma.order.create(...);
// TODO: Send email notification  ← забывают добавить

await prisma.kycSession.update(...);
// TODO: Send email notification  ← забывают добавить
```

### 2. **Нет очереди для email**
- Email отправляются синхронно
- Нет retry mechanism
- Нет rate limiting
- Нет приоритетов

### 3. **Hardcoded email контент**
```typescript
// ❌ Сейчас: контент в коде
const html = `<h1>Welcome ${firstName}!</h1>`;
```

### 4. **Нет персонализации по организациям**
- Все пользователи получают одинаковые email
- Нет white-label support

### 5. **Нет управления уведомлениями**
- Пользователь не может отключить уведомления
- Нет настроек (email/sms/push)
- Нет unsubscribe

---

## 🏗️ Архитектура новой системы

### Принципы проектирования:

1. **Event-Driven Architecture**
   - События генерируются в одном месте
   - Подписчики обрабатывают события
   - Слабая связанность компонентов

2. **Интеграция с существующей системой**
   - Использовать IntegrationFactory для email провайдеров
   - Использовать AuditService для логирования
   - Минимальные изменения в существующем коде

3. **Модульность**
   - Notification Service (ядро)
   - Email Channel (канал доставки)
   - SMS Channel (будущее)
   - Push Channel (будущее)

4. **White-Label Ready**
   - Поддержка multi-tenant
   - Кастомизация по организациям

---

## 📊 Database Schema

### 1. NotificationEvent (События)
```prisma
model NotificationEvent {
  id          String   @id @default(cuid())
  
  // Event identification
  eventType   String   // 'order.created', 'kyc.approved', 'user.registered'
  eventKey    String   @unique // 'ORDER_CREATED', 'KYC_APPROVED'
  
  // Metadata
  name        String   // "Order Created"
  description String?
  category    EventCategory
  
  // Channels (какие каналы использовать)
  channels    NotificationChannel[] // ['EMAIL', 'IN_APP', 'SMS']
  
  // Priority
  priority    EventPriority @default(NORMAL)
  
  // Status
  isActive    Boolean  @default(true)
  isSystem    Boolean  @default(true) // System events cannot be deleted
  
  // Relations
  subscriptions NotificationSubscription[]
  queue         NotificationQueue[]
  
  // Audit
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([eventType])
  @@index([category])
  @@index([isActive])
}

enum EventCategory {
  ORDER       // Order lifecycle events
  KYC         // KYC verification events
  PAYMENT     // Payment events
  SECURITY    // Security alerts
  SYSTEM      // System notifications
  MARKETING   // Marketing campaigns
}

enum EventPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum NotificationChannel {
  EMAIL
  IN_APP
  SMS
  PUSH
  WEBHOOK
}
```

### 2. NotificationSubscription (Подписки пользователей)
```prisma
model NotificationSubscription {
  id          String   @id @default(cuid())
  
  // User
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Event
  eventKey    String
  event       NotificationEvent @relation(fields: [eventKey], references: [eventKey])
  
  // Channels (какие каналы включены для этого события)
  emailEnabled   Boolean @default(true)
  inAppEnabled   Boolean @default(true)
  smsEnabled     Boolean @default(false)
  pushEnabled    Boolean @default(false)
  
  // Preferences
  frequency   NotificationFrequency @default(INSTANT)
  quietHours  Json? // { start: "22:00", end: "08:00", timezone: "Europe/Warsaw" }
  
  // Status
  isActive    Boolean  @default(true)
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([userId, eventKey])
  @@index([userId])
  @@index([eventKey])
}

enum NotificationFrequency {
  INSTANT     // Сразу
  HOURLY      // Раз в час (digest)
  DAILY       // Раз в день (digest)
  WEEKLY      // Раз в неделю (digest)
}
```

### 3. NotificationQueue (Очередь отправки)
```prisma
model NotificationQueue {
  id            String   @id @default(cuid())
  
  // Event
  eventKey      String
  event         NotificationEvent @relation(fields: [eventKey], references: [eventKey])
  
  // Recipient
  userId        String?
  user          User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipientEmail String? // For non-users (admin notifications)
  recipientPhone String?
  
  // Channel
  channel       NotificationChannel
  
  // Content
  subject       String?  // For email
  message       String   @db.Text
  data          Json     // Event data for rendering
  
  // Template
  templateKey   String?  // 'order_created', 'kyc_approved'
  
  // Status
  status        QueueStatus @default(PENDING)
  attempts      Int         @default(0)
  maxAttempts   Int         @default(3)
  
  // Scheduling
  scheduledFor  DateTime    @default(now())
  processedAt   DateTime?
  sentAt        DateTime?
  failedAt      DateTime?
  
  // Result
  messageId     String?     // Provider's message ID
  error         String?
  errorDetails  Json?
  
  // Provider
  providerId    String?     // Which email provider was used
  
  // Metadata
  metadata      Json?
  
  // Timestamps
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  @@index([status, scheduledFor])
  @@index([userId])
  @@index([channel])
  @@index([eventKey])
}

enum QueueStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
  CANCELLED
  SKIPPED  // User unsubscribed or quiet hours
}
```

### 4. NotificationHistory (История уведомлений)
```prisma
model NotificationHistory {
  id          String   @id @default(cuid())
  
  // User
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Event
  eventKey    String
  
  // Channel
  channel     NotificationChannel
  
  // Content
  title       String
  message     String   @db.Text
  data        Json?
  
  // Status
  isRead      Boolean  @default(false)
  readAt      DateTime?
  
  // Actions
  isClicked   Boolean  @default(false)
  clickedAt   DateTime?
  
  // Link
  actionUrl   String?
  
  // Timestamps
  createdAt   DateTime @default(now())
  
  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@index([eventKey])
}
```

### 5. EmailLog (Обновлённая модель)
```prisma
model EmailLog {
  id          String      @id @default(cuid())
  
  // Queue reference
  queueId     String?     @unique
  
  // User
  userId      String?
  user        User?       @relation(fields: [userId], references: [id])
  recipient   String      // Email address
  
  // Event
  eventKey    String?
  
  // Template
  templateKey String?
  
  // Provider
  providerId  String?     // 'resend', 'sendgrid', etc.
  
  // Content
  subject     String
  htmlContent String?     @db.Text
  textContent String?     @db.Text
  
  // Status
  status      EmailStatus @default(PENDING)
  sentAt      DateTime?
  deliveredAt DateTime?
  openedAt    DateTime?   // If tracking enabled
  clickedAt   DateTime?   // If tracking enabled
  bouncedAt   DateTime?
  failedAt    DateTime?
  
  // Result
  messageId   String?     // Provider's message ID
  error       String?
  errorCode   String?
  
  // Tracking
  opens       Int         @default(0)
  clicks      Int         @default(0)
  
  // Metadata
  metadata    Json?
  tags        String[]    // For filtering
  
  // Timestamps
  createdAt   DateTime    @default(now())
  
  @@index([userId])
  @@index([status])
  @@index([eventKey])
  @@index([providerId])
  @@index([recipient])
  @@index([createdAt])
}
```

---

## 🔧 Services Architecture

### 1. NotificationService (Ядро системы)
```typescript
// src/lib/services/notification.service.ts

interface TriggerNotificationOptions {
  eventKey: string;
  userId?: string;
  recipientEmail?: string;
  data: Record<string, any>;
  priority?: EventPriority;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

class NotificationService {
  /**
   * Главный метод - триггерит событие
   * Автоматически определяет каналы и создаёт задачи в очереди
   */
  async trigger(options: TriggerNotificationOptions): Promise<void> {
    // 1. Получить событие из БД
    const event = await this.getEvent(options.eventKey);
    
    // 2. Получить подписки пользователя (если userId есть)
    const subscription = await this.getSubscription(options.userId, options.eventKey);
    
    // 3. Определить активные каналы
    const channels = this.getActiveChannels(event, subscription);
    
    // 4. Создать задачи в очереди для каждого канала
    for (const channel of channels) {
      await this.queueNotification({
        eventKey: options.eventKey,
        userId: options.userId,
        recipientEmail: options.recipientEmail,
        channel,
        data: options.data,
        scheduledFor: options.scheduledFor || new Date(),
        metadata: options.metadata
      });
    }
    
    // 5. Логировать событие
    await this.logEvent(options);
  }
  
  /**
   * Обработка очереди (вызывается cron job)
   */
  async processQueue(): Promise<void> {
    const tasks = await prisma.notificationQueue.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: new Date() },
        attempts: { lt: prisma.notificationQueue.fields.maxAttempts }
      },
      take: 100, // Batch size
      orderBy: [
        { event: { priority: 'desc' } },
        { scheduledFor: 'asc' }
      ]
    });
    
    for (const task of tasks) {
      await this.processTask(task);
    }
  }
  
  /**
   * Обработка одной задачи
   */
  private async processTask(task: NotificationQueue): Promise<void> {
    try {
      // Update status
      await prisma.notificationQueue.update({
        where: { id: task.id },
        data: { 
          status: 'PROCESSING',
          attempts: { increment: 1 }
        }
      });
      
      // Send via channel
      switch (task.channel) {
        case 'EMAIL':
          await this.sendEmail(task);
          break;
        case 'IN_APP':
          await this.sendInApp(task);
          break;
        case 'SMS':
          await this.sendSMS(task);
          break;
        // ... other channels
      }
      
      // Mark as sent
      await prisma.notificationQueue.update({
        where: { id: task.id },
        data: { 
          status: 'SENT',
          sentAt: new Date()
        }
      });
      
    } catch (error) {
      await this.handleError(task, error);
    }
  }
  
  /**
   * Отправка email через IntegrationFactory
   */
  private async sendEmail(task: NotificationQueue): Promise<void> {
    // 1. Получить email провайдер через IntegrationFactory
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
    
    // 4. Логировать в EmailLog
    await prisma.emailLog.create({
      data: {
        queueId: task.id,
        userId: task.userId,
        recipient: task.recipientEmail || task.user?.email,
        eventKey: task.eventKey,
        subject: content.subject,
        htmlContent: content.html,
        textContent: content.text,
        status: result.success ? 'SENT' : 'FAILED',
        messageId: result.messageId,
        error: result.error,
        sentAt: result.success ? new Date() : null,
        providerId: emailProvider.providerId
      }
    });
  }
  
  /**
   * Отправка in-app уведомления
   */
  private async sendInApp(task: NotificationQueue): Promise<void> {
    if (!task.userId) return;
    
    await prisma.notificationHistory.create({
      data: {
        userId: task.userId,
        eventKey: task.eventKey,
        channel: 'IN_APP',
        title: task.subject || '',
        message: task.message,
        data: task.data,
        actionUrl: this.getActionUrl(task)
      }
    });
  }
}

export const notificationService = new NotificationService();
```

### 2. Event Emitter (Интеграция с существующим кодом)
```typescript
// src/lib/services/event-emitter.service.ts

class EventEmitterService {
  /**
   * Emit event - вызывается из бизнес-логики
   */
  async emit(eventKey: string, data: Record<string, any>): Promise<void> {
    // Trigger notification
    await notificationService.trigger({
      eventKey,
      userId: data.userId,
      data
    });
  }
}

export const eventEmitter = new EventEmitterService();
```

### 3. Notification Preferences Service
```typescript
// src/lib/services/notification-preferences.service.ts

class NotificationPreferencesService {
  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<NotificationSubscription[]> {
    return prisma.notificationSubscription.findMany({
      where: { userId },
      include: { event: true }
    });
  }
  
  /**
   * Update preference
   */
  async updatePreference(
    userId: string, 
    eventKey: string, 
    channels: {
      emailEnabled?: boolean;
      inAppEnabled?: boolean;
      smsEnabled?: boolean;
    }
  ): Promise<void> {
    await prisma.notificationSubscription.upsert({
      where: { 
        userId_eventKey: { userId, eventKey }
      },
      update: channels,
      create: {
        userId,
        eventKey,
        ...channels
      }
    });
  }
  
  /**
   * Unsubscribe from all
   */
  async unsubscribeAll(userId: string): Promise<void> {
    await prisma.notificationSubscription.updateMany({
      where: { userId },
      data: {
        emailEnabled: false,
        inAppEnabled: false,
        smsEnabled: false
      }
    });
  }
}

export const notificationPreferencesService = new NotificationPreferencesService();
```

---

## 🔌 Интеграция с существующим кодом

### Пример 1: Order Created
```typescript
// src/app/api/orders/route.ts

// ❌ Было:
const order = await prisma.order.create({ ... });
// TODO: Send email notification

// ✅ Стало:
const order = await prisma.order.create({ ... });

// Emit event
await eventEmitter.emit('ORDER_CREATED', {
  userId: order.userId,
  orderId: order.id,
  orderNumber: order.paymentReference,
  cryptoAmount: order.cryptoAmount,
  cryptoCurrency: order.currencyCode,
  fiatAmount: order.totalFiat,
  fiatCurrency: order.fiatCurrencyCode,
  walletAddress: order.walletAddress,
  expiresAt: order.expiresAt
});
```

### Пример 2: KYC Approved
```typescript
// src/lib/services/kyc.service.ts

// ❌ Было:
await prisma.kycSession.update({ ... });
// TODO: Send email notification

// ✅ Стало:
const session = await prisma.kycSession.update({ ... });

await eventEmitter.emit('KYC_APPROVED', {
  userId: session.userId,
  kycLevel: 'L1',
  approvedAt: new Date()
});
```

---

## 📧 Email Content (Временное решение)

### До реализации шаблонов:
```typescript
// src/lib/services/notification-content.service.ts

class NotificationContentService {
  /**
   * Render email content for event
   */
  async renderEmail(eventKey: string, data: Record<string, any>): Promise<{
    subject: string;
    html: string;
    text: string;
  }> {
    switch (eventKey) {
      case 'ORDER_CREATED':
        return {
          subject: `Order ${data.orderNumber} Created`,
          html: this.renderOrderCreatedHtml(data),
          text: this.renderOrderCreatedText(data)
        };
      
      case 'KYC_APPROVED':
        return {
          subject: 'KYC Verification Approved',
          html: this.renderKycApprovedHtml(data),
          text: this.renderKycApprovedText(data)
        };
      
      // ... other events
    }
  }
  
  private renderOrderCreatedHtml(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #3B82F6; color: white; padding: 20px; }
            .content { padding: 20px; }
            .button { background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Created</h1>
            </div>
            <div class="content">
              <p>Your order has been created successfully!</p>
              <p><strong>Order Number:</strong> ${data.orderNumber}</p>
              <p><strong>Amount:</strong> ${data.cryptoAmount} ${data.cryptoCurrency}</p>
              <p><strong>Total:</strong> ${data.fiatAmount} ${data.fiatCurrency}</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${data.orderId}" class="button">View Order</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
```

---

## 🚀 Implementation Plan

### Phase 1: Core Notification System (Week 1)
- [ ] Create database schema (NotificationEvent, NotificationQueue, etc.)
- [ ] Create migrations
- [ ] Implement NotificationService
- [ ] Implement EventEmitterService
- [ ] Create seed data for default events

### Phase 2: Email Channel (Week 1-2)
- [ ] Integrate with IntegrationFactory
- [ ] Implement email rendering (temporary, without templates)
- [ ] Create NotificationContentService
- [ ] Update EmailLog model

### Phase 3: Integration with Business Logic (Week 2)
- [ ] Add eventEmitter.emit() to Order creation
- [ ] Add eventEmitter.emit() to KYC approval/rejection
- [ ] Add eventEmitter.emit() to Payment events
- [ ] Add eventEmitter.emit() to Admin actions

### Phase 4: Queue Processing (Week 2)
- [ ] Create cron job for queue processing
- [ ] Implement retry mechanism
- [ ] Add error handling
- [ ] Add rate limiting

### Phase 5: User Preferences (Week 3)
- [ ] Create NotificationPreferencesService
- [ ] Create UI for notification settings
- [ ] Implement unsubscribe functionality
- [ ] Add quiet hours support

### Phase 6: In-App Notifications (Week 3)
- [ ] Update /api/notifications to use NotificationHistory
- [ ] Add real-time updates (optional: WebSocket/SSE)
- [ ] Add mark as read functionality
- [ ] Update ClientHeader component

### Phase 7: Admin UI (Week 4)
- [ ] Create page for managing events
- [ ] Create page for viewing queue
- [ ] Create page for viewing email logs
- [ ] Add statistics and monitoring

---

## 🎯 После этого: Email Templates System

После реализации Notification System, мы добавим:
1. EmailTemplate model
2. Template editor в админке
3. Template rendering engine
4. A/B testing
5. White-label support

---

## ✅ Преимущества подхода

1. **Минимальные изменения в коде**
   - Просто добавляем `eventEmitter.emit()`
   - Вся логика в NotificationService

2. **Использование существующей инфраструктуры**
   - IntegrationFactory для email провайдеров
   - AuditService для логирования
   - Prisma для БД

3. **Готовность к масштабированию**
   - Очередь для асинхронной обработки
   - Поддержка multiple каналов
   - Готовность к шаблонам

4. **User-friendly**
   - Пользователь может управлять подписками
   - Quiet hours
   - Unsubscribe

---

**Готовы начать реализацию?** 🚀

**Предлагаю начать с Phase 1: Core Notification System**

