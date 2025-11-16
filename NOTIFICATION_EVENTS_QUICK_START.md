# 🚀 Notification Events - Quick Start Guide

**5-минутный гайд для быстрого старта**

---

## 📍 Где находится UI?

```
/admin/notification-events
```

**AdminSidebar:** `System & Configuration` → `Notification Events`

**Требуется:** `SUPER_ADMIN` role

---

## ⚡ Быстрое создание события

### Шаг 1: Создать Email Template (если еще нет)

`/admin/email-templates` → `Create Template`

```
Key: MY_CUSTOM_EVENT
Name: My Custom Notification
Category: ORDER (выбери подходящую)
Subject: {{title}}
Body: <p>Hi {{userName}}, {{message}}</p>
Variables: { "userName": "User Name", "title": "Title", "message": "Message" }
Status: PUBLISHED
Active: ✅
```

### Шаг 2: Создать Notification Event

`/admin/notification-events` → `Create Event`

```
Event Key: MY_CUSTOM_EVENT
Event Name: My Custom Event
Description: My custom notification
Category: ORDER
Priority: NORMAL
Channels: [EMAIL, IN_APP]
Email Template: "My Custom Notification" (select from dropdown)

Required Variables:
  - userId
  - userName
  - title
  - message

Example Payload:
{
  "userId": "cm4n123",
  "userName": "John Doe",
  "title": "Hello",
  "message": "This is a test notification"
}

Active: ✅
```

### Шаг 3: Вызвать в коде

```typescript
import { eventEmitter } from '@/lib/services/event-emitter.service';

// В любом API route или Server Action:
try {
  await eventEmitter.emit('MY_CUSTOM_EVENT', {
    userId: 'cm4n123',
    userName: 'John Doe',
    title: 'Hello',
    message: 'This is a test notification'
  });
  
  console.log('✅ Notification sent!');
} catch (error) {
  console.error('❌ Notification failed:', error);
}
```

### Шаг 4: Проверить результат

1. **Email:** Проверь inbox пользователя
2. **Queue:** `/admin/notification-queue` - должна быть запись `SENT`
3. **Logs:** Проверь console logs в terminal

---

## 🎯 Готовые примеры

### Пример 1: Order Notification

```typescript
// src/app/api/orders/route.ts
import { eventEmitter } from '@/lib/services/event-emitter.service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  // ... create order logic
  
  const order = await prisma.order.create({
    data: { /* ... */ },
    include: { user: { select: { email: true, profile: true } } }
  });

  // Send notification
  try {
    await eventEmitter.emit('ORDER_CREATED', {
      userId: order.userId,
      orderId: order.id,
      orderReference: order.paymentReference,
      cryptoAmount: order.cryptoAmount,
      cryptoCurrency: order.currencyCode,
      totalFiat: order.totalFiat,
      fiatCurrency: order.fiatCurrencyCode,
      walletAddress: order.walletAddress,
      userName: `${order.user.profile?.firstName} ${order.user.profile?.lastName}`,
      orderUrl: `${process.env.NEXTAUTH_URL}/orders/${order.id}`
    });
    
    console.log(`✅ [NOTIFICATION] ORDER_CREATED sent for order ${order.id}`);
  } catch (notifError) {
    // Don't fail order creation if notification fails
    console.error('❌ [NOTIFICATION] Failed:', notifError);
  }

  return NextResponse.json({ success: true, order });
}
```

### Пример 2: KYC Approval

```typescript
// src/app/api/admin/kyc/[id]/route.ts
import { eventEmitter } from '@/lib/services/event-emitter.service';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { status, rejectionReason } = await request.json();

  const kycSession = await prisma.kycSession.update({
    where: { id: params.id },
    data: { status, rejectionReason },
    include: { user: { select: { email: true } } }
  });

  // Send notification based on status
  try {
    if (status === 'APPROVED') {
      await eventEmitter.emit('KYC_APPROVED', {
        userId: kycSession.userId,
        recipientEmail: kycSession.user.email,
      });
      console.log(`✅ [NOTIFICATION] KYC_APPROVED sent for user ${kycSession.userId}`);
    } else if (status === 'REJECTED') {
      await eventEmitter.emit('KYC_REJECTED', {
        userId: kycSession.userId,
        recipientEmail: kycSession.user.email,
        reason: rejectionReason || 'No reason provided',
      });
      console.log(`✅ [NOTIFICATION] KYC_REJECTED sent for user ${kycSession.userId}`);
    }
  } catch (notifError) {
    console.error('❌ [NOTIFICATION] Failed:', notifError);
  }

  return NextResponse.json({ success: true, kycSession });
}
```

### Пример 3: Security Alert

```typescript
// src/app/api/2fa/enable/route.ts
import { eventEmitter } from '@/lib/services/event-emitter.service';
import { getClientSession } from '@/auth-client';

export async function POST(request: NextRequest) {
  const session = await getClientSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... enable 2FA logic

  // Send notification
  try {
    await eventEmitter.emit('SECURITY_2FA_ENABLED', {
      userId: session.user.id,
      recipientEmail: session.user.email,
      userName: session.user.name || 'User',
      method: 'TOTP',
      dashboardUrl: `${process.env.NEXTAUTH_URL}/profile/security`
    });
    
    console.log(`✅ [NOTIFICATION] SECURITY_2FA_ENABLED sent for user ${session.user.id}`);
  } catch (notifError) {
    console.error('❌ [NOTIFICATION] Failed:', notifError);
  }

  return NextResponse.json({ success: true });
}
```

### Пример 4: Admin Alert

```typescript
// src/app/api/admin/admins/invite/route.ts
import { eventEmitter } from '@/lib/services/event-emitter.service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const { email, firstName, lastName, role } = await request.json();

  // ... create admin invite logic

  const admin = await prisma.admin.create({
    data: { email, firstName, lastName, role }
  });

  // Send invitation email
  try {
    await eventEmitter.emit('ADMIN_INVITED', {
      userId: admin.id,
      recipientEmail: admin.email,
      adminName: `${admin.firstName} ${admin.lastName}`,
      inviteUrl: `${process.env.NEXTAUTH_URL}/admin/invite/${admin.inviteToken}`,
      role: admin.role,
      invitedBy: session.user.name || 'Admin'
    });
    
    console.log(`✅ [NOTIFICATION] ADMIN_INVITED sent to ${admin.email}`);
  } catch (notifError) {
    console.error('❌ [NOTIFICATION] Failed:', notifError);
  }

  return NextResponse.json({ success: true, admin });
}
```

---

## 🔧 Управление событиями через UI

### Включить/Выключить событие

`/admin/notification-events` → Find event → Toggle switch

**Быстрое отключение:**
- Switch OFF → событие перестанет отправлять уведомления
- Switch ON → событие снова активно

### Bulk Operations

**Enable All:**
- Кнопка `Enable All` → включит все неактивные события

**Disable All:**
- Кнопка `Disable All` → отключит все активные события

**Use Case:** Отключить все notifications во время maintenance

### Редактировать событие

1. Click `⋮` (three dots) → `Edit Event`
2. Изменить нужные поля
3. `Update Event`

**Что можно изменить:**
- ✅ Name
- ✅ Description
- ✅ Channels
- ✅ Priority
- ✅ Template
- ✅ Variables
- ✅ Active status
- ❌ Event Key (нельзя после создания)

### Просмотр статистики

Click `⋮` → `View Details`

**Статистика:**
- **Subscriptions:** Сколько пользователей подписано
- **Sent:** Сколько уведомлений отправлено
- **Failed:** Сколько не отправилось
- **Queued:** Сколько в очереди
- **Last Sent:** Когда последнее отправлено

### Удалить событие

Click `⋮` → `Delete`

**⚠️ Важно:**
- System events (`isSystem: true`) **нельзя** удалить
- Custom events можно удалить
- Удаление необратимо!

---

## 📊 Проверка статуса

### 1. Notification Queue

`/admin/notification-queue`

**Фильтры:**
- Status: PENDING, SENT, FAILED
- Channel: EMAIL, IN_APP, SMS, PUSH
- Event: выбрать конкретное событие

**Действия:**
- **Retry Failed** - повторить отправку failed notifications
- **Clear Sent** - очистить успешные (старые)
- **View Details** - посмотреть payload

### 2. Email Logs

Смотри в `/admin/email-templates` → Email Logs tab

**Что видно:**
- Template used
- Recipient
- Status (SENT, FAILED)
- Sent time
- Error (if failed)

### 3. Console Logs

В terminal где запущен `npm run dev`:

```bash
✅ [NOTIFICATION] Sent ORDER_CREATED for order ORD-123
✅ [EMAIL] Sent to user@example.com (template: ORDER_CREATED)
```

Если ошибка:
```bash
❌ [NOTIFICATION] Failed to send KYC_APPROVED: Error message
```

---

## 🐛 Troubleshooting

### Notification не отправляется

**Check 1: Event Active?**
- `/admin/notification-events` → Find event → Ensure switch is ON

**Check 2: Template Linked?**
- Event → `templateId` should be set
- Template должен быть `PUBLISHED` и `isActive: true`

**Check 3: Resend API Key?**
- `/admin/integrations` → Resend → Check API key configured

**Check 4: Email Template Variables?**
- Event payload должен содержать все переменные из template
- Check console logs for errors

**Check 5: User Email?**
- User must have valid email address
- Check `userId` exists in database

### Email приходит, но неправильный контент

**Check 1: Variables in Payload**
- Ensure all template variables are in `eventEmitter.emit()` payload
- Missing variables → shown as empty in email

**Check 2: Template Syntax**
- Check template uses `{{variableName}}` (Handlebars syntax)
- Not `{variableName}` or `$variableName`

**Check 3: White-Label Settings**
- `/admin/settings` → Brand Settings
- Logo, Company Name, Support Email должны быть заполнены

### Notification в FAILED status

**View Error:**
- `/admin/notification-queue` → Find failed → View Details → See `error` field

**Common Errors:**
- `Email template not found` → Link template to event
- `Invalid recipient email` → Check user email
- `Resend API error: 429` → Rate limit exceeded (retry later)
- `Template rendering failed` → Check template syntax

**Retry:**
- `/admin/notification-queue` → Select FAILED → `Retry Selected`

---

## 🎯 Best Practices

### 1. Always wrap in try-catch

```typescript
try {
  await eventEmitter.emit('MY_EVENT', { userId, data });
  console.log('✅ Notification sent');
} catch (error) {
  // DON'T fail the main operation if notification fails!
  console.error('❌ Notification failed:', error);
}
```

### 2. Include all required variables

```typescript
// ❌ BAD - missing variables
await eventEmitter.emit('ORDER_CREATED', {
  orderId: '123'
  // missing: userId, amount, etc.
});

// ✅ GOOD - all required variables
await eventEmitter.emit('ORDER_CREATED', {
  userId: user.id,
  orderId: order.id,
  orderReference: order.paymentReference,
  cryptoAmount: order.cryptoAmount,
  // ... all required vars
});
```

### 3. Log success/failure

```typescript
try {
  await eventEmitter.emit('MY_EVENT', data);
  console.log(`✅ [NOTIFICATION] MY_EVENT sent for user ${userId}`);
} catch (error) {
  console.error(`❌ [NOTIFICATION] Failed to send MY_EVENT:`, error);
}
```

### 4. Don't spam users

```typescript
// ❌ BAD - sending notification on every status check
setInterval(async () => {
  await eventEmitter.emit('STATUS_UPDATE', { userId });
}, 1000); // Every second = spam!

// ✅ GOOD - only on actual state changes
if (oldStatus !== newStatus) {
  await eventEmitter.emit('STATUS_CHANGED', { userId, newStatus });
}
```

### 5. Use descriptive Event Keys

```typescript
// ❌ BAD
'NOTIF_1'
'EMAIL_SENT'
'USER_ACTION'

// ✅ GOOD
'ORDER_CREATED'
'KYC_APPROVED'
'WITHDRAWAL_COMPLETED'
```

---

## 📚 Дополнительная документация

- **Full Guide:** `NOTIFICATION_EVENTS_ENTERPRISE_GUIDE.md`
- **System Audit:** `NOTIFICATION_EMAIL_SYSTEM_AUDIT.md`
- **Integration Status:** `NOTIFICATION_INTEGRATION_COMPLETE.md`
- **Missing Templates:** `MISSING_EMAIL_TEMPLATES.md`

---

## ✅ Checklist для нового события

- [ ] Создан Email Template (`/admin/email-templates`)
- [ ] Template в статусе `PUBLISHED` и `isActive: true`
- [ ] Создан Notification Event (`/admin/notification-events`)
- [ ] Event активен (`isActive: true`)
- [ ] Event привязан к template (`templateId`)
- [ ] Определены `requiredVariables`
- [ ] Добавлен `examplePayload`
- [ ] Интегрировано в код (`eventEmitter.emit()`)
- [ ] Все required variables переданы
- [ ] Error handling (try-catch)
- [ ] Console logging добавлен
- [ ] Протестировано (email пришел)
- [ ] Проверен `/admin/notification-queue` (status: SENT)
- [ ] Проверен email template rendering (correct content)

---

**Status:** ✅ **Ready to Use**

**Next:** Создай свое первое custom событие! 🚀

