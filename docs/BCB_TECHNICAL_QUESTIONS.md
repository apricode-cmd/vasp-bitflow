# BCB Group Technical Questions - Virtual IBAN Balance Management

## Context

We are implementing a crypto exchange platform where each client gets their own Virtual IBAN through BCB Group's Client API. We need clarification on the correct architecture for balance management and payment flows.

---

## Our Current Understanding

### Account Structure:
```
Segregated Account (ID: 17218) - "EUR (VIRTUAL)"
  ↳ Virtual IBAN #1 (User A) - DK9089000025328617
  ↳ Virtual IBAN #2 (User B) - DK...
  ↳ Virtual IBAN #3 (User C) - DK...
```

### APIs Used:
- **Client API** (`https://client-api.uat.bcb.group`)
  - POST `/v2/accounts/{accountId}/virtual` - Create Virtual IBAN
  - GET `/v1/accounts/{accountId}/virtual/all-account-data` - List Virtual IBANs
  
- **Services API** (`https://api.uat.bcb.group`)
  - GET `/v4/balance/{accountId}` - Get balance
  - POST `/v1/accounts/{accountId}/virtual/{iban}/payment` - Send payment

---

## 🔴 CRITICAL QUESTIONS

### Q1: Balance Visibility per Virtual IBAN + Access Permissions

**CRITICAL ISSUE: 403 Forbidden on balance endpoints!**

**Test Results:**
```bash
# Test 1: Services API
GET /v3/balances/17218
Response: 403 "Not authorised."

# Test 2: Client API
GET /v1/accounts/17218/virtual/all-account-data
Response: 403 {"message":"Forbidden","statusCode":403}
```

**Our Access:**
- Counterparty ID: 13608
- Segregated Account ID: 17218 (EUR VIRTUAL)
- Auth Token: ✅ Valid (expires 2026)
- Permissions: ❌ Cannot access balance or virtual account data

**UPDATED: We found `/v3/balances/{accountId}` returns individual balances (from docs)!**

**Services API v3:**
```json
GET /v3/balances/17218
Response: [
  {
    "account_id": 17218,
    "counterparty_id": 13608,
    "account_name": "John Doe",
    "ticker": "EUR",
    "balance": 1000.50,              // ✅ Individual balance!
    "iban": "DK9089000025328617",   // ✅ Individual IBAN!
    "bic": "SXPYDKKK",
    "account_type": "Bank",
    "aid": "A00-C000012345",
    "email": "user@example.com",
    // ... other fields
  },
  {
    "account_id": 17218,
    "account_name": "Jane Smith",
    "ticker": "EUR",
    "balance": 500.00,               // ✅ Another user's balance!
    "iban": "DK9089000025328618",   // ✅ Different IBAN!
    // ...
  }
]
```

**vs Client API v4:**
```json
GET /v4/balance/17218
Response:
{
  "accountId": 17218,
  "settled": "1500.50",      // ❌ Aggregated (1000.50 + 500.00)
  "available": "1500.50"
}
```

**QUESTIONS (Updated):**
1. ✅ **CONFIRMED (from docs):** `/v3/balances/{accountId}` returns array with individual balances per Virtual IBAN
2. 🔴 **URGENT:** Why do we get 403 Forbidden on both `/v3/balances/17218` and `/v1/accounts/17218/virtual/all-account-data`?
3. ❓ Do we need additional permissions/scopes for our OAuth token?
4. ❓ Is segregated account 17218 correctly linked to counterparty 13608?
5. ❓ What API endpoints CAN we access with our current sandbox credentials?
6. ❓ How do we request access to balance and virtual account endpoints?

---

### Q2: Transaction Attribution & Individual Balance Calculation

**Questions:**
1. ❓ When a transaction occurs on a Virtual IBAN, how do we identify which Virtual IBAN it belongs to?
2. ❓ Does the webhook payload include the specific IBAN?
3. ❓ Should we calculate individual balances by summing transactions per IBAN?

**Current Webhook Payload (v3 format we expect):**
```json
POST /api/webhooks/bcb/virtual-iban
{
  "account_id": "17218",           // Segregated account
  "tx_id": "abc123",               // Transaction ID
  "amount": "100.00",
  "ticker": "EUR",
  "credit": true,                  // true = incoming, false = outgoing
  "details": {
    "iban": "DK9089000025328617", // ✅ Individual Virtual IBAN
    "reference": "User payment",
    "sender_name": "John Doe",
    "sender_iban": "DE89370400440532013000"
  }
}
```

**Our Current Processing:**
```typescript
// src/lib/services/virtual-iban.service.ts
async processIncomingTransaction(payload: any) {
  // 1. Extract IBAN from payload
  const iban = payload.virtualAccountDetails?.iban || payload.details?.iban;
  
  // 2. Find Virtual IBAN account by IBAN
  const account = await prisma.virtualIbanAccount.findUnique({
    where: { iban: iban }
  });
  
  // 3. Update local balance
  await virtualIbanBalanceService.addBalance(
    account.id,
    parseFloat(payload.amount),
    payload.tx_id,
    payload.details?.reference
  );
}
```

**Follow-up Questions:**
1. ✅ Can we **always** rely on `details.iban` to be present in webhooks?
2. ❓ For **outgoing** payments (withdrawals), will the webhook also include the source IBAN?
3. ❓ Is `GET /v1/accounts/{accountId}/payments` the correct endpoint to fetch all transactions per IBAN?
   - Does it support filtering by IBAN?
   - Example: `GET /v1/accounts/17218/payments?iban=DK9089000025328617`?

**Proposed Balance Calculation:**
```
Individual Balance = SUM(all credits) - SUM(all debits) for specific IBAN

Example for IBAN DK9089000025328617:
- Transaction 1: +€1,000 (incoming)
- Transaction 2: -€500 (withdrawal)
- Transaction 3: +€200 (incoming)
= Balance: €700
```

---

### Q3: Outgoing Payments from Virtual IBAN

**Questions:**
1. ❓ Can we send payments FROM a Virtual IBAN created via `CreateNoBankDetailsVirtualAccount`?
2. ❓ If we need to enable withdrawals, should we:
   - Option A: Update owner bank details via `PUT /v1/accounts/{accountId}/virtual/{iban}/owner-bank-details`?
   - Option B: Create a new Virtual IBAN with bank details from the start?
3. ❓ When we call `POST /v1/accounts/{accountId}/virtual/{iban}/payment`:
   - Does it debit from the **specific Virtual IBAN** balance?
   - Or does it debit from the **segregated account** balance?
   - How do we ensure User A can't spend User B's money?

**BCB Payment API:**
```json
POST /v1/accounts/17218/virtual/DK9089000025328617/payment
Request Body:
{
  "currency": "EUR",
  "amount": "200.00",
  "reference": "Withdrawal to personal account",
  "nonce": "unique-nonce-12345",        // For idempotency
  "reason": "User withdrawal request"
}

Response:
{
  "transactionId": "tx_789",
  "end2EndId": "e2e_456"
}
```

**Our Questions:**
1. ❓ If Virtual IBAN A has €1,000 (tracked locally) and Virtual IBAN B has €500:
   - Can we call payment API with IBAN A for €1,200? (More than individual balance)
   - Will BCB check individual IBAN balance or segregated account balance (€1,500 total)?
2. ❓ Do we need to provide owner bank details to enable outgoing payments?
3. ❓ What happens if we call payment API without owner bank details?

**Use Case:**
```
Segregated Account 17218 Total Balance: €1,500
├─ Virtual IBAN A (User A): €1,000 (local)
└─ Virtual IBAN B (User B): €500 (local)

Scenario 1: User A withdraws €900
POST /v1/accounts/17218/virtual/{IBAN_A}/payment
{ "amount": "900.00" }

✅ Expected: Success (User A has €1,000)
❓ Question: Does BCB verify the €1,000, or just check total €1,500?

Scenario 2: User A withdraws €1,200
POST /v1/accounts/17218/virtual/{IBAN_A}/payment
{ "amount": "1200.00" }

❌ Expected: Should fail (User A only has €1,000)
❓ Question: Will BCB reject this, or is it our responsibility to check?
```

---

### Q4: Balance Reconciliation

**Questions:**
1. ❓ What is the recommended approach for balance reconciliation?
2. ❓ Should we:
   - Option A: Store individual balances locally and sync via webhooks only?
   - Option B: Query BCB API before each operation?
   - Option C: Periodic reconciliation (e.g., daily) via `GET /v1/accounts/{accountId}/payments`?
3. ❓ If a webhook is missed, how do we detect and recover?

---

### Q5: Limits and Fees

**Questions:**
1. ❓ Are there per-Virtual-IBAN limits (daily/monthly)?
2. ❓ Or are limits applied at the segregated account level?
3. ❓ What fees are charged for:
   - Inbound SEPA transfers to Virtual IBAN?
   - Outbound payments from Virtual IBAN?
   - Monthly maintenance per Virtual IBAN?
4. ❓ Are fees deducted from the segregated account balance or individual Virtual IBAN?

---

## 💡 Proposed Architecture Options

### Option A: Local Balance Tracking (Our Current Implementation)

**Architecture:**
```
BCB Segregated Account (Pooled balance)
  ↓
Our System tracks individual Virtual IBAN balances locally
  ↓
Debit/Credit operations update local DB
  ↓
Periodic reconciliation with BCB transactions
```

**Pros:**
- Fast balance checks (no API call)
- Can enforce per-user limits

**Cons:**
- Risk of desync if webhook missed
- Need reconciliation mechanism

---

### Option B: Always Query BCB

**Architecture:**
```
User action (buy crypto)
  ↓
Query BCB balance API
  ↓
If sufficient → proceed with transaction
  ↓
Debit from segregated account
  ↓
Track in local DB for reporting
```

**Pros:**
- Always accurate balance

**Cons:**
- Higher latency
- More API calls
- Still unclear how to get per-IBAN balance

---

### Option C: Hybrid (Recommended?)

**Architecture:**
```
1. Track individual balances locally (fast)
2. Sync with BCB on critical operations (buy, withdraw)
3. Daily reconciliation of all transactions
4. Alerts on discrepancies > €1.00
```

**Questions:**
- ❓ Is this the recommended approach by BCB?
- ❓ Are there BCB customers using a similar setup?

---

## 🏗️ Our Current Flow

### Inbound Payment (Top-Up):
```
1. User sends bank transfer to their Virtual IBAN
2. BCB sends webhook to our system
3. We parse webhook.details.iban to identify user
4. We increment user's local balance
5. We create transaction record
```

### Outbound Payment (Crypto Purchase):
```
1. User places order to buy crypto
2. We check local balance
3. If sufficient → deduct from local balance
4. We create internal transaction record
5. We send crypto to user's wallet

❌ No actual BCB API call to debit segregated account
```

**Question:** ❓ Is this flow correct? Or should we call BCB Payment API to actually move funds?

---

## 📊 Expected Response Format

We would appreciate answers in this format:

| Question | Answer | API Endpoint (if applicable) |
|----------|--------|------------------------------|
| Q1.2 - Individual balance per IBAN | ... | ... |
| Q2.1 - Transaction attribution | ... | ... |
| Q3.1 - Outgoing payments | ... | ... |
| ... | ... | ... |

---

## 🔗 API Documentation References

We are currently referencing:
- BCB Client API: `https://client-api.uat.bcb.group`
- BCB Services API: `https://api.uat.bcb.group`
- OpenAPI spec: `bcb-client-api.json` (attached)

If there is updated documentation or examples for Virtual IBAN balance management, please share.

---

## ⏰ Timeline

We are preparing for production launch and need to finalize the balance management architecture. Any guidance or best practices documentation would be greatly appreciated.

**Priority Questions:** Q1 (Balance visibility), Q2 (Transaction attribution), Q3 (Outgoing payments)

---

## 📧 Contact Information

**Company:** Apricode Exchange  
**Integration Type:** Virtual IBAN for crypto exchange  
**Environment:** Sandbox (transitioning to Production)  
**Counterparty ID:** 13608  
**Segregated Account ID:** 94092443 (corrected)

---

## 🎯 ИТОГОВЫЕ ВЫВОДЫ (Dec 4, 2025)

### ✅ Что выяснили:

#### 1. Архитектура BCB Virtual IBANs
- **BCB использует Segregated Account архитектуру**
- Segregated Account (94092443) с IBAN `DK6589000025309667`
- Под ним создаются Virtual IBANs (sub-accounts)
- **BCB НЕ отслеживает индивидуальные балансы Virtual IBANs**
- BCB предоставляет только **общий баланс** Segregated Account

#### 2. Получение баланса
**Services API:**
```
GET /v3/balances/94092443
```
Возвращает:
```json
[
  {
    "account_id": 94092443,
    "iban": "DK6589000025309667",
    "balance": 1000,
    "ticker": "EUR",
    "account_name": "Digital Boost SRO 2"
  }
]
```
**Вывод:** Возвращается **один баланс** для всего Segregated Account, не breakdown по Virtual IBANs.

**Client API:**
```
GET /v1/accounts/94092443/virtual/all-account-data
```
Возвращает список Virtual IBANs **БЕЗ балансов**.

#### 3. Наша архитектура (правильная!)
```
Physical Layer (BCB):
  Segregated Account: €1,000 (физические деньги)

Logical Layer (Our Database):
  Virtual IBAN A: €600 (логический баланс)
  Virtual IBAN B: €400 (логический баланс)
  ────────────────
  Total: €1,000 ✅ Must match BCB!
```

**Наша задача:** `Σ(локальные балансы) === BCB segregated balance`

#### 4. Два способа получения данных о пополнениях

**A) Webhook (Primary) ✅ Реализовано**
- Real-time уведомления от BCB
- Содержит `iban` конкретного Virtual IBAN
- Автоматическое зачисление баланса
- **Проблема:** Может быть пропущен

**B) Polling (Fallback) ❌ НЕ реализовано**
- `GET /v1/accounts/{accountId}/payments`
- Проверка каждые 5 минут
- Обнаружение пропущенных webhook'ов
- **Проблема:** Нужно выяснить как в response узнать IBAN получателя

### ❓ Критические вопросы для BCB:

#### 1. Polling Payment Details
**Вопрос:** В endpoint `/v1/accounts/{accountId}/payments` как узнать на какой именно Virtual IBAN пришел платеж?

**Контекст:**
- Response возвращает только `transactionId`
- `/v1/accounts/{accountId}/payments/transaction/{transactionId}` возвращает `amount`, `status`, `currency`, но не IBAN получателя
- **Нужно:** IBAN получателя для routing платежа к правильному sub-account

**Варианты:**
1. Есть ли другой endpoint с полными деталями?
2. Использовать `endToEndId` или `nonce` для cross-reference?
3. Получать детали через Services API `/v3/accounts/{accountId}/transactions`?

#### 2. Webhook Reliability
**Вопросы:**
- Какой retry policy для webhook?
- Сколько попыток? С каким интервалом?
- Есть ли webhook signing для security validation?
- Можно ли настроить отдельный callback URL per Virtual IBAN?

#### 3. Balance Reconciliation
**Вопросы:**
- Как часто рекомендуете проверять баланс для reconciliation?
- Есть ли endpoint для получения statement за период?
- Есть ли dashboard для viewing segregated account balance history?

#### 4. Rate Limits
**Вопросы:**
- Какие rate limits для `/v1/accounts/{accountId}/payments`?
- Можно ли делать batch requests?
- Есть ли рекомендации по polling frequency?

---

## 📚 Документация

Полная архитектура описана в: `docs/VIRTUAL_IBAN_BALANCE_ARCHITECTURE.md`

---

Thank you for your assistance!

Best regards,  
Apricode Exchange Technical Team

