# 🔄 Pay In / Pay Out Integration Plan

## 📊 Current Schema Analysis

### PayIn Model
```prisma
model PayIn {
  id               String   @id
  orderId          String   @unique
  userId           String
  
  // Payment Details
  amount           Float
  fiatCurrencyCode String?           // EUR, PLN
  cryptocurrencyCode String?         // BTC, ETH
  currencyType     CurrencyType      // FIAT or CRYPTO
  paymentMethodCode String?          // ⚠️ Существует, но не используется правильно
  
  // For FIAT
  senderName       String?
  senderAccount    String?
  senderBank       String?
  
  // For CRYPTO
  networkCode      String?
  senderAddress    String?
  transactionHash  String?
  
  // Relations
  paymentMethod    PaymentMethod?    @relation(fields: [paymentMethodCode], references: [code])
}
```

### PayOut Model
```prisma
model PayOut {
  id                String   @id
  orderId           String   @unique
  userId            String
  
  // Payment Details
  amount            Float
  fiatCurrencyCode  String?
  cryptocurrencyCode String?
  currencyType      CurrencyType
  paymentMethodCode String?          // ⚠️ Существует, но не используется правильно
  
  // For CRYPTO
  networkCode       String?
  destinationAddress String?
  transactionHash    String?
  
  // For FIAT
  recipientName      String?
  recipientAccount   String?
  recipientBank      String?
  
  // Relations
  paymentMethod      PaymentMethod?    @relation(fields: [paymentMethodCode], references: [code])
}
```

## 🎯 Integration Strategy

### Current Flow (Simple)
```
User creates PayIn/PayOut
  ↓
Manually enters currency + payment details
  ↓
Admin processes manually
```

### New Flow (Integrated)
```
User creates PayIn/PayOut
  ↓
Selects Payment Method (NEW!)
  ↓
Payment Method determines:
  - Currency Type (FIAT/CRYPTO)
  - Currency (EUR, BTC, etc.)
  - Provider Type (BANK_ACCOUNT, CRYPTO_WALLET, PSP)
  - Connected Account (from PaymentAccount)
  ↓
Auto-fill payment details from Payment Method
  ↓
Admin processes via connected account
```

## 🔧 Implementation Steps

### Step 1: Update Create PayIn Dialog

**File**: `src/app/(admin)/admin/pay-in/page.tsx`

**Changes needed**:

1. **Add Payment Method Selection**
```typescript
// Current form state
const [createForm, setCreateForm] = useState({
  orderId: '',
  userId: '',
  amount: 0,
  currency: '',
  currencyType: 'FIAT' as 'FIAT' | 'CRYPTO',
  paymentMethodCode: '',  // ✅ Exists
  networkCode: '',
  expectedAmount: 0
});

// NEW: Load payment methods
const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

// NEW: Load payment methods on dialog open
useEffect(() => {
  if (createDialogOpen) {
    loadPaymentMethods();
  }
}, [createDialogOpen]);

// NEW: Filter payment methods by currency type and direction
const availablePaymentMethods = paymentMethods.filter(pm => 
  pm.direction === 'IN' || pm.direction === 'BOTH'
).filter(pm => {
  if (createForm.currencyType === 'FIAT') {
    return pm.providerType !== 'CRYPTO_WALLET';
  } else {
    return pm.providerType === 'CRYPTO_WALLET' || pm.providerType === 'MANUAL';
  }
});
```

2. **Auto-fill from Payment Method**
```typescript
const handlePaymentMethodChange = (methodCode: string) => {
  const method = paymentMethods.find(m => m.code === methodCode);
  if (!method) return;
  
  setCreateForm(prev => ({
    ...prev,
    paymentMethodCode: methodCode,
    currency: method.currency,
    // If method has payment account, get its details
    paymentAccountId: method.paymentAccountId,
  }));
  
  // Load payment account details if available
  if (method.paymentAccountId) {
    loadPaymentAccountDetails(method.paymentAccountId);
  }
};
```

3. **Update Dialog UI**
```tsx
{/* Payment Method Selection - NEW */}
<div className="space-y-2">
  <Label>Payment Method * (auto-determines currency)</Label>
  <Combobox
    options={availablePaymentMethods.map(pm => ({
      value: pm.code,
      label: pm.name,
      description: `${pm.currency} - ${pm.providerType}`
    }))}
    value={createForm.paymentMethodCode}
    onValueChange={handlePaymentMethodChange}
    placeholder="Select payment method..."
  />
  {createForm.paymentMethodCode && selectedPaymentMethod && (
    <div className="p-3 bg-muted rounded text-xs space-y-1">
      <p><strong>Type:</strong> {selectedPaymentMethod.providerType}</p>
      <p><strong>Currency:</strong> {selectedPaymentMethod.currency}</p>
      {selectedPaymentMethod.paymentAccount && (
        <p><strong>Account:</strong> {selectedPaymentMethod.paymentAccount.name}</p>
      )}
    </div>
  )}
</div>

{/* Currency - now auto-filled and readonly */}
<div className="space-y-2">
  <Label>Currency (from Payment Method)</Label>
  <Input
    value={createForm.currency}
    disabled
    className="bg-muted"
  />
</div>
```

### Step 2: Update Create PayOut Dialog

**File**: `src/app/(admin)/admin/pay-out/page.tsx`

**Same logic as PayIn, but**:
- Filter methods by `direction === 'OUT' || direction === 'BOTH'`
- For CRYPTO: show destination address field
- For FIAT: show recipient bank details

### Step 3: Display Payment Method Info in Lists

**Pay In List Card**:
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
  <div>
    <div className="text-muted-foreground">Method</div>
    <div className="font-medium">
      {payIn.paymentMethod?.name || 'N/A'}
      {payIn.paymentMethod?.providerType && (
        <Badge variant="outline" className="ml-2 text-xs">
          {payIn.paymentMethod.providerType}
        </Badge>
      )}
    </div>
  </div>
  {payIn.paymentMethod?.paymentAccount && (
    <div>
      <div className="text-muted-foreground">Account</div>
      <div className="font-medium text-xs">
        {payIn.paymentMethod.paymentAccount.name}
      </div>
    </div>
  )}
</div>
```

### Step 4: API Updates

**File**: `src/app/api/admin/pay-in/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Validate payment method
  if (body.paymentMethodCode) {
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { code: body.paymentMethodCode },
      include: { paymentAccount: true }
    });
    
    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 }
      );
    }
    
    // Auto-set currency from payment method
    if (paymentMethod.currency) {
      if (body.currencyType === 'FIAT') {
        body.fiatCurrencyCode = paymentMethod.currency;
      } else {
        body.cryptocurrencyCode = paymentMethod.currency;
      }
    }
  }
  
  // Create PayIn
  const payIn = await prisma.payIn.create({
    data: {
      ...body,
      // ... other fields
    },
    include: {
      paymentMethod: {
        include: {
          paymentAccount: true
        }
      }
    }
  });
  
  return NextResponse.json({ success: true, data: payIn });
}
```

### Step 5: Update GET endpoints to include PaymentMethod details

```typescript
// In both pay-in and pay-out GET endpoints
const payIns = await prisma.payIn.findMany({
  include: {
    order: true,
    user: {
      select: { id: true, email: true }
    },
    fiatCurrency: true,
    cryptocurrency: true,
    network: true,
    paymentMethod: {  // ✅ ADD THIS
      include: {
        paymentAccount: {  // ✅ Include connected account
          include: {
            fiatCurrency: true,
            cryptocurrency: true,
            blockchain: true
          }
        }
      }
    }
  }
});
```

## 📋 Benefits of Integration

### ✅ For Admin
- **Less manual work**: Payment details auto-fill from method
- **Clear tracking**: See which account/method was used
- **Better reporting**: Can filter by payment method/account
- **Automated routing**: System knows which account to check

### ✅ For System
- **Data consistency**: Currency always matches payment method
- **Proper relations**: PayIn → PaymentMethod → PaymentAccount
- **Easy automation**: Can auto-verify based on method type
- **Audit trail**: Track which accounts received/sent funds

### ✅ For Future
- **PSP Integration**: When method uses PSP, can auto-create webhook
- **Auto-verification**: For PSP/automated methods, can auto-verify
- **Multi-currency**: Easy to add new currencies via methods
- **Compliance**: Better tracking for regulatory requirements

## 🎨 UI/UX Flow Example

### Creating PayIn (FIAT)

1. **Admin clicks "Create PayIn"**
2. **Selects Order** → auto-fills user, amount
3. **Currency Type**: FIAT (determined by order type)
4. **Selects Payment Method**: "SEPA Transfer (EUR)"
   - System auto-fills:
     - Currency: EUR
     - Shows connected bank account: "Main EUR SEPA Account"
     - Shows expected details: IBAN, SWIFT, Reference
5. **Admin enters**:
   - Sender name
   - Sender account (optional)
   - Transaction ID
6. **Clicks Create** → PayIn created with method link

### Creating PayOut (CRYPTO)

1. **Admin clicks "Create PayOut"**
2. **Selects Order** → auto-fills user, amount, destination
3. **Currency Type**: CRYPTO
4. **Selects Payment Method**: "Bitcoin Network"
   - System auto-fills:
     - Currency: BTC
     - Network: BITCOIN
     - Shows connected wallet: "BTC Hot Wallet"
     - Shows current balance: 2.5 BTC
5. **Admin confirms destination** (from order)
6. **Admin enters TX hash** after sending
7. **Clicks Create** → PayOut created with method link

## 🚀 Implementation Priority

### Phase 1: Core Integration (THIS SPRINT)
- ✅ Add Payment Method selection to Pay In dialog
- ✅ Add Payment Method selection to Pay Out dialog
- ✅ Auto-fill currency from Payment Method
- ✅ Update API to include PaymentMethod in responses

### Phase 2: Display Improvements
- ✅ Show Payment Method info in Pay In/Out lists
- ✅ Show connected Payment Account details
- ✅ Add filters by Payment Method

### Phase 3: Automation
- ⏳ Auto-verify PSP payments via webhooks
- ⏳ Auto-detect bank transfers via bank API
- ⏳ Auto-send crypto via wallet integration

---

**Ready to implement?** Let me know and I'll start with Phase 1! 🚀

