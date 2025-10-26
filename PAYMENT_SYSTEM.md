# Payment System (Pay In / Pay Out) - Documentation

## 🎯 Overview

Комплексная система учета входящих (Pay In) и исходящих (Pay Out) платежей для полного контроля финансовых потоков.

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ORDER LIFECYCLE                       │
│                                                          │
│  1. Order Created (PENDING)                             │
│  2. PayIn Created (фиат от клиента)                     │
│  3. PayIn VERIFIED → Order PROCESSING                   │
│  4. PayOut Created (крипта клиенту)                     │
│  5. PayOut CONFIRMED → Order COMPLETED                  │
└─────────────────────────────────────────────────────────┘
```

---

## 💰 Pay In (Входящие платежи)

### Database Schema

```typescript
model PayIn {
  id: string                  // Unique ID
  orderId: string             // 1:1 с Order
  userId: string              // Плательщик
  
  // Payment Details
  amount: number              // Сумма в фиате
  currency: string            // EUR, PLN
  paymentMethodCode: string   // SEPA, SWIFT, BLIK
  
  // Bank Info
  senderName?: string
  senderAccount?: string
  senderBank?: string
  reference?: string
  transactionId?: string      // ID в банке
  
  // Status & Verification
  status: PayInStatus         // См. ниже
  expectedAmount: number      // Для сверки
  receivedAmount?: number     // Фактически получено
  amountMismatch: boolean     // Несоответствие
  
  // Verification
  verifiedBy?: string         // Admin ID
  verifiedAt?: Date
  verificationNotes?: string
  
  // Reconciliation
  reconciledWith?: string     // Bank statement ref
  reconciledAt?: Date
  reconciledBy?: string
  
  // Proof
  proofUrls: string[]         // Документы
  
  // Dates
  paymentDate?: Date
  receivedDate?: Date
  createdAt: Date
  updatedAt: Date
}
```

### PayInStatus

| Status | Description | Next Actions |
|--------|-------------|--------------|
| **PENDING** | Ожидается платеж | Wait for payment |
| **RECEIVED** | Получен, не проверен | Verify payment |
| **VERIFIED** | Проверен ✅ | Create PayOut |
| **PARTIAL** | Частичная оплата | Contact customer |
| **MISMATCH** | Несоответствие суммы | Investigate |
| **RECONCILED** | Сверен с выпиской ✅ | Archive |
| **FAILED** | Не получен | Cancel order |
| **REFUNDED** | Возвращен | Close order |
| **EXPIRED** | Истек срок | Cancel order |

### API Endpoints

#### GET /api/admin/pay-in
List all incoming payments

**Query Parameters:**
- `status` - Filter by status
- `orderId` - Filter by order
- `userId` - Filter by user
- `fromDate` - From date
- `toDate` - To date
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "payin_xxx",
      "orderId": "order_xxx",
      "amount": 1000,
      "currency": "EUR",
      "status": "VERIFIED",
      "order": { ... },
      "user": { ... }
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "pages": 3
  }
}
```

#### GET /api/admin/pay-in/[id]
Get specific payment details

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payin_xxx",
    "orderId": "order_xxx",
    "userId": "user_xxx",
    "amount": 1000,
    "currency": "EUR",
    "paymentMethodCode": "sepa",
    "status": "VERIFIED",
    "expectedAmount": 1000,
    "receivedAmount": 1000,
    "amountMismatch": false,
    "senderName": "John Doe",
    "senderAccount": "DE89370400440532013000",
    "reference": "APR-2025-ABC123",
    "transactionId": "TXN123456",
    "verifiedBy": "admin_xxx",
    "verifiedAt": "2025-10-26T12:00:00Z",
    "order": { ... },
    "user": { ... }
  }
}
```

#### PATCH /api/admin/pay-in/[id]
Update payment (verify, reconcile)

**Request Body:**
```json
{
  "status": "VERIFIED",
  "receivedAmount": 1000,
  "senderName": "John Doe",
  "senderAccount": "DE89370400440532013000",
  "reference": "APR-2025-ABC123",
  "transactionId": "TXN123456",
  "verificationNotes": "Payment verified via bank statement",
  "paymentDate": "2025-10-26T10:00:00Z",
  "receivedDate": "2025-10-26T12:00:00Z"
}
```

---

## 🚀 Pay Out (Исходящие платежи)

### Database Schema

```typescript
model PayOut {
  id: string                    // Unique ID
  orderId: string               // 1:1 с Order
  userId: string                // Получатель
  
  // Crypto Details
  amount: number                // Количество
  currency: string              // BTC, ETH, USDT
  networkCode: string           // ETHEREUM, BSC, etc.
  
  // Destination
  destinationAddress: string
  destinationTag?: string       // Memo/Tag
  userWalletId?: string
  
  // Transaction
  transactionHash?: string
  explorerUrl?: string
  blockNumber?: number
  confirmations: number         // Default: 0
  
  // Fees
  networkFee: number
  networkFeeCurrency: string
  
  // Status & Processing
  status: PayOutStatus          // См. ниже
  failureReason?: string
  retryCount: number            // Default: 0
  
  // Processing
  processedBy?: string          // Admin ID
  processedAt?: Date
  processingNotes?: string
  
  // Platform Wallet
  fromWalletId?: string
  
  // Dates
  scheduledFor?: Date
  sentAt?: Date
  confirmedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

### PayOutStatus

| Status | Description | Next Actions |
|--------|-------------|--------------|
| **PENDING** | Ожидает отправки | Queue for processing |
| **QUEUED** | В очереди | Process transaction |
| **PROCESSING** | Обрабатывается | Wait for broadcast |
| **SENT** | Отправлено 📤 | Wait for confirmations |
| **CONFIRMING** | Ждем подтверждений | Monitor blockchain |
| **CONFIRMED** | Подтверждено ✅ | Complete order |
| **FAILED** | Ошибка ❌ | Retry or refund |
| **CANCELLED** | Отменено | Refund customer |

### API Endpoints

#### GET /api/admin/pay-out
List all outgoing payments

**Query Parameters:**
- `status` - Filter by status
- `orderId` - Filter by order
- `userId` - Filter by user
- `currency` - Filter by crypto
- `networkCode` - Filter by blockchain
- `fromDate` - From date
- `toDate` - To date
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "payout_xxx",
      "orderId": "order_xxx",
      "amount": 0.024,
      "currency": "BTC",
      "networkCode": "BITCOIN",
      "destinationAddress": "bc1q...",
      "status": "CONFIRMED",
      "transactionHash": "0xabc...",
      "confirmations": 6,
      "order": { ... },
      "user": { ... }
    }
  ],
  "pagination": { ... }
}
```

#### GET /api/admin/pay-out/[id]
Get specific payment details

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payout_xxx",
    "orderId": "order_xxx",
    "userId": "user_xxx",
    "amount": 0.024,
    "currency": "BTC",
    "networkCode": "BITCOIN",
    "destinationAddress": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "status": "CONFIRMED",
    "transactionHash": "abc123def456...",
    "explorerUrl": "https://blockchair.com/bitcoin/transaction/abc123",
    "blockNumber": 850000,
    "confirmations": 12,
    "networkFee": 0.0001,
    "networkFeeCurrency": "BTC",
    "processedBy": "admin_xxx",
    "processedAt": "2025-10-26T13:00:00Z",
    "sentAt": "2025-10-26T13:05:00Z",
    "confirmedAt": "2025-10-26T14:00:00Z",
    "order": { ... },
    "user": { ... }
  }
}
```

#### PATCH /api/admin/pay-out/[id]
Update payment (process, confirm)

**Request Body:**
```json
{
  "status": "SENT",
  "transactionHash": "0xabc123def456...",
  "blockNumber": 850000,
  "networkFee": 0.0001,
  "fromWalletId": "wallet_xxx",
  "processingNotes": "Sent from main hot wallet",
  "sentAt": "2025-10-26T13:05:00Z"
}
```

---

## 🔄 Workflow

### Complete Order Flow with Payments

```
1. ORDER CREATED
   └─> Status: PENDING
   └─> PayIn: Auto-created with status PENDING

2. CUSTOMER PAYS
   └─> Admin marks PayIn as RECEIVED
   └─> Admin verifies payment details

3. PAYMENT VERIFIED
   └─> PayIn: Status → VERIFIED
   └─> Order: Status → PROCESSING
   └─> PayOut: Auto-created with status PENDING

4. ADMIN SENDS CRYPTO
   └─> Admin processes PayOut
   └─> PayOut: Status → SENT
   └─> Transaction broadcasted to blockchain

5. TRANSACTION CONFIRMED
   └─> Monitor confirmations (webhook or cron)
   └─> PayOut: Status → CONFIRMED
   └─> Order: Status → COMPLETED

6. RECONCILIATION (optional)
   └─> Match PayIn with bank statement
   └─> PayIn: Status → RECONCILED
```

---

## 📈 Monitoring & Analytics

### Key Metrics

- **PayIn Pending** - Awaiting customer payment
- **PayIn Verified** - Ready for processing
- **PayOut Pending** - Awaiting admin action
- **PayOut Confirming** - Monitoring blockchain
- **Mismatched Amounts** - Need investigation
- **Failed Payments** - Require retry

---

## 🎯 Next Steps

1. ✅ **Database & API** - COMPLETE
2. 🔄 **Admin UI** - Create pages for PayIn/PayOut management
3. 🔄 **Auto-creation** - Auto-create PayIn/PayOut when Order created
4. 🔄 **Monitoring** - Dashboard with payment stats
5. ⏳ **Reconciliation** - Tool for bank statement matching
6. ⏳ **Notifications** - Email alerts for payment events
7. ⏳ **Webhooks** - Blockchain confirmations monitoring

---

## 🔐 Security

- ✅ Admin-only access
- ✅ Audit logging for all payment updates
- ✅ Amount verification (expected vs received)
- ✅ Transaction hash validation
- ✅ Explorer URL generation
- ⏳ IP whitelist for sensitive actions
- ⏳ 2FA requirement for large amounts

---

## 📝 Notes

- PayIn и PayOut связаны 1:1 с Order
- Auto-verification возможна через webhooks
- Reconciliation - ручной процесс (пока)
- Network fees должны быть учтены заранее
- Confirmations мониторятся вручную (автоматизация later)

**Status:** API Ready ✅ | UI Pending 🔄 | Integration Pending 🔄

