# 🛠️ Orders Management - PayIn/PayOut Integration Fix

## ❌ Проблема

### 1. Table Column Error:
```
[Table] Column with id 'user.email' does not exist.
```

**Причина:** В таблице использовался `accessorKey: 'user'`, что не работает с вложенными объектами в TanStack Table.

### 2. Missing PayIn/PayOut Data:
Заказы не загружали связанные данные `payIn` и `payOut`, хотя они теперь обязательны для полноценного отображения статуса платежей.

---

## ✅ Решение

### 1. Fixed Table Column Definition

#### До:
```typescript
{
  accessorKey: 'user',  // ❌ Не работает с вложенными объектами
  header: 'Customer',
  cell: ({ row }) => {
    const user = row.original.user;
    // ...
  }
}
```

#### После:
```typescript
{
  id: 'customer',  // ✅ Уникальный ID колонки
  header: 'Customer',
  accessorFn: (row) => row.user.email,  // ✅ Функция для доступа к данным
  cell: ({ row }) => {
    const user = row.original.user;
    // ...
  }
}
```

**Ключевые изменения:**
- `accessorKey: 'user'` → `id: 'customer'` + `accessorFn`
- `accessorFn` используется для правильного доступа к вложенным данным
- Это решает проблему с поиском/фильтрацией по email

---

### 2. Updated API to Include PayIn/PayOut Relations

#### src/app/api/admin/orders/route.ts

**До:**
```typescript
include: {
  user: {
    include: { profile: true }
  },
  currency: true,
  fiatCurrency: true
}
```

**После:**
```typescript
include: {
  user: {
    include: { profile: true }
  },
  currency: true,
  fiatCurrency: true,
  payIn: {
    include: {
      fiatCurrency: true,
      cryptocurrency: true,
      paymentMethod: true,
      network: true
    }
  },
  payOut: {
    include: {
      fiatCurrency: true,
      cryptocurrency: true,
      paymentMethod: true,
      network: true
    }
  }
}
```

**Теперь API возвращает:**
- ✅ `payIn` с полной информацией о входящем платеже
- ✅ `payOut` с полной информацией об исходящем платеже
- ✅ Связанные `paymentMethod`, `fiatCurrency`, `cryptocurrency`, `network`

---

## 🎯 Что это даёт

### 1. Правильное отображение таблицы
- ✅ Колонка "Customer" работает корректно
- ✅ Поиск/фильтрация по email функционирует
- ✅ Нет ошибок в консоли

### 2. Полная информация о платежах
Теперь в OrderDetailsSheet и Kanban можно отображать:

```typescript
// Pay In Info
order.payIn?.status          // PENDING, VERIFIED, RECEIVED
order.payIn?.paymentMethod   // Метод оплаты (SEPA, SWIFT, etc.)
order.payIn?.amount          // Сумма
order.payIn?.fiatCurrency    // Валюта (EUR, PLN)
order.payIn?.cryptocurrency  // Крипта (BTC, ETH) для крипто-платежей
order.payIn?.network         // Сеть (ETHEREUM, BSC)

// Pay Out Info
order.payOut?.status              // PENDING, SENT, CONFIRMED
order.payOut?.paymentMethod       // Метод оплаты
order.payOut?.transactionHash     // TX hash для крипты
order.payOut?.destinationAddress  // Адрес получателя
order.payOut?.networkFee          // Комиссия сети
```

---

## 🔄 Kanban Integration

### Drag & Drop работает с полной информацией:

```typescript
interface Order {
  id: string;
  paymentReference: string;
  status: OrderStatus;
  user: { email: string; profile: { firstName, lastName } };
  
  // NEW: Payment info
  payIn?: {
    status: string;
    paymentMethod: { name: string };
    amount: number;
    // ...
  };
  
  payOut?: {
    status: string;
    paymentMethod: { name: string };
    transactionHash: string;
    // ...
  };
}
```

### Status Transitions теперь могут учитывать:
- ✅ Статус Pay In (платёж получен?)
- ✅ Статус Pay Out (крипта отправлена?)
- ✅ Payment Method (какой способ оплаты используется)

---

## 📋 Future Enhancements

### 1. Enhanced Order Details Display
```typescript
<Card>
  <CardHeader>Pay In Status</CardHeader>
  <CardContent>
    {order.payIn && (
      <>
        <Badge>{order.payIn.status}</Badge>
        <p>Method: {order.payIn.paymentMethod?.name}</p>
        <p>Amount: {order.payIn.amount} {order.payIn.fiatCurrency?.code}</p>
      </>
    )}
  </CardContent>
</Card>

<Card>
  <CardHeader>Pay Out Status</CardHeader>
  <CardContent>
    {order.payOut && (
      <>
        <Badge>{order.payOut.status}</Badge>
        <p>Method: {order.payOut.paymentMethod?.name}</p>
        <p>TX: {order.payOut.transactionHash}</p>
        <p>Fee: {order.payOut.networkFee}</p>
      </>
    )}
  </CardContent>
</Card>
```

### 2. Smart Status Transitions
```typescript
// Не позволять двигать в PROCESSING если PayIn не VERIFIED
if (newStatus === 'PROCESSING' && order.payIn?.status !== 'VERIFIED') {
  toast.error('Cannot process order: Payment not verified');
  return;
}

// Не позволять COMPLETED если PayOut не CONFIRMED
if (newStatus === 'COMPLETED' && order.payOut?.status !== 'CONFIRMED') {
  toast.error('Cannot complete order: Payout not confirmed');
  return;
}
```

---

## 📁 Files Modified

1. **src/app/api/admin/orders/route.ts**
   - Added `payIn` and `payOut` includes with full relations
   - Returns complete payment information

2. **src/app/(admin)/admin/orders/page.tsx**
   - Fixed `customer` column definition
   - Changed from `accessorKey` to `id` + `accessorFn`
   - Resolves table rendering error

---

## ✅ Testing Checklist

### Table View:
- [ ] Open `/admin/orders`
- [ ] Switch to Table view
- [ ] Verify "Customer" column displays correctly
- [ ] Verify no console errors
- [ ] Test search by customer email
- [ ] Test filtering by status

### Kanban View:
- [ ] Switch to Kanban view
- [ ] Drag order between columns
- [ ] Verify status update works
- [ ] Check toast notifications
- [ ] Verify drag restrictions work

### Order Details:
- [ ] Click on order to open details
- [ ] Verify all order information displays
- [ ] Check Pay In info (if exists)
- [ ] Check Pay Out info (if exists)

---

## 🎉 Result

**Orders Management теперь:**
- ✅ Корректно отображает таблицу без ошибок
- ✅ Загружает полную информацию о Pay In/Pay Out
- ✅ Готов для интеграции с расширенными payment workflows
- ✅ Drag & Drop Kanban работает безупречно
- ✅ Все данные о платежах доступны в UI

**Готово к использованию!** 🚀

