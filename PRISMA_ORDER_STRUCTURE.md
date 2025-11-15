# 📊 Order Model - Полная структура Prisma

## 🔍 Order Model

### Прямые поля:
```prisma
- id: String
- userId: String
- currencyCode: String
- fiatCurrencyCode: String
- paymentReference: String (unique)
- cryptoAmount: Float
- fiatAmount: Float
- rate: Float
- feePercent: Float
- feeAmount: Float
- totalFiat: Float
- userWalletId: String?
- walletAddress: String
- blockchainCode: String?
- paymentMethodCode: String?
- status: OrderStatus
- createdByAdmin: Boolean
- adminNotes: String?
- transactionHash: String?
- processedBy: String?
- processedAt: DateTime?
- expiresAt: DateTime
- createdAt: DateTime
- updatedAt: DateTime
```

### ❌ НЕ существуют в Order:
- `internalNote` - такого поля НЕТ
- `notes` - такого поля НЕТ  
- `completedAt` - такого поля НЕТ

### Relations в Order:
```prisma
- blockchain: BlockchainNetwork? (optional)
- currency: Currency (required)
- fiatCurrency: FiatCurrency (required)
- paymentMethod: PaymentMethod? (optional)
  └─> paymentAccount: PaymentAccount? (через paymentMethod)
- user: User (required)
  └─> profile: Profile?
  └─> kycSession: KycSession?
- userWallet: UserWallet? (optional)
  └─> currency: Currency
  └─> blockchain: BlockchainNetwork
- statusHistory: OrderStatusHistory[] (array)
- payIn: PayIn? (one-to-one, optional)
- payOut: PayOut? (one-to-one, optional)
- paymentProofs: PaymentProof[] (array)
```

---

## 🔍 PayIn Model

### Прямые поля:
```prisma
- id, orderId, userId
- amount: Float
- fiatCurrencyCode: String?
- cryptocurrencyCode: String?
- currencyType: CurrencyType
- paymentMethodCode: String?
- senderName, senderAccount, senderBank, reference
- status: PayInStatus
- expectedAmount, receivedAmount
- verifiedBy, verifiedAt, verificationNotes
- receivedDate: DateTime? (НЕ receivedAt!)
- createdAt, updatedAt
- approvedBy, approvedAt
- initiatedBy, initiatedAt
```

### ❌ НЕ существуют в PayIn:
- `paymentAccount` relation напрямую - только через `paymentMethod`

### Relations в PayIn:
```prisma
- cryptocurrency: Currency?
- fiatCurrency: FiatCurrency?
- paymentMethod: PaymentMethod?
  └─> paymentAccount: PaymentAccount? (ЗДЕСЬ!)
- order: Order
- user: User
```

---

## 🔍 PayOut Model

### Прямые поля:
```prisma
- id, orderId, userId
- amount: Float
- fiatCurrencyCode: String?
- cryptocurrencyCode: String?
- currencyType: CurrencyType
- networkCode: String?
- destinationAddress: String?
- transactionHash: String?
- status: PayOutStatus
- processedBy, processedAt, processingNotes
- sentAt: DateTime?
- confirmedAt: DateTime?
- createdAt, updatedAt
- approvedBy, approvedAt
- initiatedBy, initiatedAt
```

### Relations в PayOut:
```prisma
- cryptocurrency: Currency?
- fiatCurrency: FiatCurrency?
- network: BlockchainNetwork?
- paymentMethod: PaymentMethod?
- userWallet: UserWallet?
- order: Order
- user: User
```

---

## 🔍 OrderStatusHistory Model

### Прямые поля:
```prisma
- id: String
- orderId: String
- oldStatus: OrderStatus
- newStatus: OrderStatus
- changedBy: String (просто ID админа, НЕ relation!)
- note: String? (единственное число!)
- createdAt: DateTime
```

### ❌ НЕ существуют:
- `changedAt` - используй `createdAt`
- `notes` - используй `note` (единственное число)
- `changedByAdmin` relation - НЕТ такой связи!

### Relations:
```prisma
- order: Order (единственная relation)
```

---

## ✅ Правильный Prisma запрос для Order Report:

```typescript
const order = await prisma.order.findUnique({
  where: { id: orderId },
  include: {
    user: {
      include: {
        profile: true,
        kycSession: true,
      },
    },
    currency: true,
    fiatCurrency: true,
    blockchain: true,
    paymentMethod: {
      include: {
        paymentAccount: true, // Через paymentMethod!
      },
    },
    userWallet: {
      include: {
        currency: true,
        blockchain: true,
      },
    },
    payIn: {
      include: {
        cryptocurrency: true,
        fiatCurrency: true,
        paymentMethod: {
          include: {
            paymentAccount: true, // Здесь тоже!
          },
        },
      },
    },
    payOut: {
      include: {
        cryptocurrency: true,
        fiatCurrency: true,
        network: true,
        paymentMethod: true,
        userWallet: true,
      },
    },
    statusHistory: {
      orderBy: {
        createdAt: 'asc', // НЕ changedAt!
      },
    },
  },
});
```

---

## 📝 Использование данных:

```typescript
// ✅ Правильно:
order.adminNotes           // Есть
order.createdAt            // Есть
order.updatedAt            // Есть
order.expiresAt            // Есть
order.processedAt          // Есть
order.payIn?.receivedDate  // Есть (НЕ receivedAt!)
order.payOut?.sentAt       // Есть

// ❌ НЕправильно:
order.notes                // НЕТ такого поля
order.internalNote         // НЕТ такого поля
order.completedAt          // НЕТ такого поля
order.payIn?.receivedAt    // НЕТ - есть receivedDate

// StatusHistory:
history.createdAt          // ✅ Да
history.note               // ✅ Да (единственное число!)
history.changedBy          // ✅ Да (String ID)
history.changedAt          // ❌ НЕТ - используй createdAt
history.notes              // ❌ НЕТ - используй note
history.changedByAdmin     // ❌ НЕТ такой relation
```

