# 🏗️ Virtual IBAN Balance Architecture

## 📌 Ключевое понимание BCB Virtual IBANs

### Segregated Account Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ BCB Physical Layer                                          │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│  Segregated Account ID: 94092443                           │
│  IBAN: DK6589000025309667                                  │
│  Type: EUR (VIRTUAL)                                       │
│  Total Physical Balance: €1,000  ← ЕДИНСТВЕННЫЙ баланс!   │
│                                                             │
│  ├─ Virtual IBAN: DK8089000025328603 (Test User)          │
│  ├─ Virtual IBAN: DK8589000025328610 (Demo Testing)       │
│  ├─ Virtual IBAN: DK9089000025328617 (Demo Testing)       │
│  ├─ Virtual IBAN: DK6889000025329304 (Bohdan Kononenko)   │
│  └─ Virtual IBAN: DK9689000025329479 (Demo User)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Our Database - Logical Layer                               │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│  VirtualIbanAccount (User A): €600  ← Логический баланс   │
│  VirtualIbanAccount (User B): €400  ← Логический баланс   │
│  ──────────────────────────────────                        │
│  Total: €1,000 ✅ MUST MATCH BCB!                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### ⚠️ КРИТИЧЕСКИ ВАЖНО:

1. **BCB НЕ отслеживает** индивидуальные балансы Virtual IBANs
2. **BCB предоставляет** только общий баланс Segregated Account
3. **Наша задача** - вести учет индивидуальных балансов локально
4. **Ключевое правило:** `Σ(все локальные балансы) === BCB segregated balance`

---

## 🔄 Два способа получения данных о пополнениях

### 1️⃣ Webhook (Primary) - Real-time ✅ РЕАЛИЗОВАНО

**Endpoint:** `POST /api/webhooks/bcb/virtual-iban`

**Как работает:**
1. Клиент отправляет деньги на Virtual IBAN (например, `DK9089000025328617`)
2. BCB получает платеж
3. BCB **немедленно** отправляет webhook на наш сервер
4. Webhook payload содержит:
   ```json
   {
     "tx_id": "12345",
     "account_id": 94092443,
     "details": {
       "iban": "DK9089000025328617",  ← ТАК МЫ ЗНАЕМ КАКОЙ SUB-ACCOUNT!
       "sender_name": "John Doe",
       "sender_iban": "DE89370400440532013000",
       "reference": "INV-001"
     },
     "amount": 100.00,
     "ticker": "EUR",
     "credit": 1
   }
   ```
5. Мы находим `VirtualIbanAccount` по `iban`
6. Зачисляем баланс: `account.balance += 100.00`
7. Создаем `VirtualIbanTransaction` запись
8. Если есть `TopUpRequest` с таким `reference` → автоматически связываем

**Преимущества:**
- ✅ Real-time (instant)
- ✅ Нет задержек
- ✅ Автоматическое обновление баланса
- ✅ Автоматический matching с TopUpRequest

**Недостатки:**
- ❌ Webhook может быть пропущен (network issues, server downtime)
- ❌ BCB retry policy может не сработать
- ❌ Нет гарантии доставки 100%

---

### 2️⃣ Polling (Fallback) - ❌ НЕ РЕАЛИЗОВАНО

**Endpoint:** `GET /v1/accounts/{segregatedAccountId}/payments`

**Как должно работать:**
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
      const segregatedAccountId = '94092443';
      const dateFrom = new Date(Date.now() - 10 * 60 * 1000); // 10 минут назад
      
      // 1. Получаем список транзакций
      const response = await bcbAdapter.clientApiRequest<{
        count: number;
        results: string[]; // Array of transactionIds
      }>(
        'GET',
        `/v1/accounts/${segregatedAccountId}/payments?dateFrom=${dateFrom.toISOString()}&pageSize=100`
      );
      
      console.log(`[Cron] Found ${response.count} payments in last 10 minutes`);
      
      // 2. Обрабатываем каждую транзакцию
      for (const transactionId of response.results) {
        // 2.1 Проверяем, есть ли уже в базе
        const exists = await prisma.virtualIbanTransaction.findUnique({
          where: { providerTransactionId: transactionId }
        });
        
        if (exists) {
          console.log(`[Cron] Payment ${transactionId} already processed, skipping`);
          continue;
        }
        
        // 2.2 Получаем детали платежа
        const payment = await bcbAdapter.clientApiRequest<{
          transactionId: string;
          endToEndId: string;
          nonce: string;
          status: 'Received' | 'Initiated' | 'Cancelled' | 'Pending' | 'Processing' | 'Rejected' | 'Settled';
          currency: string;
          amount: string;
          rejectReason?: string;
        }>(
          'GET',
          `/v1/accounts/${segregatedAccountId}/payments/transaction/${transactionId}`
        );
        
        // 2.3 Пропускаем если не Settled
        if (payment.status !== 'Settled') {
          console.log(`[Cron] Payment ${transactionId} status: ${payment.status}, skipping`);
          continue;
        }
        
        console.log(`[Cron] 🎯 Found missed payment: ${transactionId}, processing...`);
        
        // 2.4 Обрабатываем как webhook (та же логика!)
        // Нужно получить полные детали включая IBAN
        // TODO: Проверить какой endpoint возвращает IBAN получателя
        
        await virtualIbanService.processIncomingTransaction({
          tx_id: payment.transactionId,
          amount: parseFloat(payment.amount),
          currency: payment.currency,
          credit: 1,
          // iban: ???  ← НУЖНО ВЫЯСНИТЬ КАК ПОЛУЧИТЬ!
        });
      }
      
      console.log('[Cron] Sync completed successfully');
      
    } catch (error) {
      console.error('[Cron] Sync failed:', error);
      
      // Отправить alert админу
      await sendAlertToAdmin({
        type: 'CRON_FAILED',
        severity: 'HIGH',
        job: 'sync-virtual-iban-payments',
        error: error.message,
        timestamp: new Date()
      });
    }
  }
);
```

**Преимущества:**
- ✅ Обнаруживает пропущенные webhook'и
- ✅ Автоматическое восстановление
- ✅ Overlap (10 мин) для надежности
- ✅ Идемпотентность (проверка `providerTransactionId`)

**Недостатки:**
- ❌ Задержка до 5 минут
- ❌ Дополнительная нагрузка на BCB API
- ❌ **Проблема:** BCB API может не возвращать IBAN получателя в `/payments` endpoint

**❓ Вопросы для BCB:**
1. Как в `/v1/accounts/{accountId}/payments` узнать на какой именно Virtual IBAN пришел платеж?
2. Есть ли endpoint для получения деталей платежа включая recipient IBAN?
3. Альтернатива: есть ли webhook retry mechanism и как его настроить?

---

## 🔒 Валидация общего баланса

### ⚠️ НЕ РЕАЛИЗОВАНО

**Цель:** Убедиться что сумма всех локальных балансов соответствует BCB

```typescript
// cron/validate-total-balance.ts
import { CronJob } from 'cron';

/**
 * Проверяет соответствие суммы локальных балансов с BCB
 * Каждый час
 */
export const validateTotalBalanceCron = new CronJob(
  '0 * * * *', // Каждый час
  async () => {
    console.log('[Cron] Validating total balance with BCB...');
    
    try {
      const bcbAdapter = await integrationFactory.getVirtualIbanProvider();
      const segregatedAccountId = '94092443';
      
      // 1. Получаем общий баланс из BCB (segregated account)
      const bcbBalances = await bcbAdapter.request<Array<{
        account_id: number;
        balance: number;
        ticker: string;
        iban: string;
      }>>(
        'GET',
        `/v3/balances/${segregatedAccountId}`
      );
      
      const bcbTotal = bcbBalances[0]?.balance || 0;
      
      // 2. Суммируем все локальные балансы активных Virtual IBANs
      const localSum = await prisma.virtualIbanAccount.aggregate({
        where: { 
          status: 'ACTIVE',
          // Только для нашего segregated account
          metadata: {
            path: ['segregatedAccountId'],
            equals: segregatedAccountId
          }
        },
        _sum: { balance: true }
      });
      
      const localTotal = localSum._sum.balance || 0;
      
      // 3. Сравниваем с tolerance (1 cent для float precision)
      const diff = Math.abs(bcbTotal - localTotal);
      const tolerance = 0.01;
      
      console.log('[Cron] Balance comparison:', {
        bcbTotal: `€${bcbTotal.toFixed(2)}`,
        localTotal: `€${localTotal.toFixed(2)}`,
        diff: `€${diff.toFixed(2)}`,
        isValid: diff <= tolerance
      });
      
      if (diff > tolerance) {
        // 🚨 CRITICAL ALERT
        console.error('🚨 BALANCE MISMATCH DETECTED!');
        console.error(`BCB: €${bcbTotal}, Local: €${localTotal}, Diff: €${diff}`);
        
        // Отправить критический alert
        await sendAlertToAdmin({
          type: 'BALANCE_MISMATCH',
          severity: 'CRITICAL',
          bcbTotal,
          localTotal,
          diff,
          segregatedAccountId,
          timestamp: new Date(),
          message: `Сумма локальных балансов (€${localTotal}) не совпадает с BCB (€${bcbTotal}). Разница: €${diff}. Требуется manual reconciliation!`
        });
        
        // Логируем для аудита
        await prisma.virtualIbanAuditLog.create({
          data: {
            type: 'BALANCE_MISMATCH',
            severity: 'CRITICAL',
            data: {
              bcbTotal,
              localTotal,
              diff,
              segregatedAccountId,
              timestamp: new Date()
            }
          }
        });
        
        // Получаем детали для debugging
        const accounts = await prisma.virtualIbanAccount.findMany({
          where: {
            status: 'ACTIVE',
            metadata: {
              path: ['segregatedAccountId'],
              equals: segregatedAccountId
            }
          },
          select: {
            id: true,
            iban: true,
            balance: true,
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        });
        
        console.error('Account balances breakdown:', accounts);
        
      } else {
        console.log('✅ Balance validated successfully - all good!');
      }
      
    } catch (error) {
      console.error('[Cron] Balance validation failed:', error);
      
      await sendAlertToAdmin({
        type: 'CRON_FAILED',
        severity: 'HIGH',
        job: 'validate-total-balance',
        error: error.message,
        timestamp: new Date()
      });
    }
  }
);
```

**Преимущества:**
- ✅ Раннее обнаружение бухгалтерских ошибок
- ✅ Защита от data corruption
- ✅ Защита от пропущенных транзакций
- ✅ Audit trail для compliance
- ✅ Автоматические alerts

**Когда запускать:**
- Каждый час (не слишком часто, не слишком редко)
- После каждого manual reconciliation
- Перед конец дня reporting

---

## 📊 Recommended Production Architecture

### 🎯 Three-Layer Protection:

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Real-time (Webhook)                           │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│  POST /api/webhooks/bcb/virtual-iban                   │
│  ✅ Instant balance updates                            │
│  ✅ Real-time user experience                          │
│  ✅ Automatic TopUpRequest matching                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Polling Fallback (Cron every 5 min)          │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│  GET /v1/accounts/{id}/payments                        │
│  ✅ Catches missed webhooks                            │
│  ✅ Automatic recovery                                 │
│  ✅ 10-minute overlap for reliability                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Balance Validation (Cron every 1 hour)       │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│  GET /v3/balances/{segregatedAccountId}                │
│  ✅ Validates Σ(local) === BCB                         │
│  ✅ Detects accounting errors                          │
│  ✅ Critical alerts if mismatch                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 🚀 Implementation Priority:

1. **Phase 1 (MVP):** ✅ Webhook only (уже реализовано)
2. **Phase 2 (Production):** 🔴 Add Polling fallback
3. **Phase 3 (Enterprise):** 🔴 Add Balance validation

---

## 📝 Technical Questions for BCB Group

### 🔍 Critical Questions:

1. **Polling Payment Details:**
   - В endpoint `/v1/accounts/{accountId}/payments` можно ли узнать на какой именно Virtual IBAN пришел платеж?
   - Есть ли endpoint для получения полных деталей платежа включая recipient IBAN?
   - Альтернатива: использовать `/v1/accounts/{accountId}/payments/nonce/{nonce}` если известен nonce?

2. **Webhook Reliability:**
   - Какой retry policy для webhook?
   - Сколько попыток? С каким интервалом?
   - Есть ли webhook signing для безопасности?
   - Можно ли настроить callback URL per virtual IBAN?

3. **Balance Reconciliation:**
   - Есть ли endpoint для получения истории изменений баланса?
   - Можно ли получить statement за период?
   - Как часто рекомендуете проверять баланс для reconciliation?

4. **Rate Limits:**
   - Какие rate limits для `/v1/accounts/{accountId}/payments`?
   - Можно ли делать batch запросы?

---

## 🎯 Next Steps

### For Development:
- [ ] Реализовать Polling fallback cron job
- [ ] Реализовать Balance validation cron job
- [ ] Добавить `VirtualIbanAuditLog` таблицу
- [ ] Реализовать `sendAlertToAdmin` функцию
- [ ] Тестирование на sandbox

### Questions to Ask BCB:
- [ ] Как в polling получить IBAN получателя?
- [ ] Webhook retry policy?
- [ ] Рекомендации по reconciliation?
- [ ] Rate limits для API?

### For Production:
- [ ] Setup monitoring (Datadog/Sentry)
- [ ] Setup alerting (email/Slack/PagerDuty)
- [ ] Daily balance reconciliation report
- [ ] Manual reconciliation procedure

