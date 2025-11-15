# Financial Flow Architecture - Полная финансовая архитектура

## 🏦 О чем эта система комплексно

**Apricode Exchange** - это **финансовая платформа** для покупки криптовалюты за фиатные деньги.

### Ключевые финансовые потоки:

```
Customer Money IN → Platform → Crypto OUT to Customer
      (PayIn)      (Order)        (PayOut)
```

---

## 💰 PayIn vs PayOut - В чем разница?

### **PayIn** (Входящий платеж)
**Что это:** Деньги от клиента **К НАМ** (к платформе)

**Типы:**
- **FIAT PayIn:** Банковский перевод (SEPA, SWIFT) от клиента
- **CRYPTO PayIn:** Криптовалюта от клиента (если мы продаем фиат за крипту)

**Жизненный цикл:**
```
1. PENDING    - Ждем деньги от клиента
2. RECEIVED   - Деньги пришли на наш счет
3. VERIFIED   - Админ проверил и подтвердил
4. RECONCILED - Транзакция закрыта в бухгалтерии
```

**Когда используется:**
- Клиент **покупает BTC за EUR**
- Клиент отправляет нам **€2000**
- Мы получаем PayIn на €2000

---

### **PayOut** (Исходящий платеж)
**Что это:** Деньги от платформы **К КЛИЕНТУ**

**Типы:**
- **FIAT PayOut:** Банковский перевод клиенту (возврат, продажа крипты)
- **CRYPTO PayOut:** Отправка криптовалюты клиенту

**Жизненный цикл:**
```
1. PENDING    - Заказ на отправку создан
2. QUEUED     - В очереди на отправку
3. PROCESSING - Админ обрабатывает
4. SENT       - Отправлено (транзакция в blockchain/банке)
5. CONFIRMING - Ждем подтверждений
6. CONFIRMED  - Получатель подтвердил
```

**Когда используется:**
- Мы отправляем клиенту **0.02 BTC** (после PayIn €2000)
- Клиент продает BTC → мы отправляем ему **EUR**
- **Refund** - возвращаем деньги клиенту

---

## 🔄 Verified vs Reconciled - Ключевое отличие

### **VERIFIED** (Проверено)
**Что это:** Админ **подтвердил**, что платеж корректный

**Когда происходит:**
1. PayIn поступил на счет (RECEIVED)
2. Админ проверяет:
   - ✅ Сумма правильная
   - ✅ Отправитель - наш клиент
   - ✅ KYC пройден
   - ✅ Нет признаков мошенничества
3. Админ нажимает **"Verify"**
4. Status → VERIFIED

**Что дальше:**
- Order меняется на PROCESSING
- Админ готовит PayOut (отправку криптовалюты)
- **Деньги УЖЕ У НАС**, но транзакция **НЕ ЗАКРЫТА**

**Аналогия:**
Verified = "Товар оплачен, готовим к отправке"

---

### **RECONCILED** (Сверено/Закрыто)
**Что это:** Транзакция **полностью завершена** и **закрыта в бухгалтерии**

**Когда происходит:**
1. PayIn уже VERIFIED
2. Админ **отправил криптовалюту** клиенту (PayOut создан и CONFIRMED)
3. Клиент подтвердил получение
4. Админ нажимает **"Reconcile"**
5. Status → RECONCILED

**Что происходит:**
- Order меняется на COMPLETED
- Транзакция закрывается в бухгалтерии
- Комиссия фиксируется в доходах
- Отправляется финальное уведомление клиенту
- **Невозможно отменить** (только chargeback)

**Аналогия:**
Reconciled = "Товар отправлен, получен, сделка закрыта"

---

## 💡 Зачем два статуса?

### Проблема без разделения:
```
VERIFIED → COMPLETED (одним шагом)
```
❌ Нет времени на обработку между подтверждением и отправкой  
❌ Нельзя отследить этап "деньги есть, крипта еще не отправлена"  
❌ Сложно вести учет незавершенных транзакций

### Решение с разделением:
```
VERIFIED → (работа админа) → RECONCILED
```
✅ Админ видит: "Нужно отправить крипту"  
✅ Четкое разделение: payment confirmed vs transaction completed  
✅ Бухгалтерия видит незавершенные транзакции  
✅ Можно отменить до RECONCILED (если найдена ошибка)

---

## 🔙 Типы возвратов (Refund vs Chargeback)

### 1. **REFUND** (Добровольный возврат)
**Что это:** Мы **сами решили** вернуть деньги клиенту

**Причины:**
- ❌ Клиент не прошел KYC
- ❌ Технические проблемы (нет ликвидности)
- ❌ Клиент отменил заказ до отправки крипты
- ❌ Сумма не совпала (underpaid/overpaid)
- ❌ Ошибка в заказе

**Flow:**
```
PayIn RECEIVED/VERIFIED
  ↓
Admin: "Refund this payment"
  ↓
PayIn status → REFUNDED
Order status → REFUNDED
  ↓
PayOut создается (FIAT transfer back to customer)
  ↓
Деньги возвращены клиенту
```

**Кто контролирует:** МЫ (платформа)  
**Кто инициирует:** ADMIN  
**Когда:** ДО отправки крипты (или сразу после)

---

### 2. **CHARGEBACK** (Принудительный возврат)
**Что это:** **Банк вернул** деньги по запросу клиента

**Причины:**
- 🚨 Клиент заявил в банк: "Я не делал этот платеж" (fraud claim)
- 🚨 Карта украдена (stolen card)
- 🚨 Клиент не согласен с услугой (dispute)
- 🚨 Технические проблемы банка

**Flow:**
```
PayIn RECONCILED (деньги у нас, крипта отправлена)
  ↓
Клиент обращается в СВОЙ банк
  ↓
Банк возвращает деньги с НАШЕГО счета
  ↓
Мы получаем уведомление от банка
  ↓
Admin: "Mark as Chargeback"
  ↓
PayIn status → CHARGEBACK
Order status → CHARGEBACK
  ↓
Убыток для платформы! (мы потеряли и деньги, и крипту)
```

**Кто контролирует:** БАНК клиента  
**Кто инициирует:** CUSTOMER (через свой банк)  
**Когда:** ПОСЛЕ того как крипта отправлена (до 180 дней!)

**Почему это опасно:**
- ❌ Мы уже отправили криптовалюту клиенту
- ❌ Деньги забрал банк
- ❌ Мы остались в минусе
- ❌ Криптовалюту нельзя вернуть (необратимая транзакция)

---

### 3. **FAILED** (Отклоненный платеж)
**Что это:** Платеж **НЕ прошел проверку** и отклонен

**Причины:**
- ❌ Подозрительная активность
- ❌ Не прошел KYC
- ❌ Неверная сумма (не доплатил)
- ❌ Fraud detection сработал

**Flow:**
```
PayIn PENDING/RECEIVED
  ↓
Admin: "Mark as Failed"
  ↓
PayIn status → FAILED
Order status → FAILED
  ↓
Если деньги уже были получены → автоматический Refund
```

**Отличие от Refund:**
- FAILED = Отклонили ДО обработки
- REFUND = Обработали, потом вернули

---

## 📊 Полная схема статусов с возвратами

### Happy Path (успешная сделка):
```
PENDING → RECEIVED → VERIFIED → RECONCILED ✅
```

### Refund до отправки крипты:
```
PENDING → RECEIVED → VERIFIED → REFUNDED 💰
                                    ↓
                              PayOut (возврат)
```

### Refund после отправки крипты:
```
VERIFIED → RECONCILED → REFUNDED 💰
    ↓                       ↓
PayOut (crypto sent)   PayOut (refund partial)
```

### Chargeback (после завершения):
```
RECONCILED ✅ (все завершено)
    ↓
(через 30-180 дней)
    ↓
CHARGEBACK 🚨 (банк вернул деньги клиенту)
    ↓
Убыток для платформы
```

### Failed (отклонено сразу):
```
PENDING → RECEIVED → FAILED ❌
```

---

## 🧮 Бухгалтерский учет

### Revenue Recognition (признание дохода):

#### Метод 1: При VERIFIED
```typescript
// Консервативный подход
revenue.pending += order.feeAmount; // Комиссия еще не наша
```

#### Метод 2: При RECONCILED ✅ (правильно)
```typescript
// Доход признается только после полного завершения
revenue.confirmed += order.feeAmount;
profit.realized += order.feeAmount;

// Теперь можно:
// - Платить зарплаты
// - Платить налоги
// - Выводить прибыль
```

### Почему RECONCILED важен для бухгалтерии:

| Status | Деньги у нас? | Крипта отправлена? | Доход признан? | Можно тратить? |
|--------|---------------|-------------------|----------------|----------------|
| VERIFIED | ✅ Да | ❌ Нет | ❌ Нет | ❌ Нет (заблокировано) |
| RECONCILED | ✅ Да | ✅ Да | ✅ Да | ✅ Да |
| REFUNDED | ❌ Возврат | ➖ N/A | ❌ Нет (вычесть) | ❌ Минус |
| CHARGEBACK | ❌ Банк забрал | ✅ Отправили | ❌ Убыток | ❌ Минус |

---

## 🔒 Fraud Prevention (защита от мошенничества)

### AML/KYC Workflow:
```
PayIn RECEIVED
  ↓
Check KYC status
  ↓
├─ APPROVED → Continue to VERIFIED
├─ PENDING → Hold (wait for KYC)
└─ REJECTED → FAILED + auto REFUND
```

### Amount Mismatch:
```
Expected: €2000.00
Received: €1950.00 (недоплата €50)
  ↓
Status: MISMATCH
  ↓
Admin options:
├─ Accept & VERIFY (если €50 незначительны)
├─ Contact customer (доплатить €50)
└─ FAILED + REFUND €1950
```

### Chargeback Risk Score:
```typescript
// Факторы риска chargeback
const riskScore = calculateChargebackRisk({
  newUser: +50,           // Новый пользователь
  largeAmount: +30,       // Сумма > €5000
  fastTransaction: +20,   // Заказ выполнен < 10 минут
  noKYCHistory: +40,      // Нет истории KYC
  suspiciousIP: +60,      // IP из blacklist
});

// Если riskScore > 100 → требуется дополнительная проверка
if (riskScore > 100) {
  payIn.requiresManualReview = true;
  notification.send('High chargeback risk!');
}
```

---

## 🎯 Рекомендации по внедрению

### 1. Добавить CHARGEBACK статус:

```prisma
// prisma/schema.prisma
enum PayInStatus {
  PENDING
  RECEIVED
  VERIFIED
  PARTIAL
  MISMATCH
  RECONCILED
  FAILED
  REFUNDED
  EXPIRED
  CHARGEBACK  // 🆕 Новый статус
}
```

### 2. Добавить Refund Type:

```prisma
enum RefundType {
  FULL           // Полный возврат
  PARTIAL        // Частичный возврат
  CHARGEBACK     // Принудительный возврат банком
}

model PayIn {
  // ...
  refundType     RefundType?
  refundReason   String?
  chargebackDate DateTime?
  chargebackId   String?      // ID от банка/PSP
}
```

### 3. Добавить Chargeback Protection:

```typescript
// Период защиты (банки дают 180 дней на chargeback)
const CHARGEBACK_PROTECTION_DAYS = 180;

// Удерживать часть комиссии для покрытия chargebacks
const CHARGEBACK_RESERVE_PERCENT = 0.01; // 1% от суммы

// При RECONCILED
const reserveAmount = order.totalFiat * CHARGEBACK_RESERVE_PERCENT;
await reserve.create({
  orderId: order.id,
  amount: reserveAmount,
  releaseDate: addDays(new Date(), CHARGEBACK_PROTECTION_DAYS)
});
```

### 4. Dashboard для Risk Management:

```typescript
// Admin Dashboard: Chargeback Metrics
{
  totalChargebacks: 12,
  chargebackRate: 0.3%, // < 0.5% хорошо
  avgChargebackAmount: €1,234,
  chargebackLoss: €14,808,
  preventedByKYC: €50,000,
}
```

---

## 📈 Метрики для мониторинга

### Key Performance Indicators (KPIs):

1. **Chargeback Rate**
   ```
   Chargeback Rate = (Chargebacks / Total Transactions) × 100
   
   Цели:
   - < 0.5% - Отлично
   - 0.5-1% - Нормально
   - > 1% - Проблема (банки могут заблокировать счет)
   ```

2. **Refund Rate**
   ```
   Refund Rate = (Refunds / Total Transactions) × 100
   
   Цели:
   - < 2% - Отлично
   - 2-5% - Нормально
   - > 5% - Проблемы с процессами
   ```

3. **Verification Time**
   ```
   Avg Time = (VERIFIED timestamp - RECEIVED timestamp)
   
   Цели:
   - < 1 hour - Отлично
   - 1-4 hours - Нормально
   - > 4 hours - Медленно
   ```

4. **Reconciliation Time**
   ```
   Avg Time = (RECONCILED timestamp - VERIFIED timestamp)
   
   Цели:
   - < 2 hours - Отлично
   - 2-24 hours - Нормально
   - > 24 hours - Медленно
   ```

---

## 🚨 Alert System

### Critical Alerts:

```typescript
// 1. Chargeback Alert
if (payIn.status === 'CHARGEBACK') {
  alert.critical({
    title: '🚨 CHARGEBACK RECEIVED',
    message: `Order ${order.id}: €${payIn.amount} returned by bank`,
    actions: ['Review Transaction', 'Contact Customer', 'Report Fraud']
  });
}

// 2. High Chargeback Risk
if (chargebackRiskScore > 80) {
  alert.warning({
    title: '⚠️ High Chargeback Risk',
    message: `Order ${order.id} has ${chargebackRiskScore}% risk`,
    actions: ['Additional KYC', 'Manual Review', 'Delay Processing']
  });
}

// 3. Unusual Refund Pattern
if (user.refundCount > 3 && user.refundRate > 0.5) {
  alert.warning({
    title: '⚠️ Unusual Refund Pattern',
    message: `User ${user.email}: ${user.refundCount} refunds in 30 days`,
    actions: ['Review User', 'Flag Account', 'Block Temporarily']
  });
}
```

---

## 💼 Business Logic Examples

### Example 1: Full Refund Flow
```typescript
async function processFullRefund(payInId: string, reason: string) {
  const payIn = await prisma.payIn.findUnique({ where: { id: payInId } });
  
  // 1. Update PayIn status
  await prisma.payIn.update({
    where: { id: payInId },
    data: {
      status: 'REFUNDED',
      refundType: 'FULL',
      refundReason: reason
    }
  });
  
  // 2. Update Order status
  await prisma.order.update({
    where: { id: payIn.orderId },
    data: { status: 'REFUNDED' }
  });
  
  // 3. Create PayOut (return money to customer)
  await prisma.payOut.create({
    data: {
      orderId: payIn.orderId,
      userId: payIn.userId,
      amount: payIn.receivedAmount,
      fiatCurrencyCode: payIn.fiatCurrencyCode,
      currencyType: 'FIAT',
      recipientName: payIn.senderName,
      recipientAccount: payIn.senderAccount,
      paymentReference: `REFUND-${payIn.id}`,
      status: 'PENDING'
    }
  });
  
  // 4. Notify customer
  await emailService.send({
    to: payIn.user.email,
    template: 'refund-initiated',
    data: { amount: payIn.receivedAmount, reason }
  });
}
```

### Example 2: Handle Chargeback
```typescript
async function handleChargeback(
  payInId: string,
  chargebackId: string,
  bankNotification: any
) {
  const payIn = await prisma.payIn.findUnique({ 
    where: { id: payInId },
    include: { order: true }
  });
  
  // 1. Mark as chargeback
  await prisma.payIn.update({
    where: { id: payInId },
    data: {
      status: 'CHARGEBACK',
      refundType: 'CHARGEBACK',
      chargebackDate: new Date(),
      chargebackId: chargebackId,
      refundReason: bankNotification.reason
    }
  });
  
  // 2. Update Order
  await prisma.order.update({
    where: { id: payIn.orderId },
    data: { status: 'CHARGEBACK' }
  });
  
  // 3. Record loss
  await prisma.financialLoss.create({
    data: {
      type: 'CHARGEBACK',
      orderId: payIn.orderId,
      amount: payIn.receivedAmount,
      cryptoLost: payIn.order.cryptoAmount,
      currency: payIn.fiatCurrencyCode
    }
  });
  
  // 4. Critical alert to admins
  await notification.sendToAdmins({
    severity: 'CRITICAL',
    title: '🚨 CHARGEBACK ALERT',
    message: `Lost €${payIn.receivedAmount} + ${payIn.order.cryptoAmount} BTC`,
    orderId: payIn.orderId
  });
  
  // 5. Flag user for review
  await prisma.user.update({
    where: { id: payIn.userId },
    data: {
      riskLevel: 'HIGH',
      requiresReview: true,
      isActive: false // Временно блокируем
    }
  });
}
```

---

## 🎓 Summary

### В чем система комплексно:

1. **PayIn** = Клиент → Платформа (входящие деньги)
2. **PayOut** = Платформа → Клиент (исходящие деньги/крипта)
3. **VERIFIED** = Деньги проверены, готовы к обработке
4. **RECONCILED** = Транзакция завершена, доход признан
5. **REFUND** = Мы возвращаем (наш выбор)
6. **CHARGEBACK** = Банк возвращает (принудительно)

### Почему это важно:

✅ Правильный учет доходов  
✅ Защита от fraud  
✅ Управление рисками  
✅ Соответствие AML/KYC  
✅ Бухгалтерская отчетность  
✅ Защита от chargebacks  

### Рекомендации:

1. ✅ Внедрить CHARGEBACK статус
2. ✅ Добавить RefundType enum
3. ✅ Создать Chargeback Reserve (1% от оборота)
4. ✅ Мониторить Chargeback Rate (<0.5%)
5. ✅ Улучшить KYC для снижения fraud
6. ✅ Dashboard с Risk Metrics

