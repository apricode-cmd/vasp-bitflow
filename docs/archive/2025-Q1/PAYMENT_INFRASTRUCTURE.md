# Payment Infrastructure - Unified Architecture

## 🎯 Overview

Unified payment infrastructure that handles both **fiat (bank transfers)** and **crypto (blockchain wallets)** payment methods through a single, extensible architecture.

## 📊 Architecture

### Core Models

```
PaymentAccount (Unified)
├── BANK_ACCOUNT (Fiat)
│   ├── FiatCurrency
│   └── Bank Details (IBAN, SWIFT, etc.)
└── CRYPTO_WALLET (Crypto)
    ├── Cryptocurrency
    ├── BlockchainNetwork
    └── Wallet Address
```

### Key Enums

```typescript
// Payment Direction
enum PaymentDirection {
  IN        // Incoming payments (deposits)
  OUT       // Outgoing payments (withdrawals)
  BOTH      // Both directions
}

// Provider Type
enum ProviderType {
  MANUAL            // Manual processing
  BANK_ACCOUNT      // Bank account
  PSP               // Payment Service Provider (Stripe, PayPal, etc.)
  CRYPTO_WALLET     // Cryptocurrency wallet
}

// Automation Level
enum AutomationLevel {
  MANUAL        // Fully manual
  SEMI_AUTO     // Semi-automated (requires confirmation)
  FULLY_AUTO    // Fully automated
}

// Account Type
enum PaymentAccountType {
  BANK_ACCOUNT    // Fiat bank account
  CRYPTO_WALLET   // Cryptocurrency wallet
}
```

## 🏦 PaymentAccount Model

Unified model for **all payment sources and destinations**.

### Fields

```prisma
model PaymentAccount {
  id          String  @id @default(cuid())
  code        String  @unique  // Unique identifier (e.g., 'sepa_eur_main')
  name        String             // Display name
  type        PaymentAccountType // BANK_ACCOUNT | CRYPTO_WALLET
  description String?
  
  // Relations
  fiatCurrencyCode      String?
  cryptocurrencyCode    String?
  blockchainCode        String?
  
  // FIAT: Bank Account Details
  accountHolder   String?
  bankName        String?
  bankAddress     String?
  iban            String?
  accountNumber   String?
  swift           String?
  bic             String?
  routingNumber   String?
  
  // CRYPTO: Wallet Details
  address         String?  // Wallet address
  memo            String?  // Memo/Tag (for XRP, XLM, etc.)
  tag             String?  // Destination Tag
  
  // Common
  balance         Float?
  minBalance      Float?
  referenceTemplate String?      // e.g., 'APR-{orderId}'
  instructions    String?        // Payment instructions
  isActive        Boolean @default(true)
  isDefault       Boolean @default(false)
  priority        Int     @default(1)
  alertsEnabled   Boolean @default(false)
  lastChecked     DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String?
  
  // Relations
  fiatCurrency    FiatCurrency?     @relation(fields: [fiatCurrencyCode], references: [code])
  cryptocurrency  Currency?         @relation(fields: [cryptocurrencyCode], references: [code])
  blockchain      BlockchainNetwork? @relation(fields: [blockchainCode], references: [code])
  paymentMethods  PaymentMethod[]
  payOuts         PayOut[]
  
  @@index([type])
  @@index([fiatCurrencyCode])
  @@index([cryptocurrencyCode])
  @@index([blockchainCode])
}
```

## 💳 PaymentMethod Model

Defines **HOW** payments are processed.

### Updated Fields

```prisma
model PaymentMethod {
  id            String   @id @default(cuid())
  code          String   @unique
  type          String   // 'bank_transfer', 'card_payment', 'crypto_transfer'
  name          String
  
  // NEW: Enhanced fields
  direction         PaymentDirection  @default(IN)
  providerType      ProviderType      @default(MANUAL)
  automationLevel   AutomationLevel   @default(MANUAL)
  
  currency          String
  supportedNetworks String[]  // For crypto: ['ETHEREUM', 'BSC', 'POLYGON']
  
  // PSP Integration
  paymentAccountId  String?
  paymentAccount    PaymentAccount?  @relation(fields: [paymentAccountId], references: [id])
  
  // Processing
  processingTime    String?
  minAmount         Float?
  maxAmount         Float?
  feeFixed          Float   @default(0)
  feePercent        Float   @default(0)
  instructions      String?
  
  isActive              Boolean @default(true)
  isAvailableForClients Boolean @default(true)
  priority              Int     @default(1)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations (existing)
  payIns            PayIn[]
  payOuts           PayOut[]
  
  @@index([currency])
  @@index([providerType])
  @@index([automationLevel])
  @@index([isAvailableForClients])
}
```

## 📥 PayIn / 📤 PayOut Models

Enhanced to support **both fiat and crypto**.

### PayIn (Incoming Payments)

```prisma
model PayIn {
  id              String    @id @default(cuid())
  orderId         String
  userId          String
  
  // Currency (one of these will be set)
  fiatCurrencyCode    String?
  cryptocurrencyCode  String?
  currencyType        CurrencyType  // FIAT | CRYPTO
  
  amount          Float
  expectedAmount  Float
  
  // Relations
  fiatCurrency    FiatCurrency?  @relation(fields: [fiatCurrencyCode], references: [code])
  cryptocurrency  Currency?      @relation(fields: [cryptocurrencyCode], references: [code])
  
  // FIAT: Bank Transfer Details
  paymentMethodCode String?
  paymentMethod     PaymentMethod? @relation(fields: [paymentMethodCode], references: [code])
  senderName        String?
  senderAccount     String?
  senderBank        String?
  reference         String?
  
  // CRYPTO: Blockchain Details
  networkCode       String?
  network           BlockchainNetwork? @relation(fields: [networkCode], references: [code])
  transactionHash   String?
  blockNumber       Int?
  confirmations     Int    @default(0)
  
  status          PayInStatus
  // ... other fields
  
  @@index([currencyType])
  @@index([fiatCurrencyCode])
  @@index([cryptocurrencyCode])
}
```

### PayOut (Outgoing Payments)

```prisma
model PayOut {
  id              String    @id @default(cuid())
  orderId         String
  userId          String
  
  // Currency (one of these will be set)
  fiatCurrencyCode    String?
  cryptocurrencyCode  String?
  currencyType        CurrencyType  // FIAT | CRYPTO
  
  amount          Float
  
  // Relations
  fiatCurrency    FiatCurrency?  @relation(fields: [fiatCurrencyCode], references: [code])
  cryptocurrency  Currency?      @relation(fields: [cryptocurrencyCode], references: [code])
  
  // Source (where funds come from)
  paymentAccountId  String?
  paymentAccount    PaymentAccount? @relation(fields: [paymentAccountId], references: [id])
  
  // FIAT: Bank Transfer Details
  paymentMethodCode String?
  paymentMethod     PaymentMethod? @relation(fields: [paymentMethodCode], references: [code])
  recipientName     String?
  recipientAccount  String?
  recipientBank     String?
  paymentReference  String?
  
  // CRYPTO: Blockchain Details
  networkCode       String?
  network           BlockchainNetwork? @relation(fields: [networkCode], references: [code])
  destinationAddress String?
  transactionHash   String?
  blockNumber       Int?
  confirmations     Int    @default(0)
  networkFee        Float?
  
  status          PayOutStatus
  // ... other fields
  
  @@index([fiatCurrencyCode])
  @@index([cryptocurrencyCode])
}
```

## 🔄 Migration Strategy

### Development

```bash
# Apply changes to development DB
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Seed data
npx tsx prisma/seed.ts
```

### Production

```bash
# Apply migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Seed reference data (if needed)
npx tsx prisma/seed.ts
```

## 📝 Usage Examples

### 1. Creating a Bank Account (PaymentAccount)

```typescript
await prisma.paymentAccount.create({
  data: {
    code: 'sepa_eur_main',
    name: 'Main EUR SEPA Account',
    type: 'BANK_ACCOUNT',
    fiatCurrency: { connect: { code: 'EUR' } },
    accountHolder: 'Apricode Exchange Ltd',
    iban: 'DE89370400440532013000',
    swift: 'COBADEFFXXX',
    isActive: true,
    isDefault: true,
  }
});
```

### 2. Creating a Crypto Wallet (PaymentAccount)

```typescript
await prisma.paymentAccount.create({
  data: {
    code: 'btc_hot_wallet',
    name: 'BTC Hot Wallet',
    type: 'CRYPTO_WALLET',
    cryptocurrency: { connect: { code: 'BTC' } },
    blockchain: { connect: { code: 'BITCOIN' } },
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    balance: 0.5,
    isActive: true,
  }
});
```

### 3. Creating a Payment Method

```typescript
await prisma.paymentMethod.create({
  data: {
    code: 'sepa_eur',
    type: 'bank_transfer',
    name: 'SEPA Bank Transfer',
    direction: 'IN',
    providerType: 'MANUAL',
    automationLevel: 'MANUAL',
    currency: 'EUR',
    paymentAccount: { connect: { code: 'sepa_eur_main' } },
    minAmount: 10,
    maxAmount: 50000,
    isActive: true,
  }
});
```

### 4. Creating a PayIn (Fiat)

```typescript
await prisma.payIn.create({
  data: {
    order: { connect: { id: orderId } },
    user: { connect: { id: userId } },
    amount: 100.00,
    expectedAmount: 100.00,
    currencyType: 'FIAT',
    fiatCurrency: { connect: { code: 'EUR' } },
    paymentMethod: { connect: { code: 'sepa_eur' } },
    senderName: 'John Doe',
    reference: 'APR-ORDER-123',
    status: 'PENDING',
  }
});
```

### 5. Creating a PayOut (Crypto)

```typescript
await prisma.payOut.create({
  data: {
    order: { connect: { id: orderId } },
    user: { connect: { id: userId } },
    amount: 0.5,
    currencyType: 'CRYPTO',
    cryptocurrency: { connect: { code: 'ETH' } },
    network: { connect: { code: 'ETHEREUM' } },
    paymentAccount: { connect: { code: 'eth_main_wallet' } },
    destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
    status: 'PENDING',
  }
});
```

## 🎨 UI Integration

### Admin Panel: Payment Accounts

**Path:** `/admin/payment-accounts`

Features:
- List all payment accounts (bank + crypto)
- Filter by type (BANK_ACCOUNT | CRYPTO_WALLET)
- Filter by currency
- View balance and status
- Create/Edit/Delete accounts
- Set default account per currency

### Admin Panel: Payment Methods

**Path:** `/admin/payment-methods`

Features:
- List all payment methods
- Filter by direction (IN | OUT | BOTH)
- Filter by provider type
- Filter by automation level
- Link to PaymentAccount
- Configure fees and limits
- Enable/Disable for clients

## 🔐 Security Considerations

1. **Sensitive Data**: Bank details and wallet addresses are stored in the database
2. **Access Control**: Only admins can view/edit PaymentAccounts
3. **Audit Logging**: All changes are logged in AuditLog
4. **Balance Monitoring**: Set `minBalance` and `alertsEnabled` for notifications
5. **Multi-Signature**: For crypto wallets, implement multi-sig in future

## 🚀 Future Enhancements

- [ ] PSP Integrations (Stripe, PayPal, etc.)
- [ ] Automated balance checks
- [ ] Multi-signature wallet support
- [ ] Automated payouts (for approved orders)
- [ ] Real-time balance monitoring
- [ ] Payment reconciliation dashboard
- [ ] Webhook handlers for bank APIs
- [ ] Smart contract integration

## 📚 Related Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [Admin Guide](./ADMIN_GUIDE.md)
- [Database Schema](./prisma/schema.prisma)
- [Seed Data](./prisma/seed-payment-accounts.ts)

---

**Last Updated:** October 26, 2025
**Version:** 1.0.0
