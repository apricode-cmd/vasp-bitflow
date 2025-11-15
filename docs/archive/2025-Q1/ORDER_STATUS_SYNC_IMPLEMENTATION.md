# Order Status Synchronization - Implementation Plan

## 🎯 Цель
Интегрировать `OrderTransitionDialog` во все точки изменения статуса заказа для автоматического создания PayIn/PayOut записей.

## 📋 Текущее состояние

### ✅ Что уже работает:
1. **OrderKanban** - использует `OrderTransitionDialog` при drag & drop
2. **OrderTransitionDialog** - полностью функциональный диалог с формами
3. **order-status-sync.service.ts** - сервис синхронизации статусов
4. **API endpoints** - `/api/admin/pay-in` и `/api/admin/pay-out` создают записи

### ❌ Что НЕ работает:
1. **Order Details Page** (`/admin/orders/[id]`) - НЕ использует диалог
2. **Table View** (DataTableAdvanced) - НЕ использует диалог
3. **Bulk Actions** - НЕ создают PayIn/PayOut автоматически

## 🚀 План реализации

### Phase 1: Order Details Page ✨
**Файл:** `src/app/(admin)/admin/orders/[id]/page.tsx`

**Изменения:**
1. Добавить `OrderTransitionDialog` в компонент
2. Изменить `handleAction` для открытия диалога вместо прямого API вызова
3. Определить переходы, требующие PayIn/PayOut:
   - `PENDING` → `PAYMENT_PENDING` = **нужен PayIn**
   - `PAYMENT_RECEIVED` → `PROCESSING` = **нужен PayIn VERIFIED**
   - `PROCESSING` → `COMPLETED` = **нужен PayOut**

**Пример логики:**
```typescript
const handleAction = async (action: string) => {
  switch (action) {
    case 'payment-received':
      // Open dialog for PayIn creation
      setTransitionDialog({
        open: true,
        order,
        fromStatus: order.status,
        toStatus: 'PAYMENT_RECEIVED'
      });
      break;
      
    case 'verify':
      // Open dialog for PayIn verification
      setTransitionDialog({
        open: true,
        order,
        fromStatus: order.status,
        toStatus: 'PROCESSING'
      });
      break;
      
    case 'send-crypto':
      // Open dialog for PayOut creation
      setTransitionDialog({
        open: true,
        order,
        fromStatus: order.status,
        toStatus: 'COMPLETED'
      });
      break;
  }
};
```

### Phase 2: Table View Integration 📊
**Файл:** `src/app/(admin)/admin/orders/_components/OrdersTableView.tsx`

**Изменения:**
1. Добавить actions column с dropdown
2. Добавить `OrderTransitionDialog`
3. Для каждого действия открывать диалог

**UI Changes:**
- Actions column с иконкой `MoreHorizontal`
- Dropdown menu с контекстными действиями
- Диалог открывается при выборе действия

### Phase 3: Smart Transitions 🧠
**Улучшения логики:**

1. **Auto-detect PayIn/PayOut need:**
```typescript
function requiresPayIn(from: OrderStatus, to: OrderStatus): boolean {
  return (
    (from === 'PENDING' && to === 'PAYMENT_PENDING') ||
    (from === 'PAYMENT_PENDING' && to === 'PAYMENT_RECEIVED')
  );
}

function requiresPayOut(from: OrderStatus, to: OrderStatus): boolean {
  return (
    (from === 'PROCESSING' && to === 'COMPLETED')
  );
}
```

2. **Pre-fill dialog data:**
- PayIn amount = order.totalFiat
- PayIn currency = order.fiatCurrencyCode
- PayOut amount = order.cryptoAmount
- PayOut currency = order.currencyCode
- PayOut wallet = order.walletAddress

3. **Validation:**
- Проверка что PayIn еще не создан
- Проверка что PayOut еще не создан
- Если уже существует - показать warning

### Phase 4: API Enhancement 🔧
**Файл:** `src/app/api/admin/orders/[id]/route.ts` (PATCH)

**Улучшения:**
1. Принимать `payInData` и `payOutData` в теле запроса
2. Создавать PayIn/PayOut автоматически при смене статуса
3. Использовать транзакции Prisma
4. Вызывать `order-status-sync.service.ts`

**Пример:**
```typescript
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { status, payInData, payOutData, adminNotes } = await req.json();
  
  await prisma.$transaction(async (tx) => {
    // 1. Update order
    const order = await tx.order.update({
      where: { id: params.id },
      data: { status }
    });
    
    // 2. Create PayIn if data provided
    if (payInData) {
      await tx.payIn.create({
        data: {
          orderId: order.id,
          ...payInData
        }
      });
    }
    
    // 3. Create PayOut if data provided
    if (payOutData) {
      await tx.payOut.create({
        data: {
          orderId: order.id,
          ...payOutData
        }
      });
    }
    
    // 4. Log status change
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        oldStatus: order.status,
        newStatus: status,
        note: adminNotes
      }
    });
  });
}
```

## 📝 Status Transition Matrix

| From Status | To Status | Requires | Auto-Create |
|-------------|-----------|----------|-------------|
| PENDING | PAYMENT_PENDING | PayIn | PENDING |
| PAYMENT_PENDING | PAYMENT_RECEIVED | Update PayIn | → RECEIVED |
| PAYMENT_RECEIVED | PROCESSING | Update PayIn | → VERIFIED |
| PROCESSING | COMPLETED | PayOut | SENT/CONFIRMED |
| Any | CANCELLED | - | - |
| Any | FAILED | - | - |

## 🎨 UI/UX Flow

### Scenario 1: Payment Received
1. Admin clicks "Mark Payment Received"
2. Dialog opens:
   ```
   ┌─────────────────────────────────────────┐
   │ Confirm Payment Received                │
   ├─────────────────────────────────────────┤
   │ Order: APR-MHZ123                       │
   │ From: PENDING → PAYMENT_RECEIVED        │
   │                                         │
   │ Create PayIn Record?                    │
   │ ✅ Yes, create PayIn                    │
   │                                         │
   │ Amount: €1,000.00 (auto-filled)        │
   │ Currency: EUR                           │
   │ Payment Method: [SEPA Transfer ▼]      │
   │ Sender Name: [John Doe]                │
   │ Reference: APR-MHZ123 (auto)           │
   │                                         │
   │ Admin Notes: [Optional]                │
   │                                         │
   │ [Cancel] [Confirm & Create PayIn]      │
   └─────────────────────────────────────────┘
   ```

### Scenario 2: Send Cryptocurrency
1. Admin clicks "Send Crypto"
2. Dialog opens:
   ```
   ┌─────────────────────────────────────────┐
   │ Send Cryptocurrency                     │
   ├─────────────────────────────────────────┤
   │ Order: APR-MHZ123                       │
   │ From: PROCESSING → COMPLETED            │
   │                                         │
   │ Create PayOut Record?                   │
   │ ✅ Yes, create PayOut                   │
   │                                         │
   │ Amount: 0.02 BTC (auto-filled)         │
   │ Network: [Bitcoin (BTC) ▼]             │
   │ Wallet: bc1q... (auto-filled)          │
   │ Transaction Hash: [Optional]            │
   │                                         │
   │ Admin Notes: [Optional]                │
   │                                         │
   │ [Cancel] [Confirm & Create PayOut]     │
   └─────────────────────────────────────────┘
   ```

## 🔒 Safety Checks

1. **Prevent Duplicate PayIn/PayOut:**
   - Check if PayIn already exists before creating
   - Show warning: "PayIn already exists for this order"

2. **Validate Status Transitions:**
   - Only allow valid transitions (use state machine)
   - Example: Cannot go PENDING → COMPLETED directly

3. **Require Confirmation:**
   - All status changes require dialog confirmation
   - Except: CANCELLED (separate confirm dialog)

## 🚀 Implementation Order

1. ✅ **Phase 1a**: Add OrderTransitionDialog to Order Details Page
2. ✅ **Phase 1b**: Update handleAction to use dialog
3. ✅ **Phase 1c**: Test all transitions on details page
4. ✅ **Phase 2**: Integrate into Table View
5. ✅ **Phase 3**: Add smart validation and auto-fill
6. ✅ **Phase 4**: Test end-to-end flow

## ✅ Expected Result

После реализации:
- ✅ Любое изменение статуса заказа автоматически создает PayIn/PayOut
- ✅ Админ видит форму для подтверждения и заполнения деталей
- ✅ Данные предзаполнены из заказа
- ✅ Синхронизация статусов работает автоматически
- ✅ История изменений логируется
- ✅ Нет дубликатов PayIn/PayOut

## 🎯 Ready to implement!
Начинаем с Phase 1: Order Details Page

