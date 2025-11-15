# 🔄 Notification Events Toggle Feature

## ✅ ЧТО РЕАЛИЗОВАНО

### 1. Глобальная проверка `isActive` в NotificationService
**Файл:** `src/lib/services/notification.service.ts`

```typescript
// Строки 90-95
if (!event.isActive) {
  return {
    success: false,
    error: `Event "${eventKey}" is not active`,
  };
}
```

✅ **Работает автоматически для всех событий**
- Если событие `isActive: false` → уведомление НЕ отправляется
- Если событие `isActive: true` → уведомление отправляется

---

### 2. UI для управления событиями
**Файл:** `src/app/(admin)/admin/notification-events/page.tsx`

#### 2.1. Быстрый переключатель в таблице
- ✅ Switch прямо в строке события
- ✅ Показывает текущий статус (Active/Inactive)
- ✅ Работает для ВСЕХ событий (включая системные)
- ✅ Disabled во время загрузки

```tsx
<div className="flex items-center gap-2 ml-auto">
  <span className="text-xs text-muted-foreground">
    {event.isActive ? 'Active' : 'Inactive'}
  </span>
  <Switch
    checked={event.isActive}
    onCheckedChange={() => handleToggleActive(event)}
    disabled={actionLoading}
  />
</div>
```

#### 2.2. Массовое управление
- ✅ **Enable All** - включить все события
- ✅ **Disable All** - выключить все события
- ✅ Показывает количество успешно обработанных событий
- ✅ Показывает ошибки если есть

```tsx
<Button onClick={handleEnableAll}>
  <CheckCircle className="h-4 w-4 mr-2" />
  Enable All
</Button>
<Button onClick={handleDisableAll}>
  <XCircle className="h-4 w-4 mr-2" />
  Disable All
</Button>
```

#### 2.3. Dropdown Menu
- ✅ View Details - для всех событий
- ✅ Edit Event - только для НЕ системных
- ✅ Delete - только для НЕ системных
- ✅ Информация о системных событиях

---

### 3. API Endpoint
**Файл:** `src/app/api/admin/notification-events/[eventKey]/route.ts`

```typescript
PATCH /api/admin/notification-events/{eventKey}
Body: { isActive: boolean }
```

✅ **Обновляет статус события в БД**
- Принимает `isActive: true/false`
- Обновляет запись в `NotificationEvent`
- Возвращает обновленное событие

---

## 🎯 КАК ЭТО РАБОТАЕТ

### Сценарий 1: Отключение события

1. **Админ** заходит на `/admin/notification-events`
2. **Находит** событие `ORDER_CREATED`
3. **Переключает** Switch в положение OFF
4. **Система:**
   - Отправляет `PATCH /api/admin/notification-events/ORDER_CREATED`
   - Обновляет `isActive: false` в БД
   - Показывает toast "Event deactivated"
   - Обновляет список событий

5. **Результат:**
   - При попытке отправить `ORDER_CREATED` уведомление
   - `NotificationService.send()` проверяет `isActive`
   - Возвращает ошибку: `Event "ORDER_CREATED" is not active`
   - Уведомление **НЕ отправляется**

### Сценарий 2: Массовое отключение

1. **Админ** нажимает "Disable All"
2. **Система:**
   - Перебирает все активные события
   - Для каждого отправляет `PATCH` запрос
   - Обновляет `isActive: false`
   - Считает успешные/неудачные операции
   - Показывает итоговый toast

3. **Результат:**
   - Все события отключены
   - Уведомления **НЕ отправляются** ни по одному событию

---

## 📊 ИНТЕГРАЦИЯ С СИСТЕМОЙ

### 1. EventEmitterService
```typescript
// src/lib/services/event-emitter.service.ts
await eventEmitter.emit('ORDER_CREATED', {
  userId: 'user123',
  orderId: 'order456'
});

// ↓ Вызывает NotificationService.send()
// ↓ Проверяет isActive
// ↓ Если false → не отправляет
```

### 2. Регистрация пользователя
```typescript
// src/app/api/auth/register/route.ts
await eventEmitter.emit('WELCOME_EMAIL', {
  userId: user.id,
  recipientEmail: user.email,
  userName: `${firstName} ${lastName}`
});

// ↓ Если WELCOME_EMAIL.isActive = false
// ↓ Письмо НЕ отправится
```

### 3. Создание заказа
```typescript
// src/app/api/orders/route.ts
await eventEmitter.emit('ORDER_CREATED', {
  userId: order.userId,
  orderId: order.id
});

// ↓ Если ORDER_CREATED.isActive = false
// ↓ Уведомление НЕ отправится
```

---

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### База данных
```prisma
model NotificationEvent {
  id          String   @id @default(cuid())
  eventKey    String   @unique
  name        String
  isActive    Boolean  @default(true)  // ← Ключевое поле
  isSystem    Boolean  @default(false)
  // ... остальные поля
}
```

### Логика проверки
```typescript
// 1. Получаем событие из БД
const event = await prisma.notificationEvent.findUnique({
  where: { eventKey }
});

// 2. Проверяем isActive
if (!event.isActive) {
  return { success: false, error: 'Event is not active' };
}

// 3. Продолжаем отправку только если isActive = true
```

---

## 🎨 UI СОСТОЯНИЯ

### Активное событие
```
┌─────────────────────────────────────────────────┐
│ 📬 Order Created                                │
│ ORDER | NORMAL | System                         │
│ Triggered when a new order is created           │
│ Key: ORDER_CREATED | Channels: EMAIL, IN_APP    │
│                                  Active [✓ ON]  │
└─────────────────────────────────────────────────┘
```

### Неактивное событие
```
┌─────────────────────────────────────────────────┐
│ 📬 Order Created                                │
│ ORDER | NORMAL | System                         │
│ Triggered when a new order is created           │
│ Key: ORDER_CREATED | Channels: EMAIL, IN_APP    │
│                                Inactive [  OFF] │
└─────────────────────────────────────────────────┘
```

### Статистика
```
┌──────────┬──────────┬──────────┬──────────┐
│  Total   │  Active  │ Inactive │  System  │
│    18    │    15    │     3    │    17    │
└──────────┴──────────┴──────────┴──────────┘
```

---

## 🚀 ИСПОЛЬЗОВАНИЕ

### Для администраторов

1. **Отключить конкретное событие:**
   - Перейти на `/admin/notification-events`
   - Найти событие
   - Переключить Switch в OFF

2. **Отключить все события (например, для обслуживания):**
   - Нажать "Disable All"
   - Подтвердить в toast

3. **Включить обратно:**
   - Нажать "Enable All"
   - Или включить события по отдельности

### Для разработчиков

```typescript
// События автоматически проверяются на isActive
// Ничего дополнительно делать не нужно!

await eventEmitter.emit('ORDER_CREATED', payload);
// ↑ Если событие отключено, уведомление не отправится
```

---

## 📝 ЛОГИРОВАНИЕ

### При отключенном событии
```
❌ Failed to send notification for ORDER_CREATED: Event "ORDER_CREATED" is not active
```

### При успешной отправке
```
🔔 Event emitted: ORDER_CREATED
✅ Notification queued for ORDER_CREATED: [queue-id-123]
```

---

## ✅ ПРЕИМУЩЕСТВА

1. **Гибкость** - можно отключить любое событие без изменения кода
2. **Безопасность** - системные события можно отключить (но не удалить)
3. **Массовое управление** - быстро отключить/включить все события
4. **Визуальная индикация** - сразу видно какие события активны
5. **Глобальная интеграция** - работает автоматически для всех событий
6. **Логирование** - все действия логируются

---

## 🎯 ИТОГ

✅ **Система полностью интегрирована**
- Проверка `isActive` в `NotificationService`
- UI для управления в админ-панели
- Массовое включение/выключение
- Работает для всех событий (включая системные)

✅ **Готово к production**
- Все события можно контролировать
- Удобный UI
- Автоматическая проверка
- Логирование всех действий

🚀 **Система уведомлений полностью управляемая и гибкая!**

