# ✅ Payment System (Pay In / Pay Out) - COMPLETE

## 🎯 Overview

Комплексная двунаправленная система платежей поддерживающая **CRYPTO и FIAT** в обоих направлениях (Pay In и Pay Out).

---

## 📊 Architecture

### Unified Payment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FLEXIBLE PAYMENT SYSTEM                         │
│                                                                      │
│  Pay In (Incoming)              Order              Pay Out (Outgoing)│
│  ─────────────────              ─────              ──────────────────│
│                                                                      │
│  FIAT → CRYPTO (BUY)            ←→                CRYPTO → CLIENT    │
│  EUR/PLN → BTC/ETH                               BTC/ETH → Address  │
│                                                                      │
│  CRYPTO → FIAT (SELL)           ←→                FIAT → CLIENT      │
│  BTC/ETH → Exchange                              EUR/PLN → Bank     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 💰 Database Schema

### CurrencyType Enum

```prisma
enum CurrencyType {
  FIAT             // Фиатные валюты (EUR, USD, PLN)
  CRYPTO           // Криптовалюты (BTC, ETH, USDT)
}
```

### PayIn Model (Универсальный)

```prisma
model PayIn {
  id               String   @id
  orderId          String   @unique
  userId           String
  
  // Universal Payment Details
  amount           Float
  currency         String // EUR, PLN, BTC, ETH, USDT, etc.
  currencyType     CurrencyType // FIAT or CRYPTO
  
  // FIAT-specific fields
  paymentMethodCode String? // SEPA, SWIFT, BLIK
  senderName       String?
  senderAccount    String? // IBAN
  senderBank       String?
  reference        String?
  
  // CRYPTO-specific fields
  networkCode      String? // ETHEREUM, BSC, POLYGON, TRON
  senderAddress    String? // Crypto address
  transactionHash  String?
  blockNumber      Int?
  confirmations    Int @default(0)
  explorerUrl      String?
  
  // Universal fields
  transactionId    String? @unique // Bank ID or TX hash
  status           PayInStatus
  expectedAmount   Float
  receivedAmount   Float?
  amountMismatch   Boolean @default(false)
  
  // Verification & Reconciliation
  verifiedBy       String?
  verifiedAt       DateTime?
  reconciledWith   String?
  reconciledAt     DateTime?
  
  // Proof
  proofUrls        String[]
  
  // Timestamps
  paymentDate      DateTime?
  receivedDate     DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

### PayOut Model (Универсальный)

```prisma
model PayOut {
  id                String   @id
  orderId           String   @unique
  userId            String
  
  // Universal Payment Details
  amount            Float
  currency          String // BTC, ETH, EUR, PLN, etc.
  currencyType      CurrencyType // CRYPTO or FIAT
  
  // CRYPTO-specific fields
  networkCode       String? // ETHEREUM, BSC, etc.
  destinationAddress String? // Crypto address
  destinationTag     String? // Memo/Tag
  userWalletId       String?
  transactionHash    String? @unique
  explorerUrl        String?
  blockNumber        Int?
  confirmations      Int @default(0)
  networkFee         Float?
  networkFeeCurrency String?
  
  // FIAT-specific fields
  recipientName      String?
  recipientAccount   String? // IBAN
  recipientBank      String?
  paymentReference   String?
  bankTransactionId  String?
  paymentMethodCode  String? // SEPA, SWIFT
  
  // Universal fields
  status             PayOutStatus
  failureReason      String?
  retryCount         Int @default(0)
  
  // Processing
  processedBy        String?
  processedAt        DateTime?
  processingNotes    String?
  fromWalletId       String? // Platform wallet or bank account
  
  // Timestamps
  scheduledFor       DateTime?
  sentAt             DateTime?
  confirmedAt        DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

---

## 🔄 Use Cases

### Use Case 1: BUY Crypto (FIAT → CRYPTO)

**Scenario:** User wants to buy BTC for EUR

1. **Order Created:**
   - Type: BUY
   - User pays: 1000 EUR (FIAT)
   - User receives: 0.024 BTC (CRYPTO)

2. **PayIn Created (FIAT):**
   ```javascript
   {
     currency: "EUR",
     currencyType: "FIAT",
     amount: 1000,
     paymentMethodCode: "SEPA",
     senderAccount: "DE89370400440532013000",
     status: "PENDING"
   }
   ```

3. **PayOut Created (CRYPTO):**
   ```javascript
   {
     currency: "BTC",
     currencyType: "CRYPTO",
     amount: 0.024,
     networkCode: "BITCOIN",
     destinationAddress: "bc1q...",
     status: "PENDING"
   }
   ```

**Flow:**
```
EUR (Bank) → Platform → BTC (Blockchain) → User Wallet
```

---

### Use Case 2: SELL Crypto (CRYPTO → FIAT)

**Scenario:** User wants to sell BTC for EUR

1. **Order Created:**
   - Type: SELL
   - User pays: 0.024 BTC (CRYPTO)
   - User receives: 1000 EUR (FIAT)

2. **PayIn Created (CRYPTO):**
   ```javascript
   {
     currency: "BTC",
     currencyType: "CRYPTO",
     amount: 0.024,
     networkCode: "BITCOIN",
     senderAddress: "bc1quser...",
     transactionHash: "0xabc...",
     status: "PENDING"
   }
   ```

3. **PayOut Created (FIAT):**
   ```javascript
   {
     currency: "EUR",
     currencyType: "FIAT",
     amount: 1000,
     paymentMethodCode: "SEPA",
     recipientAccount: "DE89370400440532013000",
     recipientName: "John Doe",
     status: "PENDING"
   }
   ```

**Flow:**
```
BTC (User Wallet) → Platform → EUR (Bank) → User Account
```

---

### Use Case 3: P2P Crypto Transfer (CRYPTO → CRYPTO)

**Scenario:** User sends USDT from one wallet to another

Both PayIn and PayOut:
```javascript
{
  currency: "USDT",
  currencyType: "CRYPTO",
  networkCode: "ETHEREUM" // or BSC, POLYGON, TRON
}
```

---

### Use Case 4: Fiat Transfer (FIAT → FIAT)

**Scenario:** Internal EUR transfer

Both PayIn and PayOut:
```javascript
{
  currency: "EUR",
  currencyType: "FIAT",
  paymentMethodCode: "SEPA"
}
```

---

## 🎯 API Endpoints

### Pay In (Universal)

#### `GET /api/admin/pay-in`
List all incoming payments (FIAT + CRYPTO)

**Query Parameters:**
- `currencyType` - Filter by FIAT or CRYPTO
- `status` - Filter by status
- `currency` - Filter by specific currency (EUR, BTC, etc.)
- `networkCode` - Filter by blockchain (for crypto)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "payin_1",
      "currency": "EUR",
      "currencyType": "FIAT",
      "amount": 1000,
      "paymentMethodCode": "SEPA",
      "senderAccount": "DE89...",
      "status": "VERIFIED"
    },
    {
      "id": "payin_2",
      "currency": "BTC",
      "currencyType": "CRYPTO",
      "amount": 0.024,
      "networkCode": "BITCOIN",
      "transactionHash": "0xabc...",
      "confirmations": 6,
      "status": "VERIFIED"
    }
  ]
}
```

#### `PATCH /api/admin/pay-in/[id]`
Update payment (verify, add TX hash, etc.)

**FIAT Payment Update:**
```json
{
  "status": "VERIFIED",
  "receivedAmount": 1000,
  "transactionId": "BANK_TX_123"
}
```

**CRYPTO Payment Update:**
```json
{
  "status": "VERIFIED",
  "transactionHash": "0xabc123...",
  "confirmations": 6,
  "explorerUrl": "https://etherscan.io/tx/0xabc123"
}
```

### Pay Out (Universal)

Similar structure with support for both FIAT and CRYPTO.

---

## 📋 Payment Statuses

### PayInStatus (Same for FIAT & CRYPTO)

| Status | FIAT Example | CRYPTO Example |
|--------|-------------|----------------|
| **PENDING** | Waiting for bank transfer | Waiting for blockchain TX |
| **RECEIVED** | Bank transfer received | TX broadcasted |
| **VERIFIED** | Bank statement matched | 6+ confirmations |
| **PARTIAL** | Wrong amount received | Wrong amount sent |
| **MISMATCH** | Amount doesn't match | Amount doesn't match |
| **RECONCILED** | Matched with statement | Finalized on-chain |
| **FAILED** | Transfer failed | TX reverted |
| **REFUNDED** | Money returned | Crypto refunded |
| **EXPIRED** | Timeout exceeded | Timeout exceeded |

### PayOutStatus (Same for FIAT & CRYPTO)

| Status | FIAT Example | CRYPTO Example |
|--------|-------------|----------------|
| **PENDING** | Queue for bank transfer | Queue for blockchain send |
| **QUEUED** | Batch scheduled | TX queued |
| **PROCESSING** | Processing with bank | Building TX |
| **SENT** | Transfer initiated | TX broadcasted |
| **CONFIRMING** | Bank processing | Waiting confirmations |
| **CONFIRMED** | Transfer completed | Confirmed on-chain |
| **FAILED** | Bank rejected | TX failed |
| **CANCELLED** | Cancelled by admin | Cancelled by admin |

---

## 🔧 Implementation

### ✅ Completed

1. ✅ **Database Schema** - Unified PayIn/PayOut with CurrencyType
2. ✅ **Prisma Models** - Full relations and indexes
3. ✅ **Migration Applied** - Schema updated in DB
4. ✅ **API Endpoints** - GET, PATCH for PayIn/PayOut
5. ✅ **Admin UI** - Pages for /admin/pay-in and /admin/pay-out
6. ✅ **AdminSidebar** - Navigation with counters
7. ✅ **Stats API** - Real-time pending counts

### 🔄 Integration Points

#### Automatic PayIn Creation (Order → PayIn)

```typescript
// When order is created
await PaymentService.createPayInForOrder({
  orderId: order.id,
  userId: order.userId,
  amount: order.totalFiat, // or cryptoAmount
  currency: order.fiatCurrencyCode, // or currencyCode
  currencyType: orderType === 'BUY' ? 'FIAT' : 'CRYPTO',
  paymentMethodCode: selectedMethod, // or null for crypto
  networkCode: selectedNetwork, // or null for fiat
  expectedAmount: order.totalFiat
});
```

#### Automatic PayOut Creation (PayIn Verified → PayOut)

```typescript
// When PayIn is verified
if (payIn.status === 'VERIFIED') {
  await PaymentService.createPayOutForOrder({
    orderId: payIn.orderId,
    userId: payIn.userId,
    amount: order.cryptoAmount, // or fiatAmount
    currency: order.currencyCode, // or fiatCurrencyCode
    currencyType: orderType === 'BUY' ? 'CRYPTO' : 'FIAT',
    networkCode: order.networkCode, // or null
    destinationAddress: order.walletAddress, // or null
    recipientAccount: userBankAccount, // or null
    paymentMethodCode: method // or null
  });
}
```

---

## 🎯 Admin Dashboard Integration

### Sidebar Navigation

- 💰 **Pay In** (badge: pending count)
  - Incoming FIAT payments
  - Incoming CRYPTO payments
  
- 📤 **Pay Out** (badge: pending count)
  - Outgoing CRYPTO payments
  - Outgoing FIAT payments

### Stats API Response

```json
{
  "payIn": {
    "pending": 5,
    "received": 3,
    "total": 8
  },
  "payOut": {
    "pending": 2,
    "sent": 4,
    "total": 6
  }
}
```

---

## 🔐 Security

- ✅ Admin-only access (requireRole)
- ✅ Audit logging for all updates
- ✅ Amount verification (expected vs received)
- ✅ Transaction hash validation
- ✅ FK constraints with proper mapping
- ✅ Blockchain confirmation tracking
- ✅ Bank statement reconciliation

---

## 🚀 What's Next?

### Immediate (Manual Mode)
- ✅ Admin manually marks payments as received
- ✅ Admin manually processes outgoing payments
- ✅ Admin verifies amounts and TX hashes

### Phase 2 (Automation)
- ⏳ Blockchain monitoring (webhooks/polling)
- ⏳ Bank API integration (automated reconciliation)
- ⏳ Auto-verification for small amounts
- ⏳ Batch processing for PayOuts

### Phase 3 (Advanced)
- ⏳ Multi-signature wallets
- ⏳ Smart contract integration
- ⏳ DeFi protocols support
- ⏳ Cross-chain bridges

---

## 📝 Summary

**Payment System теперь поддерживает:**

✅ **Buy Crypto:** FIAT (PayIn) → CRYPTO (PayOut)  
✅ **Sell Crypto:** CRYPTO (PayIn) → FIAT (PayOut)  
✅ **P2P Crypto:** CRYPTO (PayIn) → CRYPTO (PayOut)  
✅ **Fiat Transfers:** FIAT (PayIn) → FIAT (PayOut)

**Полная гибкость для любых типов транзакций! 🎉**

---

**Status:** Production Ready ✅  
**Database:** Migrated ✅  
**API:** Complete ✅  
**UI:** Complete ✅  
**Integration:** Ready ✅

