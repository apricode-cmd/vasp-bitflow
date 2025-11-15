# Order ↔ PayIn ↔ PayOut - Полная связь статусов

## 🔗 Как связаны Order, PayIn и PayOut

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    Order    │◄──────┤    PayIn    │       │   PayOut    │
│   (Заказ)   │       │  (Входящий) │       │ (Исходящий) │
└──────┬──────┘       └──────┬──────┘       └──────┬──────┘
       │                     │                     │
       │                     │                     │
       └─────────────────────┴─────────────────────┘
              Все три сущности синхронизированы
```

### Связи в базе данных:
```typescript
Order {
  id: string
  status: OrderStatus  // Главный статус сделки
  payIn: PayIn?        // ONE-TO-ONE связь
  payOut: PayOut?      // ONE-TO-ONE связь
}

PayIn {
  orderId: string      // FK → Order
  status: PayInStatus  // Статус входящего платежа
}

PayOut {
  orderId: string      // FK → Order
  status: PayOutStatus // Статус исходящей отправки
}
```

---

## 📊 Статусы всех трех сущностей

### Order Status (главный контроллер)
```typescript
enum OrderStatus {
  PENDING           // Заказ создан, ждем оплаты
  PAYMENT_PENDING   // Клиент должен оплатить
  PAYMENT_RECEIVED  // Деньги получены, проверяем
  PROCESSING        // Обрабатываем (готовим отправку)
  COMPLETED         // Все завершено ✅
  CANCELLED         // Отменено клиентом/админом
  EXPIRED           // Истекло время (24h)
  REFUNDED          // Возврат средств
  FAILED            // Провалено
}
```

### PayIn Status (входящий платеж)
```typescript
enum PayInStatus {
  PENDING     // Ждем платеж от клиента
  RECEIVED    // Получили деньги
  VERIFIED    // Проверили и подтвердили
  PARTIAL     // Частичная оплата
  MISMATCH    // Сумма не совпадает
  RECONCILED  // Сверено, закрыто в бухгалтерии
  FAILED      // Отклонено
  REFUNDED    // Возвращено
  EXPIRED     // Время истекло
}
```

### PayOut Status (исходящая отправка)
```typescript
enum PayOutStatus {
  PENDING     // Ожидает отправки
  QUEUED      // В очереди
  PROCESSING  // Обрабатывается админом
  SENT        // Отправлено (tx в blockchain)
  CONFIRMING  // Ждем подтверждений
  CONFIRMED   // Подтверждено получателем
  FAILED      // Не удалось отправить
  CANCELLED   // Отменено
}
```

---

## 🔄 Полный Flow: Happy Path (успешная сделка)

### Phase 1: Order Creation (создание заказа)
```
User creates order
  ↓
Order.status = PENDING
PayIn.status = PENDING
PayOut = null (еще не создан)
```

**Что видит клиент:**
> "Заказ создан. Переведите €2000 на наш счет."

**Что делает клиент:**
> Отправляет банковский перевод на €2000

---

### Phase 2: Payment Received (деньги получены)
```
Bank confirms transfer
  ↓
Order.status = PAYMENT_RECEIVED
PayIn.status = RECEIVED
PayOut = null
```

**Что видит админ:**
> "Новый платеж получен! Требуется проверка."

**Что делает админ:**
> Проверяет в банке, что деньги пришли

---

### Phase 3: Payment Verified (платеж проверен)
```
Admin clicks "Verify"
  ↓
Order.status = PROCESSING
PayIn.status = VERIFIED
PayOut = null (пока не отправляем)
```

**Что видит админ:**
> "Платеж подтвержден. Готов к отправке криптовалюты."

**Что делает админ:**
> Готовит отправку BTC клиенту

---

### Phase 4: Crypto Sending (отправка криптовалюты)
```
Admin creates PayOut
  ↓
Order.status = PROCESSING
PayIn.status = VERIFIED
PayOut.status = PENDING
  ↓
Admin sends crypto transaction
  ↓
Order.status = PROCESSING
PayIn.status = VERIFIED
PayOut.status = SENT (tx hash recorded)
  ↓
Blockchain confirmations...
  ↓
Order.status = PROCESSING
PayIn.status = VERIFIED
PayOut.status = CONFIRMING (3/6 confirmations)
```

**Что видит клиент:**
> "Ваша криптовалюта отправлена! Ожидайте подтверждений."

---

### Phase 5: Crypto Confirmed (криптовалюта подтверждена)
```
Blockchain: 6/6 confirmations
  ↓
Order.status = PROCESSING
PayIn.status = VERIFIED
PayOut.status = CONFIRMED ✅
```

**Что видит клиент:**
> "Криптовалюта получена! Проверьте свой кошелек."

---

### Phase 6: Transaction Reconciled (сделка закрыта)
```
Admin clicks "Reconcile"
  ↓
Order.status = COMPLETED ✅
PayIn.status = RECONCILED ✅
PayOut.status = CONFIRMED ✅
```

**Что происходит:**
- Доход признается в бухгалтерии
- Комиссия фиксируется как прибыль
- Сделка закрывается
- Финальное уведомление клиенту

**Полный цикл завершен!** 🎉

---

## 🔄 Alternative Flows (альтернативные сценарии)

### Scenario A: Refund BEFORE sending crypto
```
PENDING → RECEIVED → VERIFIED → REFUNDED
                                    ↓
Order.status = REFUNDED
PayIn.status = REFUNDED
PayOut.status = CANCELLED (если был создан)
                  ↓
            New PayOut created
            (return money to customer)
```

**Причина:** KYC не пройден, сумма неверная, технические проблемы

---

### Scenario B: Refund AFTER sending crypto (partial refund)
```
VERIFIED → PayOut SENT → CONFIRMED → Partial REFUND
    ↓
Order.status = COMPLETED (но с пометкой refund)
PayIn.status = RECONCILED (с refundAmount)
PayOut.status = CONFIRMED (crypto sent)
    ↓
New PayOut created (refund excess amount)
```

**Причина:** Клиент переплатил, возвращаем разницу

---

### Scenario C: Failed Payment
```
PENDING → RECEIVED → FAILED ❌
    ↓
Order.status = FAILED
PayIn.status = FAILED
PayOut = null (не создавался)
```

**Причина:** Fraud detection, не прошел проверку

---

### Scenario D: Chargeback (после завершения)
```
COMPLETED ✅ (все готово)
    ↓
(через 30-180 дней)
    ↓
Bank reverses payment
    ↓
Order.status = CHARGEBACK 🚨
PayIn.status = CHARGEBACK
PayOut.status = CONFIRMED (крипта уже отправлена)
```

**Результат:** Убыток для платформы (потеряли и деньги, и крипту)

---

### Scenario E: Order Expired
```
PENDING (24 hours passed)
    ↓
Order.status = EXPIRED
PayIn.status = EXPIRED
PayOut = null
```

**Причина:** Клиент не оплатил в течение 24 часов

---

## 📈 State Machine: Order Status Transitions

```
PENDING
  ├─→ PAYMENT_RECEIVED (PayIn received)
  ├─→ EXPIRED (timeout 24h)
  └─→ CANCELLED (user/admin cancelled)

PAYMENT_RECEIVED
  ├─→ PROCESSING (PayIn verified)
  ├─→ FAILED (PayIn failed)
  └─→ REFUNDED (immediate refund)

PROCESSING
  ├─→ COMPLETED (PayOut confirmed + reconciled)
  ├─→ FAILED (PayOut failed)
  └─→ REFUNDED (before PayOut confirmed)

COMPLETED
  └─→ CHARGEBACK (bank reversal)
```

---

## 🎯 Когда менять статусы

### Order Status меняется когда:

| От | К | Триггер |
|----|---|---------|
| PENDING | PAYMENT_RECEIVED | PayIn.status = RECEIVED |
| PAYMENT_RECEIVED | PROCESSING | PayIn.status = VERIFIED |
| PROCESSING | COMPLETED | PayIn.status = RECONCILED + PayOut.status = CONFIRMED |
| PROCESSING | FAILED | PayIn.status = FAILED или PayOut.status = FAILED |
| PROCESSING | REFUNDED | Admin инициирует refund |
| COMPLETED | CHARGEBACK | Bank notification |
| PENDING | EXPIRED | createdAt + 24h < now |

### PayIn Status меняется когда:

| От | К | Триггер |
|----|---|---------|
| PENDING | RECEIVED | Bank confirms transfer / Blockchain tx confirmed |
| RECEIVED | VERIFIED | Admin clicks "Verify" |
| VERIFIED | RECONCILED | Admin clicks "Reconcile" (+ PayOut confirmed) |
| RECEIVED | FAILED | Admin clicks "Mark as Failed" |
| VERIFIED | REFUNDED | Admin clicks "Refund" |
| RECONCILED | CHARGEBACK | Bank chargeback notification |

### PayOut Status меняется когда:

| От | К | Триггер |
|----|---|---------|
| PENDING | PROCESSING | Admin starts processing |
| PROCESSING | SENT | Blockchain transaction broadcast |
| SENT | CONFIRMING | First blockchain confirmation |
| CONFIRMING | CONFIRMED | 6+ blockchain confirmations |
| PROCESSING | FAILED | Transaction failed to broadcast |
| PENDING | CANCELLED | Order cancelled or failed |

---

## 🔧 Implementation: Sync Logic

### Automatic Status Sync (автоматическая синхронизация)

```typescript
// Когда PayIn меняется → синхронизировать Order
async function syncOrderStatusFromPayIn(payInId: string) {
  const payIn = await prisma.payIn.findUnique({
    where: { id: payInId },
    include: { order: true }
  });

  let newOrderStatus: OrderStatus | null = null;

  switch (payIn.status) {
    case 'RECEIVED':
      newOrderStatus = 'PAYMENT_RECEIVED';
      break;
    
    case 'VERIFIED':
      newOrderStatus = 'PROCESSING';
      break;
    
    case 'FAILED':
      newOrderStatus = 'FAILED';
      break;
    
    case 'REFUNDED':
      newOrderStatus = 'REFUNDED';
      break;
    
    case 'EXPIRED':
      newOrderStatus = 'EXPIRED';
      break;
    
    case 'RECONCILED':
      // Только если PayOut тоже CONFIRMED
      const payOut = await prisma.payOut.findUnique({
        where: { orderId: payIn.orderId }
      });
      if (payOut?.status === 'CONFIRMED') {
        newOrderStatus = 'COMPLETED';
      }
      break;
  }

  if (newOrderStatus && payIn.order.status !== newOrderStatus) {
    await prisma.order.update({
      where: { id: payIn.orderId },
      data: { status: newOrderStatus }
    });
    
    console.log(`✅ Order ${payIn.orderId}: ${payIn.order.status} → ${newOrderStatus}`);
  }
}

// Когда PayOut меняется → синхронизировать Order
async function syncOrderStatusFromPayOut(payOutId: string) {
  const payOut = await prisma.payOut.findUnique({
    where: { id: payOutId },
    include: { 
      order: true,
      order: { include: { payIn: true } }
    }
  });

  let newOrderStatus: OrderStatus | null = null;

  switch (payOut.status) {
    case 'CONFIRMED':
      // Только если PayIn тоже RECONCILED
      if (payOut.order.payIn?.status === 'RECONCILED') {
        newOrderStatus = 'COMPLETED';
      }
      break;
    
    case 'FAILED':
      newOrderStatus = 'FAILED';
      break;
    
    case 'CANCELLED':
      // Зависит от текущего статуса Order
      if (payOut.order.status === 'PROCESSING') {
        newOrderStatus = 'REFUNDED';
      }
      break;
  }

  if (newOrderStatus && payOut.order.status !== newOrderStatus) {
    await prisma.order.update({
      where: { id: payOut.orderId },
      data: { status: newOrderStatus }
    });
    
    console.log(`✅ Order ${payOut.orderId}: ${payOut.order.status} → ${newOrderStatus}`);
  }
}
```

---

## 📊 Dashboard View: Triple Status

### Admin Dashboard должен показывать все три статуса:

```typescript
interface OrderWithStatuses {
  id: string;
  paymentReference: string;
  
  // Main Order Status
  orderStatus: OrderStatus;           // PROCESSING
  
  // PayIn Status
  payInStatus: PayInStatus | null;    // VERIFIED
  payInAmount: number | null;         // €2000.00
  
  // PayOut Status
  payOutStatus: PayOutStatus | null;  // SENT
  payOutTxHash: string | null;        // 0xabc...
  payOutConfirmations: number | null; // 3/6
  
  // Overall Progress
  progress: {
    paymentReceived: boolean;   // ✅
    paymentVerified: boolean;   // ✅
    cryptoSent: boolean;        // ✅
    cryptoConfirmed: boolean;   // ⏳ (3/6)
    reconciled: boolean;        // ❌
  };
}
```

### Визуальное отображение:

```
┌─────────────────────────────────────────────────────────┐
│ Order: APR-MHCOMWLK-FWCT4Q                    PROCESSING │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐      │
│  │  PayIn   │      │  Order   │      │ PayOut   │      │
│  │ VERIFIED │  →   │PROCESSING│  →   │  SENT    │      │
│  │   ✅      │      │    ⏳     │      │   ⏳      │      │
│  └──────────┘      └──────────┘      └──────────┘      │
│                                                           │
│  Payment: €2000.00 ✅                                    │
│  Crypto: 0.02 BTC sending... (3/6 confirmations)        │
│                                                           │
│  Next Action: Wait for 6 confirmations, then Reconcile  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways

### 1. Иерархия важности:
```
Order Status (главный) 
  ↓ зависит от
PayIn Status (входящий платеж)
  ↓ влияет на
PayOut Status (исходящая отправка)
```

### 2. Критические переходы:
- **PayIn VERIFIED** → Order PROCESSING (готовы отправлять крипту)
- **PayOut CONFIRMED** + **PayIn RECONCILED** → Order COMPLETED (сделка закрыта)

### 3. Sync Rules:
- ✅ PayIn меняется → автоматически обновить Order
- ✅ PayOut меняется → автоматически обновить Order
- ✅ Order НЕ меняется вручную (только через PayIn/PayOut)

### 4. Чеклист для COMPLETED:
```typescript
Order.status = COMPLETED if:
  ✅ PayIn.status === RECONCILED
  ✅ PayOut.status === CONFIRMED
  ✅ Admin clicked "Reconcile"
```

### 5. Защита от ошибок:
```typescript
// Нельзя Reconcile если PayOut не CONFIRMED
if (payIn.status === 'VERIFIED' && payOut.status !== 'CONFIRMED') {
  throw new Error('Cannot reconcile: crypto not confirmed yet');
}

// Нельзя отправить крипту если PayIn не VERIFIED
if (payIn.status !== 'VERIFIED') {
  throw new Error('Cannot send crypto: payment not verified');
}
```

---

## 📋 Recommended Implementation

### Phase 1: Add Status Sync Service
```typescript
// src/lib/services/order-status-sync.service.ts
export class OrderStatusSyncService {
  async syncFromPayIn(payInId: string): Promise<void>
  async syncFromPayOut(payOutId: string): Promise<void>
  async validateTransition(from: OrderStatus, to: OrderStatus): Promise<boolean>
}
```

### Phase 2: Add Webhooks/Events
```typescript
// Когда PayIn меняется
eventBus.on('payIn.statusChanged', async (payInId) => {
  await orderStatusSyncService.syncFromPayIn(payInId);
});

// Когда PayOut меняется
eventBus.on('payOut.statusChanged', async (payOutId) => {
  await orderStatusSyncService.syncFromPayOut(payOutId);
});
```

### Phase 3: Add Admin Validation
```typescript
// Перед тем как админ может нажать "Reconcile"
function canReconcile(order: Order): boolean {
  return (
    order.payIn?.status === 'VERIFIED' &&
    order.payOut?.status === 'CONFIRMED' &&
    order.status === 'PROCESSING'
  );
}
```

---

Теперь видна **полная картина**: Order, PayIn и PayOut работают как **единый механизм**, где каждый статус влияет на другие! 🎯

