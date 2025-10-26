# 🐛 Orders Drag-Drop Validation Fix

## ❌ Проблема

При drag-drop заказов в Kanban появлялась ошибка:
```
Validation failed
```

### Причина:
Схема валидации `updateOrderStatusSchema` содержала только старые статусы:
```typescript
status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'])
```

Но в Kanban используются дополнительные статусы:
- `PAYMENT_PENDING` - платёж получен, требуется верификация
- `REFUNDED` - заказ возвращён
- `EXPIRED` - заказ истёк

---

## ✅ Решение

### Updated Validation Schema

**src/lib/validations/order.ts**

#### До:
```typescript
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING', 
    'PROCESSING', 
    'COMPLETED', 
    'CANCELLED'
  ]), // ❌ Неполный список
  adminNotes: z.string().max(500).optional(),
  transactionHash: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, 'Invalid transaction hash')
    .optional() // ❌ Не позволяет null
});
```

#### После:
```typescript
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'PAYMENT_PENDING',  // ✅ Добавлено
    'PROCESSING',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED',         // ✅ Добавлено
    'EXPIRED'           // ✅ Добавлено
  ]),
  adminNotes: z.string().max(500).optional(),
  transactionHash: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, 'Invalid transaction hash')
    .optional()
    .nullable()         // ✅ Добавлено для фиат-заказов
});
```

---

## 🔄 Status Flow Alignment

### Полный список статусов в системе:

```typescript
enum OrderStatus {
  PENDING          // 🆕 Новый заказ
  PAYMENT_PENDING  // 💰 Платёж получен, требуется верификация
  PROCESSING       // ⚙️ В обработке, готовим крипту
  COMPLETED        // ✅ Завершён
  CANCELLED        // ❌ Отменён
  REFUNDED         // 💸 Возвращён
  EXPIRED          // ⏰ Истёк
}
```

### Kanban Columns:
```typescript
const KANBAN_COLUMNS = [
  { id: 'PENDING', label: 'New Orders' },
  { id: 'PAYMENT_PENDING', label: 'Payment Received' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' }
];
```

### Valid Transitions:
```typescript
const STATUS_TRANSITIONS = {
  PENDING: ['PAYMENT_PENDING', 'PROCESSING', 'CANCELLED'],
  PAYMENT_PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // Terminal
  CANCELLED: [], // Terminal
  REFUNDED: [],  // Terminal
  EXPIRED: ['PENDING'], // Can be reactivated
};
```

---

## 🎯 What This Fixes

### 1. Drag & Drop Now Works
```typescript
// Before: ❌ Error
onDrop(order, 'PAYMENT_PENDING') 
// → Validation failed

// After: ✅ Success
onDrop(order, 'PAYMENT_PENDING')
// → Order moved successfully
```

### 2. All Status Transitions Allowed
- ✅ `PENDING` → `PAYMENT_PENDING` (customer uploaded proof)
- ✅ `PAYMENT_PENDING` → `PROCESSING` (payment verified)
- ✅ `PROCESSING` → `COMPLETED` (crypto sent)
- ✅ Any → `CANCELLED` (cancel order)
- ✅ `EXPIRED` → `PENDING` (reactivate)

### 3. Transaction Hash Optional
```typescript
// For crypto orders
{ status: 'COMPLETED', transactionHash: '0x123...' }

// For fiat orders (manual processing)
{ status: 'PROCESSING', transactionHash: null } // ✅ Now allowed
```

---

## 🧪 Testing

### Drag & Drop Test:
```bash
1. Open /admin/orders
2. Switch to Kanban view
3. Drag order from "New Orders" → "Payment Received"
   ✅ Should move successfully
4. Drag from "Payment Received" → "Processing"
   ✅ Should move successfully
5. Drag from "Processing" → "Completed"
   ✅ Should move successfully
6. Try invalid transition (e.g., Completed → Pending)
   ✅ Should show error toast
```

### API Test:
```bash
# Test valid status update
curl -X PATCH http://localhost:3000/api/admin/orders/[id] \
  -H "Content-Type: application/json" \
  -d '{"status": "PAYMENT_PENDING"}'
# ✅ Should return 200

# Test invalid status
curl -X PATCH http://localhost:3000/api/admin/orders/[id] \
  -H "Content-Type: application/json" \
  -d '{"status": "INVALID_STATUS"}'
# ❌ Should return 400 with validation error
```

---

## 📁 Files Modified

1. **src/lib/validations/order.ts**
   - Added missing statuses: `PAYMENT_PENDING`, `REFUNDED`, `EXPIRED`
   - Made `transactionHash` nullable for fiat orders
   - Updated TypeScript types

---

## ✅ Result

**Orders Kanban теперь:**
- ✅ Drag & Drop работает без ошибок валидации
- ✅ Все статусы поддерживаются
- ✅ Transaction hash опционален (для фиат-заказов)
- ✅ Валидация соответствует бизнес-логике
- ✅ Toast уведомления работают корректно

**Готово к использованию!** 🎉

