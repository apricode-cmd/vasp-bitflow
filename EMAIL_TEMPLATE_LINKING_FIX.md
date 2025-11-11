# 🔗 Исправление связи событий с email шаблонами

## ❌ ПРОБЛЕМА

Email уведомления отправлялись с **дефолтным шаблоном GENERIC** вместо красивых кастомных шаблонов (WELCOME_EMAIL, ORDER_CREATED и т.д.).

### Симптомы:
```
✅ Email sent successfully via Resend
❌ Template: GENERIC (вместо WELCOME_EMAIL)
❌ Template ID: null
❌ Простое письмо без дизайна
```

### Что было в логах:
```sql
-- EmailLog
template: "GENERIC"
templateId: null

-- NotificationQueue
templateKey: null

-- NotificationEvent
templateKey: null  ❌ ВОТ ПРОБЛЕМА!
```

---

## 🔍 ПРИЧИНА

**2 проблемы:**

### 1. NotificationEvent.templateKey был NULL
```typescript
// В базе данных
NotificationEvent {
  eventKey: 'WELCOME_EMAIL',
  templateKey: null,  // ❌ Не связан с шаблоном!
  channels: ['EMAIL', 'IN_APP']
}
```

### 2. templateKey не передавался в NotificationQueue
```typescript
// Старый код в NotificationService.send()
const queueEntry = await prisma.notificationQueue.create({
  data: {
    eventKey,
    channel: ch,
    // ❌ templateKey отсутствовал!
  },
});
```

---

## ✅ РЕШЕНИЕ

### 1. Обновили NotificationService
**Файл:** `src/lib/services/notification.service.ts`

```typescript
// 5. Create queue entries for each channel
const queueIds: string[] = [];

// ✅ Get templateKey from event (use eventKey as fallback)
const templateKey = event.templateKey || eventKey;

for (const ch of channelsToUse) {
  const queueEntry = await prisma.notificationQueue.create({
    data: {
      eventKey,
      userId: data.userId,
      recipientEmail: data.recipientEmail,
      recipientPhone: data.recipientPhone,
      channel: ch,
      subject: data.subject,
      message: data.message,
      data: enrichedData,
      templateKey: ch === 'EMAIL' ? templateKey : undefined, // ✅ Передаем для EMAIL
      status: 'PENDING',
      scheduledFor: scheduledFor || new Date(),
    },
  });
  
  // ... rest of code
}
```

### 2. Связали события с шаблонами в БД
**Скрипт:**

```typescript
const mappings = [
  { eventKey: 'WELCOME_EMAIL', templateKey: 'WELCOME_EMAIL' },
  { eventKey: 'ORDER_CREATED', templateKey: 'ORDER_CREATED' },
  { eventKey: 'ORDER_COMPLETED', templateKey: 'ORDER_COMPLETED' },
  { eventKey: 'ORDER_CANCELLED', templateKey: 'ORDER_CANCELLED' },
  { eventKey: 'KYC_APPROVED', templateKey: 'KYC_APPROVED' },
  { eventKey: 'KYC_REJECTED', templateKey: 'KYC_REJECTED' },
  // ... и другие
];

for (const { eventKey, templateKey } of mappings) {
  await prisma.notificationEvent.update({
    where: { eventKey },
    data: { templateKey }
  });
}
```

**Результат:**
```
✅ WELCOME_EMAIL -> WELCOME_EMAIL
✅ ORDER_CREATED -> ORDER_CREATED
✅ ORDER_COMPLETED -> ORDER_COMPLETED
✅ ORDER_CANCELLED -> ORDER_CANCELLED
✅ KYC_APPROVED -> KYC_APPROVED
✅ KYC_REJECTED -> KYC_REJECTED
```

---

## 🎯 КАК ЭТО РАБОТАЕТ ТЕПЕРЬ

### Полный флоу:

```
1. Регистрация пользователя
   ↓
2. eventEmitter.emit('WELCOME_EMAIL', { userId, ... })
   ↓
3. NotificationService.send()
   ├─ Получает NotificationEvent из БД
   │  └─ event.templateKey = 'WELCOME_EMAIL' ✅
   ├─ Создает NotificationQueue
   │  └─ queue.templateKey = 'WELCOME_EMAIL' ✅
   └─ Автоматически вызывает processNotification()
      ↓
4. EmailNotificationService.sendNotificationEmail()
   ├─ Получает templateKey = 'WELCOME_EMAIL' ✅
   ├─ EmailTemplateService.render({ templateKey: 'WELCOME_EMAIL' })
   │  └─ Находит EmailTemplate с key='WELCOME_EMAIL'
   │  └─ Рендерит красивый HTML с white-label
   └─ Отправляет через Resend
      ↓
5. EmailLog
   ├─ template: 'WELCOME_EMAIL' ✅
   ├─ templateId: 'cmhuc01r7002vag1niugisklv' ✅
   └─ Красивое письмо с дизайном! 🎉
```

---

## 📊 ДО vs ПОСЛЕ

### ❌ ДО (GENERIC шаблон):
```
Subject: Welcome to Apricode Exchange!
Template: GENERIC
Template ID: null

┌─────────────────────────────┐
│ Welcome to Apricode Exchange!│
│                              │
│ Your message here...         │
│                              │
│ Best regards,                │
│ Apricode Exchange Team       │
└─────────────────────────────┘
```

### ✅ ПОСЛЕ (WELCOME_EMAIL шаблон):
```
Subject: Welcome to Apricode Exchange!
Template: WELCOME_EMAIL
Template ID: cmhuc01r7002vag1niugisklv

┌─────────────────────────────────────┐
│ [GRADIENT HEADER]                   │
│ 🎉 Apricode Exchange                │
│                                     │
│ Welcome, Bohdan!                    │
│                                     │
│ We're excited to have you...        │
│                                     │
│ ┌─────────────────┐                │
│ │  Get Started →  │                │
│ └─────────────────┘                │
│                                     │
│ [FOOTER with white-label]           │
│ © 2024 Apricode Exchange            │
│ support@apricode.exchange           │
└─────────────────────────────────────┘
```

---

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Database Schema:
```prisma
model NotificationEvent {
  id          String   @id @default(cuid())
  eventKey    String   @unique
  templateKey String?  // ✅ Связь с EmailTemplate
  channels    NotificationChannel[]
  // ...
}

model EmailTemplate {
  id      String  @id @default(cuid())
  key     String  @unique  // 'WELCOME_EMAIL', 'ORDER_CREATED', etc.
  name    String
  subject String
  body    String  @db.Text
  layout  String  @default("default")
  // ...
}

model NotificationQueue {
  id          String   @id @default(cuid())
  eventKey    String
  templateKey String?  // ✅ Передается из NotificationEvent
  channel     NotificationChannel
  // ...
}

model EmailLog {
  id         String   @id @default(cuid())
  template   String   // ✅ Теперь 'WELCOME_EMAIL' вместо 'GENERIC'
  templateId String?  // ✅ Теперь есть ID шаблона
  // ...
}
```

### Fallback Logic:
```typescript
// Если event.templateKey = null, используем eventKey
const templateKey = event.templateKey || eventKey;

// Если шаблон не найден, используем GENERIC
const rendered = await emailTemplateService.render({
  templateKey: templateKey || 'GENERIC',
  variables: data,
});
```

---

## 🧪 ТЕСТИРОВАНИЕ

### 1. Проверка связи в БД:
```typescript
const event = await prisma.notificationEvent.findUnique({
  where: { eventKey: 'WELCOME_EMAIL' }
});

console.log(event.templateKey); // ✅ 'WELCOME_EMAIL'
```

### 2. Регистрация пользователя:
```bash
# 1. Зарегистрироваться
http://localhost:3000/register
Email: test@example.com

# 2. Проверить логи
✅ Email sent successfully via Resend: [message-id]
✅ Template: WELCOME_EMAIL (не GENERIC!)
✅ Template ID: cmhuc01r7002vag1niugisklv

# 3. Проверить почту
✅ Красивое письмо с градиентом, кнопкой, footer
```

### 3. Проверка в БД:
```sql
-- EmailLog
SELECT template, templateId FROM "EmailLog" ORDER BY "createdAt" DESC LIMIT 1;
-- Result: template='WELCOME_EMAIL', templateId='cmhuc...'

-- NotificationQueue
SELECT templateKey FROM "NotificationQueue" WHERE eventKey='WELCOME_EMAIL' ORDER BY "createdAt" DESC LIMIT 1;
-- Result: templateKey='WELCOME_EMAIL'
```

---

## 📝 ИТОГ

✅ **Проблема решена полностью:**
1. ✅ NotificationEvent связаны с EmailTemplate через `templateKey`
2. ✅ `templateKey` передается в `NotificationQueue`
3. ✅ `EmailTemplateService` использует правильный шаблон
4. ✅ Email приходят с красивым дизайном
5. ✅ Логи показывают правильный template и templateId

✅ **Все события настроены:**
- WELCOME_EMAIL
- ORDER_CREATED
- ORDER_COMPLETED
- ORDER_CANCELLED
- KYC_APPROVED
- KYC_REJECTED

✅ **Система работает end-to-end:**
- Регистрация → событие → очередь → email → красивое письмо

🚀 **Готово к production!**

