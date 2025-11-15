# 🔥 Автоматическая отправка уведомлений

## ❌ ПРОБЛЕМА

Email уведомления добавлялись в очередь (`NotificationQueue`), но **не отправлялись автоматически**.

### Что было:
```
1. Регистрация пользователя
2. eventEmitter.emit('WELCOME_EMAIL')
3. NotificationService.send() → создает запись в NotificationQueue
4. ❌ СТОП! Письмо не отправляется
5. Нужно было вручную вызывать processPendingNotifications()
```

### Симптомы:
- ✅ In-app уведомление создается
- ❌ Email не приходит
- ⚠️ В логах: `✅ Notification queued for WELCOME_EMAIL`
- ❌ Но нет: `📧 Sending email via Resend`

---

## ✅ РЕШЕНИЕ

Добавлена **автоматическая обработка очереди** сразу после создания записи.

### Файл: `src/lib/services/notification.service.ts`

```typescript
// 5. Create queue entries for each channel
for (const ch of channelsToUse) {
  const queueEntry = await prisma.notificationQueue.create({
    data: {
      eventKey,
      userId: data.userId,
      recipientEmail: data.recipientEmail,
      channel: ch,
      subject: data.subject,
      message: data.message,
      data: enrichedData,
      status: 'PENDING',
      scheduledFor: scheduledFor || new Date(),
    },
  });
  
  queueIds.push(queueEntry.id);
  
  // ... IN_APP logic ...
  
  // 🔥 AUTO-PROCESS: Send immediately if not scheduled for future
  const isScheduledForFuture = scheduledFor && scheduledFor > new Date();
  if (!isScheduledForFuture) {
    // Process in background (don't await to avoid blocking)
    this.processNotification(queueEntry).catch(error => {
      console.error(`❌ Auto-process failed for ${queueEntry.id}:`, error);
    });
  }
}
```

---

## 🎯 КАК ЭТО РАБОТАЕТ

### Новый флоу:
```
1. Регистрация пользователя
2. eventEmitter.emit('WELCOME_EMAIL')
3. NotificationService.send() → создает запись в NotificationQueue
4. 🔥 АВТОМАТИЧЕСКИ вызывается processNotification()
5. 📧 Email отправляется через Resend
6. ✅ Статус обновляется на SENT
```

### Логика:
1. **Создается запись** в `NotificationQueue` со статусом `PENDING`
2. **Проверяется** не запланировано ли на будущее (`scheduledFor`)
3. **Если сейчас** → сразу вызывается `processNotification()`
4. **Если будущее** → останется в очереди для cron job

### Background processing:
```typescript
// Не ждем завершения (don't await)
this.processNotification(queueEntry).catch(error => {
  console.error(`❌ Auto-process failed:`, error);
});
```

**Почему без await?**
- ✅ Не блокирует ответ API
- ✅ Быстрый response для пользователя
- ✅ Email отправляется в фоне
- ✅ Ошибки логируются

---

## 📊 ЛОГИ

### Успешная отправка:
```
🔔 Event emitted: WELCOME_EMAIL
🔍 Building real data for event: WELCOME_EMAIL
✅ Real data built for WELCOME_EMAIL: [userName, loginUrl, ...]
✅ Notification queued for WELCOME_EMAIL: [queue-id-1, queue-id-2]

📧 Sending email via Resend
🔧 ResendAdapter.initialize() called
✅ Resend client initialized
📧 Sending email via Resend: from=onboarding@resend.dev, to=user@example.com
✅ Email sent successfully via Resend: [message-id]
✅ Email sent to user@example.com via resend: Welcome to Apricode Exchange!
```

### Если событие отключено:
```
🔔 Event emitted: ORDER_CREATED
❌ Failed to send notification for ORDER_CREATED: Event "ORDER_CREATED" is not active
```

---

## 🔧 ДОПОЛНИТЕЛЬНО СОЗДАНО

### API Endpoint для ручной обработки
**Файл:** `src/app/api/admin/notifications/process-queue/route.ts`

```typescript
POST /api/admin/notifications/process-queue

// Вручную обработать всю очередь (для запланированных уведомлений)
```

**Использование:**
- Для cron job (обработка запланированных уведомлений)
- Для ручного повтора при ошибках
- Для тестирования

---

## 🎯 ПРЕИМУЩЕСТВА

### 1. Автоматическая отправка
- ✅ Email отправляется сразу
- ✅ Не нужно вручную обрабатывать очередь
- ✅ Работает "из коробки"

### 2. Запланированные уведомления
- ✅ Если `scheduledFor` в будущем → остается в очереди
- ✅ Можно обработать позже через cron job
- ✅ Гибкость для отложенной отправки

### 3. Надежность
- ✅ Запись в БД (не потеряется)
- ✅ Можно повторить при ошибке
- ✅ История отправок

### 4. Производительность
- ✅ Не блокирует API response
- ✅ Отправка в фоне
- ✅ Быстрый ответ пользователю

---

## 🧪 ТЕСТИРОВАНИЕ

### 1. Регистрация (WELCOME_EMAIL)
```bash
# 1. Зарегистрироваться
http://localhost:3000/register
Email: test@example.com

# 2. Проверить логи
✅ Notification queued for WELCOME_EMAIL
📧 Sending email via Resend
✅ Email sent successfully

# 3. Проверить почту
✅ Welcome письмо пришло
```

### 2. Создание заказа (ORDER_CREATED)
```bash
# 1. Создать заказ
http://localhost:3000/buy

# 2. Проверить логи
✅ Notification queued for ORDER_CREATED
📧 Sending email via Resend
✅ Email sent successfully

# 3. Проверить почту
✅ Order Created письмо пришло
```

### 3. Отключенное событие
```bash
# 1. Отключить событие
http://localhost:3000/admin/notification-events
Переключить ORDER_CREATED в OFF

# 2. Создать заказ
# 3. Проверить логи
❌ Failed to send notification: Event "ORDER_CREATED" is not active

# 4. Проверить почту
❌ Письмо НЕ пришло (как и ожидалось)
```

---

## 📝 ИТОГ

✅ **Автоматическая отправка email настроена**
- Письма отправляются сразу после создания
- Не нужно вручную обрабатывать очередь
- Работает для всех событий (WELCOME_EMAIL, ORDER_CREATED, KYC_APPROVED, etc.)

✅ **Система гибкая**
- Можно запланировать на будущее
- Можно обработать вручную через API
- Можно настроить cron job

✅ **Готово к production**
- Надежная очередь в БД
- Логирование всех действий
- Обработка ошибок

🚀 **Система уведомлений полностью работает!**

