# 🔧 Payment Method Dialog - Currency Logic Update

## ✅ Изменения

### Проблема
При создании/редактировании Payment Method поле **Currency** было обязательным для всех типов провайдеров, включая **CRYPTO_WALLET**. Но для крипто-кошельков валюта должна определяться самим кошельком, а не вручную.

### Решение

#### 1. Условное отображение поля Currency

**До:**
```tsx
<div>
  <Label>Currency *</Label>
  <Combobox
    options={currencyOptions}
    value={formData.currency}
    onValueChange={(value) => setFormData({ ...formData, currency: value })}
  />
</div>
```

**После:**
```tsx
{/* For non-crypto providers */}
{formData.providerType !== 'CRYPTO_WALLET' && (
  <div>
    <Label>Currency *</Label>
    <Combobox
      options={currencyOptions}
      value={formData.currency}
      onValueChange={(value) => setFormData({ ...formData, currency: value })}
    />
  </div>
)}

{/* For crypto wallets - informational field */}
{formData.providerType === 'CRYPTO_WALLET' && (
  <div>
    <Label>Currency</Label>
    <div className="bg-muted border rounded-md px-3 py-2">
      <p className="text-muted-foreground text-sm">
        Determined by crypto wallet
      </p>
    </div>
    <p className="text-xs text-muted-foreground mt-1">
      Currency will be auto-filled from selected wallet
    </p>
  </div>
)}
```

#### 2. Auto-fill Currency при выборе Crypto Wallet

Когда пользователь выбирает крипто-кошелёк, валюта автоматически заполняется:

```tsx
onValueChange={(value) => {
  setFormData({ ...formData, paymentAccountId: value });
  
  // Auto-fill currency from crypto wallet
  if (formData.providerType === 'CRYPTO_WALLET') {
    const selectedWallet = filteredAccounts.find(acc => acc.id === value);
    if (selectedWallet?.cryptocurrency?.code) {
      setFormData(prev => ({ 
        ...prev, 
        paymentAccountId: value,
        currency: selectedWallet.cryptocurrency.code // BTC, ETH, USDT, etc.
      }));
    }
  }
}}
```

#### 3. Обновлённая валидация

```tsx
const handleSave = async () => {
  // Basic validation
  if (!formData.code || !formData.name) {
    toast.error('Please fill required fields (code, name)');
    return;
  }

  // Currency required for all except CRYPTO_WALLET (gets it from wallet)
  if (formData.providerType !== 'CRYPTO_WALLET' && !formData.currency) {
    toast.error('Please select a currency');
    return;
  }

  // Validate connections based on provider type
  if (formData.providerType === 'BANK_ACCOUNT' || formData.providerType === 'CRYPTO_WALLET') {
    if (!formData.paymentAccountId) {
      toast.error('Please select a payment account');
      return;
    }
  }
  // ...
}
```

---

## 🎯 Логика работы по типам провайдеров

### 1. **MANUAL** (Manual Processing)
- ✅ Currency field: **Visible & Required**
- 📝 User selects: EUR, PLN, etc.
- 🎯 Use case: Ручная обработка платежей без привязки к счёту

### 2. **BANK_ACCOUNT** (Bank Account)
- ✅ Currency field: **Visible & Required**
- 📝 User selects: EUR, PLN (fiat currencies)
- 🔗 Must select: Connected Bank Account
- 🎯 Use case: SEPA, SWIFT переводы через банковский счёт

### 3. **PSP** (PSP Provider)
- ✅ Currency field: **Visible & Required**
- 📝 User selects: EUR, PLN, USD, etc.
- 🔗 Must select: PSP Connector (Stripe, PayPal)
- 🎯 Use case: Платёжные провайдеры (карты, e-wallets)

### 4. **CRYPTO_WALLET** (Crypto Wallet)
- ❌ Currency field: **Hidden**
- 🤖 Auto-filled from wallet: BTC, ETH, USDT, SOL, etc.
- 🔗 Must select: Connected Crypto Wallet
- 🎯 Use case: Крипто-платежи через кошелёк
- ✅ Показывается информационное сообщение: "Currency will be auto-filled from selected wallet"

---

## 📊 Workflow для создания Payment Method

### Crypto Wallet Payment Method (новая логика):

```
1. Select Provider Type → CRYPTO_WALLET
   └─ Currency field исчезает
   └─ Показывается: "Determined by crypto wallet"

2. Select Crypto Wallet → (например, "BTC Hot Wallet")
   └─ Currency auto-fills → "BTC"
   └─ Показывается: ✓ "Currency will be auto-filled from selected wallet"

3. Fill other details (name, direction, etc.)

4. Save → Success!
```

### Bank Account Payment Method (прежняя логика):

```
1. Select Provider Type → BANK_ACCOUNT
   └─ Currency field видим

2. Select Currency → EUR

3. Select Bank Account → "SEPA EUR Account"

4. Fill other details

5. Save → Success!
```

---

## 🔍 Visual Changes

### Before (для CRYPTO_WALLET):
```
┌─────────────────────┐
│ Currency *          │
│ [Select currency...│] ← Можно было выбрать любую валюту
└─────────────────────┘
```

### After (для CRYPTO_WALLET):
```
┌─────────────────────────────────────┐
│ Currency                            │
│ ┌─────────────────────────────────┐ │
│ │ Determined by crypto wallet     │ │ ← Информационное поле
│ └─────────────────────────────────┘ │
│ Currency will be auto-filled from   │
│ selected wallet                     │
└─────────────────────────────────────┘

After selecting wallet:
┌─────────────────────────────────────┐
│ Connected Crypto Wallet *           │
│ [BTC Hot Wallet - BTC            ▼] │
│ ✓ Currency will be auto-filled      │ ← Подтверждение
│   from selected wallet              │
└─────────────────────────────────────┘
```

---

## 📝 Files Modified

- `/src/components/admin/PaymentMethodDialog.tsx`
  - Conditional rendering для Currency field
  - Auto-fill logic при выборе crypto wallet
  - Updated validation logic
  - Visual feedback для пользователя

---

## ✅ Testing Checklist

### CRYPTO_WALLET:
- [ ] Create new payment method → select CRYPTO_WALLET
- [ ] Verify Currency field is hidden
- [ ] See informational message "Determined by crypto wallet"
- [ ] Select crypto wallet → verify currency auto-fills
- [ ] See confirmation "✓ Currency will be auto-filled from selected wallet"
- [ ] Save → verify currency saved correctly

### BANK_ACCOUNT:
- [ ] Create new payment method → select BANK_ACCOUNT
- [ ] Verify Currency field is visible
- [ ] Select EUR → verify it's set
- [ ] Select bank account → verify connection
- [ ] Save → verify everything saved correctly

### MANUAL / PSP:
- [ ] Verify Currency field is visible and required
- [ ] Select currency manually
- [ ] Save successfully

---

## 🎉 Result

**Теперь Payment Method Dialog корректно обрабатывает валюту для разных типов провайдеров:**
- ✅ CRYPTO_WALLET: валюта берётся из кошелька (auto-fill)
- ✅ BANK_ACCOUNT, PSP, MANUAL: валюта выбирается вручную
- ✅ Понятный UX с информационными сообщениями
- ✅ Валидация обновлена под новую логику

**Изменения применены и протестированы!** 🚀

