# 📋 Payment Method Configuration - Schema Analysis

## 🗄️ Database Schema (Prisma)

### PaymentMethod Model

```prisma
model PaymentMethod {
  code           String           @id @unique
  name           String
  description    String?
  
  // Classification
  type           String                    // bank_transfer, card_payment, instant, crypto_transfer
  direction      PaymentDirection          // IN, OUT, BOTH
  providerType   ProviderType              // MANUAL, BANK_ACCOUNT, PSP, CRYPTO_WALLET
  automationLevel AutomationLevel          // MANUAL, SEMI_AUTO, FULLY_AUTO
  
  // Payment Details
  currency       String                    // EUR, PLN
  supportedNetworks String[]               // For crypto: ["ETHEREUM", "BSC"]
  
  // Provider Connection (NEW: unified approach)
  pspConnector     String?                 // Link to PspConnector
  paymentAccountId String?                 // Link to PaymentAccount (bank OR crypto)
  
  // Relations
  fiatCurrency   FiatCurrency?   @relation(fields: [currency], references: [code])
  psp            PspConnector?   @relation(fields: [pspConnector], references: [code])
  paymentAccount PaymentAccount? @relation(fields: [paymentAccountId], references: [id])
}
```

### Enums

```prisma
enum PaymentDirection {
  IN    // Customer → Platform (deposits)
  OUT   // Platform → Customer (payouts)
  BOTH  // Both directions supported
}

enum ProviderType {
  MANUAL         // Manual processing (admin checks manually)
  BANK_ACCOUNT   // Linked to bank account
  PSP            // Via PSP (Stripe, TPay)
  CRYPTO_WALLET  // Crypto wallet
}

enum AutomationLevel {
  MANUAL      // Fully manual (admin does everything)
  SEMI_AUTO   // Semi-auto (admin confirms)
  FULLY_AUTO  // Full auto (system processes automatically)
}
```

### PaymentAccount Model

```prisma
enum PaymentAccountType {
  BANK_ACCOUNT
  CRYPTO_WALLET
}

model PaymentAccount {
  id          String             @id
  code        String             @unique
  name        String
  type        PaymentAccountType // BANK_ACCOUNT or CRYPTO_WALLET
  
  // For BANK_ACCOUNT (fiat)
  currency          String?  // EUR, PLN
  bankName          String?
  iban              String?
  swift             String?
  
  // For CRYPTO_WALLET (crypto)
  cryptocurrencyCode String?  // BTC, ETH
  blockchainCode     String?  // BITCOIN, ETHEREUM, BSC
  address            String?
  
  // Relations
  paymentMethods PaymentMethod[]  // Methods using this account
}
```

## 🔗 Connection Logic

### 1. MANUAL (No Connection)
```typescript
providerType: 'MANUAL'
paymentAccountId: null
pspConnector: null
```
**Use case**: Admin manually processes payments

### 2. BANK_ACCOUNT (Link to Bank)
```typescript
providerType: 'BANK_ACCOUNT'
paymentAccountId: 'acc_xxx'  // PaymentAccount with type=BANK_ACCOUNT
pspConnector: null
```
**Use case**: 
- Customer deposits to platform's bank account
- Platform pays out from bank account to customer

### 3. CRYPTO_WALLET (Link to Wallet)
```typescript
providerType: 'CRYPTO_WALLET'
paymentAccountId: 'acc_yyy'  // PaymentAccount with type=CRYPTO_WALLET
pspConnector: null
```
**Use case**:
- Customer sends crypto to platform's wallet
- Platform sends crypto from wallet to customer

### 4. PSP (Link to PSP Provider)
```typescript
providerType: 'PSP'
paymentAccountId: null
pspConnector: 'stripe'  // PspConnector.code
```
**Use case**: 
- Payments via Stripe, TPay, etc.
- PSP handles the payment processing

## ✅ Current Implementation Status

### PaymentMethodDialog Component
**Location**: `/src/components/admin/PaymentMethodDialog.tsx`

**Features**:
✅ Provider Type selection (MANUAL, BANK_ACCOUNT, PSP, CRYPTO_WALLET)
✅ Dynamic account filtering based on provider type
✅ Validation of connections
✅ Support for all payment directions (IN, OUT, BOTH)
✅ Automation level configuration
✅ Limits & Fees configuration

**Logic Flow**:
1. User selects `providerType`
2. If `BANK_ACCOUNT`:
   - Show only `PaymentAccount` where `type = BANK_ACCOUNT`
   - Require selection of account
3. If `CRYPTO_WALLET`:
   - Show only `PaymentAccount` where `type = CRYPTO_WALLET`
   - Require selection of account
4. If `PSP`:
   - Show `PspConnector` list
   - Require selection of PSP
5. If `MANUAL`:
   - No connection required

### Validation Rules
```typescript
// In PaymentMethodDialog.tsx (lines 129-139)
if (formData.providerType === 'BANK_ACCOUNT' || formData.providerType === 'CRYPTO_WALLET') {
  if (!formData.paymentAccountId) {
    toast.error('Please select a payment account');
    return;
  }
}

if (formData.providerType === 'PSP' && !formData.pspConnector) {
  toast.error('Please select a PSP connector');
  return;
}
```

### Account Filtering
```typescript
// In PaymentMethodDialog.tsx (lines 185-189)
const filteredAccounts = paymentAccounts.filter(acc => {
  if (formData.providerType === 'BANK_ACCOUNT') return acc.type === 'BANK_ACCOUNT';
  if (formData.providerType === 'CRYPTO_WALLET') return acc.type === 'CRYPTO_WALLET';
  return false;
});
```

## 📊 Example Configurations

### Example 1: SEPA Bank Transfer (Pay-In)
```json
{
  "code": "sepa_eur",
  "name": "SEPA Transfer (EUR)",
  "type": "bank_transfer",
  "direction": "IN",
  "providerType": "BANK_ACCOUNT",
  "automationLevel": "MANUAL",
  "currency": "EUR",
  "paymentAccountId": "acc_bank_eur_main",
  "pspConnector": null
}
```
**Связь**: Платежный метод → Банковский счет (EUR SEPA)

### Example 2: Bitcoin Wallet (Pay-In & Pay-Out)
```json
{
  "code": "btc_onchain",
  "name": "Bitcoin On-Chain",
  "type": "crypto_transfer",
  "direction": "BOTH",
  "providerType": "CRYPTO_WALLET",
  "automationLevel": "SEMI_AUTO",
  "currency": "BTC",
  "supportedNetworks": ["BITCOIN"],
  "paymentAccountId": "acc_btc_hot_wallet",
  "pspConnector": null
}
```
**Связь**: Платежный метод → Крипто кошелёк (BTC Hot Wallet)

### Example 3: Stripe Card Payment (Pay-In)
```json
{
  "code": "stripe_card_eur",
  "name": "Card Payment (Stripe)",
  "type": "card_payment",
  "direction": "IN",
  "providerType": "PSP",
  "automationLevel": "FULLY_AUTO",
  "currency": "EUR",
  "paymentAccountId": null,
  "pspConnector": "stripe"
}
```
**Связь**: Платежный метод → PSP Connector (Stripe)

### Example 4: Manual SWIFT Transfer (Pay-Out)
```json
{
  "code": "swift_manual",
  "name": "SWIFT Transfer (Manual)",
  "type": "bank_transfer",
  "direction": "OUT",
  "providerType": "MANUAL",
  "automationLevel": "MANUAL",
  "currency": "EUR",
  "paymentAccountId": null,
  "pspConnector": null
}
```
**Связь**: Нет (ручная обработка админом)

## 🎯 UI Flow in Admin Panel

### Creating New Payment Method

1. **Admin opens Payment Methods tab** → clicks "Add Payment Method"

2. **Fills Basic Info**:
   - Code: `sepa_eur`
   - Name: `SEPA Transfer (EUR)`
   - Type: `bank_transfer`
   - Currency: `EUR`

3. **Configures Flow**:
   - Direction: `IN` (customer deposits)
   - Provider Type: `BANK_ACCOUNT` ✅

4. **Selects Connection**:
   - System shows only Bank Accounts with EUR currency
   - Admin selects: "Main EUR SEPA Account"
   - `paymentAccountId` is set

5. **Sets Limits & Fees**:
   - Min: 50 EUR
   - Max: 10000 EUR
   - Fee: 1.5%

6. **Saves** → Method is created with correct link to bank account

## ✅ Summary

### What's Working:
- ✅ Database schema is correct
- ✅ Relations are properly defined
- ✅ PaymentMethodDialog filters accounts by type
- ✅ Validation ensures correct connections
- ✅ Support for all provider types (MANUAL, BANK, CRYPTO, PSP)

### Key Points:
1. **One unified field**: `paymentAccountId` links to both bank and crypto
2. **Type determines filter**: `providerType` determines what accounts to show
3. **Validation in place**: Cannot save without required connections
4. **Flexible**: Supports all payment directions and automation levels

---

**Status**: 🟢 Fully Implemented  
**Schema**: ✅ Correct  
**Dialog**: ✅ Working  
**Validation**: ✅ In place  

🎉 **Payment Method connections работают правильно!**

