# 📊 Virtual IBAN Balance Operations - Анализ и План Улучшений

## 🏗️ Архитектура BCB Virtual IBANs

### 📌 Ключевое понимание:

**BCB Group использует Segregated Account архитектуру:**

```
Physical Layer (BCB):
  ┌─────────────────────────────────────────┐
  │ Segregated Account (94092443)          │
  │ IBAN: DK6589000025309667               │
  │ Total Physical Balance: €1,000         │  ← ЕДИНСТВЕННЫЙ физический баланс
  │                                         │
  │ ├─ Virtual IBAN: DK8089000025328603   │
  │ ├─ Virtual IBAN: DK8589000025328610   │
  │ ├─ Virtual IBAN: DK9089000025328617   │
  │ ├─ Virtual IBAN: DK6889000025329304   │
  │ └─ Virtual IBAN: DK9689000025329479   │
  └─────────────────────────────────────────┘

Logical Layer (Our Database):
  Virtual IBAN A (User A): €600  ← Логический баланс
  Virtual IBAN B (User B): €400  ← Логический баланс
  ─────────────────────────────
  Total: €1,000 ✅ Must match BCB!
```

**Важно:**
- BCB **НЕ отслеживает** индивидуальные балансы Virtual IBANs
- BCB предоставляет только **общий баланс** Segregated Account
- **Наша задача:** вести учет индивидуальных балансов локально
- **Ключевое правило:** Σ(локальные балансы) = BCB segregated balance

---

## 🔍 Текущая Реализация

### ✅ Что уже реализовано:

#### 1. **Пополнение баланса (Top-Up)**

**🎯 Два способа получения данных о пополнениях:**

##### 1.1 Webhook (Primary) - Real-time
- ✅ Реализовано: `POST /api/webhooks/bcb/virtual-iban`
- ✅ BCB отправляет уведомление сразу при получении платежа
- ✅ Webhook payload содержит:
  - `transactionId` - ID транзакции в BCB
  - `iban` - конкретный Virtual IBAN получателя ← **Так мы знаем какой суб-аккаунт!**
  - `amount` - сумма
  - `currency` - валюта
  - `senderName` - отправитель
  - `reference` - референс для matching
- ✅ Автоматическое зачисление средств (`addBalance`)
- ✅ Идемпотентность (проверка `providerTransactionId`)
- ✅ Atomic transactions (Prisma)
- ✅ Создание `TopUpRequest` с инвойсами
- ✅ Автоматическое обновление статусов

**Проблема:** Webhook может быть пропущен (network, downtime, retry failure)

##### 1.2 Polling (Fallback) - NOT IMPLEMENTED
- ❌ **Нет регулярной проверки платежей через BCB Client API**
- BCB предоставляет: `GET /v1/accounts/{accountId}/payments`
- Параметры:
  - `dateFrom` / `dateTo` - фильтр по датам
  - `pageIndex` / `pageSize` - пагинация (макс 1000)
- Ответ: массив транзакций с `transactionId`, `status`, `amount`, `currency`
- **Нужно:** Cron job для периодической проверки и синхронизации пропущенных платежей

**Рекомендация для Production:**
```typescript
// Каждые 5 минут проверяем новые транзакции за последние 10 минут
cron.schedule('*/5 * * * *', async () => {
  const dateFrom = new Date(Date.now() - 10 * 60 * 1000);
  const payments = await bcbAdapter.clientApiRequest(
    'GET',
    `/v1/accounts/${segregatedAccountId}/payments?dateFrom=${dateFrom.toISOString()}`
  );
  
  // Проверяем каждую транзакцию
  for (const payment of payments.results) {
    // Если транзакция уже есть в базе - skip
    const exists = await prisma.virtualIbanTransaction.findUnique({
      where: { providerTransactionId: payment.transactionId }
    });
    
    if (!exists && payment.status === 'Settled') {
      // Обрабатываем как webhook
      await virtualIbanService.processIncomingTransaction(payment);
    }
  }
});
```

#### 2. **Списание баланса (Debit)**
- ✅ Списание при покупке криптовалюты (`deductBalance`)
- ✅ Проверка достаточности средств
- ✅ Atomic transactions
- ✅ Tolerance для float precision (0.01 EUR)
- ✅ Привязка к Order через `orderId`

#### 3. **Безопасность**
- ✅ Row-level locking через Prisma transactions
- ✅ Проверка статуса аккаунта (ACTIVE)
- ✅ Валидация баланса перед списанием

---

## ❌ Что НЕ реализовано:

### 1. **Polling для проверки пропущенных платежей**
❌ **Нет fallback механизма на случай пропущенных webhook'ов**

**Проблема:**
- Webhook может быть пропущен (network issues, server downtime, BCB retry failure)
- Нет способа обнаружить пропущенные платежи
- Баланс может рассинхронизироваться

**Решение:**
- Добавить Cron job для периодической проверки через `GET /v1/accounts/{accountId}/payments`
- Проверять последние N минут каждые X минут
- Обрабатывать пропущенные транзакции автоматически

### 2. **Синхронизация баланса с BCB**
❌ **Нет регулярной синхронизации с реальным балансом BCB**

**Важно понимать:**
- BCB предоставляет только **общий баланс Segregated Account**
- Endpoint: `GET /v3/balances/{segregatedAccountId}`
- Возвращает: **единственное значение** для всего Segregated Account
- **НЕ возвращает** индивидуальные балансы Virtual IBANs

**Текущее состояние:**
- Баланс хранится локально в `VirtualIbanAccount.balance` (индивидуально)
- Обновляется только при webhook'ах
- Нет проверки соответствия с BCB

**Что нужно:**
- Периодически проверять: `Σ(все локальные балансы) === BCB segregated balance`
- Если не совпадает → ALERT для manual reconciliation
- Это защита от бухгалтерских ошибок и пропущенных транзакций

**Решение:**
```typescript
async function validateTotalBalance() {
  // 1. Получаем общий баланс из BCB
  const bcbBalance = await bcbAdapter.getBalance(segregatedAccountId);
  
  // 2. Суммируем все локальные балансы
  const localSum = await prisma.virtualIbanAccount.aggregate({
    where: { status: 'ACTIVE' },
    _sum: { balance: true }
  });
  
  // 3. Сравниваем
  const diff = Math.abs(bcbBalance - localSum._sum.balance);
  
  if (diff > 0.01) { // tolerance
    await sendAlertToAdmin({
      type: 'BALANCE_MISMATCH',
      bcbBalance,
      localSum: localSum._sum.balance,
      diff
    });
  }
}
```

### 3. **Исходящие платежи (BCB Payment API)**
❌ **Нет возможности вывода средств с Virtual IBAN**

BCB API предоставляет эндпоинт:
```
POST /v1/accounts/{accountId}/virtual/{iban}/payment
```

**Проблема:** Наша система создает Virtual IBAN через `CreateNoBankDetailsVirtualAccount`, что означает:
- ✅ Можем ПРИНИМАТЬ платежи
- ❌ НЕ можем ОТПРАВЛЯТЬ платежи (требуются bank details владельца)

### 4. **Обработка VOP (Verification of Payee)**
⚠️ **Частично реализовано** (только для входящих платежей)
- ✅ Webhook обрабатывает VOP статусы
- ✅ Admin UI для approve/reject
- ❌ Нет VOP для исходящих платежей

### 4. **Multi-currency**
❌ **Поддержка только EUR**
- BCB поддерживает GBP
- Наша система жестко привязана к EUR

### 5. **Комиссии и лимиты**
❌ **Нет учета комиссий BCB**
- BCB взимает комиссии за операции
- Нет проверки дневных/месячных лимитов

---

## 📋 План Улучшений для Production

### 🎯 **Phase 1: Критические улучшения (Must Have)**

#### 1.1 Polling для fallback проверки платежей
**Приоритет:** 🔴 CRITICAL

**Проблема:** 
- Webhook может быть пропущен
- Нет способа обнаружить пропущенные платежи
- Баланс может рассинхронизироваться без нашего ведома

**Решение:**
```typescript
// cron/sync-virtual-iban-payments.ts
import { CronJob } from 'cron';

/**
 * Проверяет новые платежи каждые 5 минут
 * Ищет платежи за последние 10 минут (overlap для надежности)
 */
export const syncVirtualIbanPaymentsCron = new CronJob(
  '*/5 * * * *', // Каждые 5 минут
  async () => {
    console.log('[Cron] Syncing Virtual IBAN payments...');
    
    try {
      const bcbAdapter = await integrationFactory.getVirtualIbanProvider();
      const dateFrom = new Date(Date.now() - 10 * 60 * 1000); // 10 минут назад
      
      // Получаем платежи для segregated account
      const response = await bcbAdapter.clientApiRequest(
        'GET',
        `/v1/accounts/${segregatedAccountId}/payments?dateFrom=${dateFrom.toISOString()}&pageSize=100`
      );
      
      console.log(`[Cron] Found ${response.count} payments`);
      
      // Обрабатываем каждый платеж
      for (const transactionId of response.results) {
        // Получаем детали платежа
        const payment = await bcbAdapter.clientApiRequest(
          'GET',
          `/v1/accounts/${segregatedAccountId}/payments/transaction/${transactionId}`
        );
        
        // Проверяем, есть ли уже в базе
        const exists = await prisma.virtualIbanTransaction.findUnique({
          where: { providerTransactionId: payment.transactionId }
        });
        
        if (!exists && payment.status === 'Settled') {
          console.log(`[Cron] Processing missed payment: ${payment.transactionId}`);
          
          // Обрабатываем как webhook (та же логика)
          await virtualIbanService.processIncomingTransaction({
            tx_id: payment.transactionId,
            amount: payment.amount,
            currency: payment.currency,
            // ... map other fields
          });
        }
      }
      
      console.log('[Cron] Sync completed successfully');
    } catch (error) {
      console.error('[Cron] Sync failed:', error);
      // Отправить alert админу
      await sendAlertToAdmin({
        type: 'CRON_FAILED',
        job: 'sync-virtual-iban-payments',
        error: error.message
      });
    }
  }
);
```

**Преимущества:**
- ✅ Обнаруживает пропущенные webhook'и
- ✅ Автоматическое восстановление
- ✅ Overlap (10 мин) для надежности
- ✅ Используется та же логика что и webhook

#### 1.2 Валидация общего баланса с BCB
**Приоритет:** 🔴 CRITICAL

**Проблема:** 
- Локальный баланс может рассинхронизироваться
- Webhook могут быть пропущены
- Нет проверки перед операциями

**Решение:**
```typescript
class VirtualIbanBalanceService {
  /**
   * Синхронизировать баланс с BCB перед критическими операциями
   */
  async syncBalanceFromProvider(accountId: string): Promise<number> {
    // 1. Получить баланс из BCB API
    const bcbBalance = await bcbAdapter.getBalance(accountId);
    
    // 2. Сравнить с локальным
    const localAccount = await prisma.virtualIbanAccount.findUnique({
      where: { id: accountId }
    });
    
    // 3. Если разница > tolerance, обновить и залогировать
    const diff = Math.abs(bcbBalance.available - localAccount.balance);
    if (diff > 0.01) {
      console.warn(`Balance mismatch: BCB=${bcbBalance.available}, Local=${localAccount.balance}`);
      
      await prisma.virtualIbanAccount.update({
        where: { id: accountId },
        data: { 
          balance: bcbBalance.available,
          lastBalanceUpdate: new Date()
        }
      });
    }
    
    return bcbBalance.available;
  }
  
  /**
   * Обновить deductBalance с синхронизацией
   */
  async deductBalanceWithSync(
    accountId: string,
    amount: number,
    orderId: string
  ) {
    // Синхронизировать перед списанием
    await this.syncBalanceFromProvider(accountId);
    
    // Затем списать
    return this.deductBalance(accountId, amount, orderId);
  }
}
```

**Cron job для периодической синхронизации:**
```typescript
// cron: every 5 minutes
async function syncAllActiveBalances() {
  const accounts = await prisma.virtualIbanAccount.findMany({
    where: { status: 'ACTIVE' }
  });
  
  for (const account of accounts) {
    try {
      await virtualIbanBalanceService.syncBalanceFromProvider(account.id);
    } catch (error) {
      console.error(`Failed to sync ${account.id}:`, error);
    }
  }
}
```

---

#### 1.2 Реконсиляция транзакций
**Приоритет:** 🔴 CRITICAL

**Проблема:**
- Webhook может быть пропущен
- Транзакции могут быть не учтены

**Решение:**
```typescript
/**
 * Реконсиляция: получить все транзакции из BCB и сверить с локальными
 */
async function reconcileTransactions(
  accountId: string,
  dateFrom: Date,
  dateTo: Date
) {
  // 1. Получить транзакции из BCB
  const bcbTransactions = await bcbAdapter.getTransactions(accountId, {
    dateFrom,
    dateTo
  });
  
  // 2. Получить локальные транзакции
  const localTransactions = await prisma.virtualIbanTransaction.findMany({
    where: {
      virtualIbanId: accountId,
      processedAt: { gte: dateFrom, lte: dateTo }
    }
  });
  
  // 3. Найти пропущенные
  const missing = bcbTransactions.filter(bcbTx => 
    !localTransactions.find(localTx => 
      localTx.providerTransactionId === bcbTx.tx_id
    )
  );
  
  // 4. Добавить пропущенные
  for (const tx of missing) {
    console.warn(`Missing transaction found: ${tx.tx_id}`);
    await virtualIbanBalanceService.addBalance(
      accountId,
      tx.amount,
      tx.tx_id,
      tx.reference,
      {
        senderName: tx.senderName,
        senderIban: tx.senderIban
      }
    );
  }
  
  return missing.length;
}
```

---

#### 1.3 Логирование и аудит
**Приоритет:** 🟠 HIGH

**Решение:**
```typescript
// Новая модель для аудита
model VirtualIbanBalanceAudit {
  id          String   @id @default(cuid())
  accountId   String
  operation   String   // DEBIT, CREDIT, SYNC, RECONCILE
  amountBefore Float
  amountAfter  Float
  amount       Float
  reason       String
  metadata     Json?
  createdAt    DateTime @default(now())
  
  @@index([accountId, createdAt])
}
```

---

### 🎯 **Phase 2: Важные улучшения (Should Have)**

#### 2.1 Исходящие платежи (Withdrawals)
**Приоритет:** 🟡 MEDIUM

**Требования:**
1. Пользователь должен предоставить bank details (IBAN/BIC)
2. Обновить Virtual Account через BCB API
3. Реализовать withdraw функционал

**Схема:**
```typescript
// 1. Обновить VirtualIbanAccount модель
model VirtualIbanAccount {
  // ... existing fields
  ownerIban      String?  // Owner's bank account IBAN
  ownerBic       String?  // Owner's bank account BIC
  canWithdraw    Boolean  @default(false) // Flag if withdrawals enabled
}

// 2. API для добавления bank details
PUT /api/client/virtual-iban/:id/bank-details
{
  iban: "DE89370400440532013000",
  bic: "COBADEFFXXX"
}

// 3. Обновить через BCB Client API
PUT /v1/accounts/{accountId}/virtual/{iban}/owner-bank-details
{
  iban: "...",
  bicSwift: "..."
}

// 4. Withdraw API
POST /api/client/virtual-iban/:id/withdraw
{
  amount: 100.00,
  reason: "Withdraw to personal account"
}

// 5. BCB Payment API
POST /v1/accounts/{accountId}/virtual/{iban}/payment
{
  currency: "EUR",
  amount: "100.00",
  reference: "Withdrawal",
  nonce: "unique-nonce",
  reason: "User withdrawal"
}
```

**Flow:**
```
User requests withdrawal
  ↓
Check if bank details provided → If NO: require bank details
  ↓
Validate balance
  ↓
Create WithdrawalRequest (status: PENDING)
  ↓
Call BCB Payment API
  ↓
BCB processes (async)
  ↓
Webhook updates status (SETTLED/REJECTED)
  ↓
If SETTLED: deduct from local balance
  ↓
Update WithdrawalRequest (status: COMPLETED)
```

---

#### 2.2 Лимиты и комиссии
**Приоритет:** 🟡 MEDIUM

**Схема:**
```typescript
// Таблица лимитов
model VirtualIbanLimits {
  id              String  @id @default(cuid())
  accountId       String  @unique
  dailyInLimit    Float   // Дневной лимит входящих
  dailyOutLimit   Float   // Дневной лимит исходящих
  monthlyInLimit  Float
  monthlyOutLimit Float
  dailyInUsed     Float   @default(0)
  dailyOutUsed    Float   @default(0)
  monthlyInUsed   Float   @default(0)
  monthlyOutUsed  Float   @default(0)
  lastResetDaily  DateTime
  lastResetMonthly DateTime
  
  @@index([accountId])
}

// Комиссии
model VirtualIbanFee {
  id          String  @id @default(cuid())
  type        String  // INBOUND, OUTBOUND, MONTHLY_MAINTENANCE
  feeFixed    Float   // Фиксированная комиссия
  feePercent  Float   // Процентная комиссия
  minFee      Float   // Минимальная комиссия
  maxFee      Float?  // Максимальная комиссия
}

// Проверка лимитов перед операциями
async function checkLimits(accountId: string, amount: number, type: 'IN' | 'OUT') {
  const limits = await prisma.virtualIbanLimits.findUnique({
    where: { accountId }
  });
  
  if (type === 'OUT') {
    if (limits.dailyOutUsed + amount > limits.dailyOutLimit) {
      throw new Error('Daily withdrawal limit exceeded');
    }
  }
  
  // Update usage
  await prisma.virtualIbanLimits.update({
    where: { accountId },
    data: {
      dailyOutUsed: { increment: amount }
    }
  });
}
```

---

#### 2.3 Мониторинг и алерты
**Приоритет:** 🟡 MEDIUM

**Метрики:**
- Balance sync mismatches
- Failed webhooks
- Missing transactions (reconciliation)
- High volume activity (suspicious)
- VOP rejections

**Alerts:**
```typescript
// Email alerts для админов
async function sendBalanceMismatchAlert(accountId: string, diff: number) {
  await sendEmail({
    to: 'admin@example.com',
    subject: `⚠️ Balance Mismatch: ${accountId}`,
    body: `
      Virtual IBAN ${accountId} has a balance mismatch of €${diff.toFixed(2)}
      
      Please investigate immediately.
    `
  });
}
```

---

### 🎯 **Phase 3: Nice to Have**

#### 3.1 Multi-currency (GBP support)
**Приоритет:** 🟢 LOW

#### 3.2 Automated batch payments
**Приоритет:** 🟢 LOW

#### 3.3 Real-time balance notifications
**Приоритет:** 🟢 LOW

---

## 🏗️ Архитектурные рекомендации

### 1. **Separation of Concerns**
```
VirtualIbanBalanceService (Business Logic)
  ↓
BCBGroupAdapter (Provider Integration)
  ↓
BCB API
```

### 2. **Event-Driven Architecture**
```typescript
// События для реакций
events.on('balance.credited', async (data) => {
  // Отправить уведомление пользователю
  await notificationService.send(data.userId, {
    type: 'BALANCE_CREDITED',
    amount: data.amount
  });
});

events.on('balance.low', async (data) => {
  // Алерт при низком балансе
  if (data.balance < 10) {
    await sendLowBalanceAlert(data.userId);
  }
});
```

### 3. **Caching Strategy**
```typescript
// Redis для кеширования баланса (short TTL)
await redis.set(
  `viban:balance:${accountId}`,
  balance,
  'EX',
  60 // 1 minute TTL
);
```

---

## ✅ Чек-лист для Production

### Перед запуском:
- [ ] Реализовать balance sync
- [ ] Настроить reconciliation cron job (daily)
- [ ] Добавить аудит логирование
- [ ] Настроить мониторинг и алерты
- [ ] Протестировать webhook reliability
- [ ] Настроить backup для баланса
- [ ] Документировать все API endpoints
- [ ] Обучить support команду

### Мониторинг:
- [ ] Dashboard с метриками баланса
- [ ] Alert на mismatch > €1.00
- [ ] Daily reconciliation report
- [ ] Webhook failure tracking

---

## 📊 Приоритизация

| Feature | Priority | Impact | Effort | Status |
|---------|----------|--------|--------|--------|
| Balance Sync | 🔴 CRITICAL | High | Medium | ❌ TODO |
| Reconciliation | 🔴 CRITICAL | High | Medium | ❌ TODO |
| Audit Logging | 🟠 HIGH | Medium | Low | ❌ TODO |
| Withdrawals | 🟡 MEDIUM | High | High | ❌ TODO |
| Limits & Fees | 🟡 MEDIUM | Medium | Medium | ❌ TODO |
| Multi-currency | 🟢 LOW | Low | High | ❌ TODO |

---

## 💰 Cost-Benefit Analysis

### Option 1: Минимальный вариант (Phase 1 only)
**Стоимость:** ~16-24 часов разработки
**Преимущества:**
- Надежность балансов
- Предотвращение потерь
- Compliance

### Option 2: Полный вариант (Phase 1 + 2)
**Стоимость:** ~40-60 часов разработки
**Преимущества:**
- Все из Option 1
- Withdrawals функционал
- Compliance с лимитами
- Полный аудит

### Рекомендация: ✅ **Начать с Phase 1, затем Phase 2**

---

## 🔗 BCB API Reference

### Используемые endpoints:
- ✅ `POST /v2/accounts/{accountId}/virtual` - Create Virtual IBAN
- ✅ `GET /v1/accounts/{accountId}/virtual/all-account-data` - List Virtual IBANs
- ❌ `GET /v4/balance/{accountId}` - Get Balance (TODO)
- ❌ `GET /v1/accounts/{accountId}/payments` - Get Payments (TODO)
- ❌ `POST /v1/accounts/{accountId}/virtual/{iban}/payment` - Send Payment (TODO)
- ✅ `POST /v1/accounts/{accountId}/virtual/{iban}/close` - Close Account
- ❌ `PUT /v1/accounts/{accountId}/virtual/{iban}/owner-bank-details` - Update Bank Details (TODO)

---

## 📝 Заключение

Текущая реализация покрывает **базовые операции** (прием платежей, списание баланса), но для **production-ready** системы критически важно добавить:

1. **Синхронизацию баланса** с BCB (предотвращение рассинхронизации)
2. **Реконсиляцию транзакций** (предотвращение потерь)
3. **Аудит и мониторинг** (compliance и безопасность)

Для **полноценного** сервиса Virtual IBAN дополнительно нужны:

4. **Withdrawals** (вывод средств)
5. **Лимиты и комиссии** (compliance)

**Время реализации Phase 1:** ~2-3 недели
**Время реализации Phase 2:** +3-4 недели

---

**Дата:** 2025-12-04
**Автор:** AI Assistant
**Статус:** Proposal for Review

