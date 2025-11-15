# Order Management System - Комплексное улучшение

## 📊 Анализ текущей системы

### ✅ Что уже есть:
1. `/admin/orders` - страница со списком заказов
2. Kanban и Table views
3. `OrderDetailsSheet` - боковая панель с деталями
4. Status transitions через API
5. `order-status-sync.service.ts` - синхронизация Order ↔ PayIn ↔ PayOut

### ❌ Что нужно улучшить:
1. **НЕТ dedicated Order Details Page** - только Sheet
2. **DataTable** вместо `DataTableAdvanced` - нет bulk actions, фильтров
3. **Слабая интеграция PayIn/PayOut** - не видно связей
4. **Нет уведомлений** для клиентов при смене статуса
5. **Производительность** - нет Redis кеширования для orders
6. **Логирование** - нет детального audit trail для изменений
7. **Нет Quick Actions** - медленная работа админа

---

## 🎯 План улучшений

### 1️⃣ **Order Details Page (Enterprise-level)**

**Файл:** `src/app/(admin)/admin/orders/[id]/page.tsx`

**Структура:**

```
┌─────────────────────────────────────────────────┐
│ ORDER HEADER                                    │
│ - Payment Reference (large)                     │
│ - Status Badge + Quick Actions                  │
│ - Created / Updated times                       │
│ - User info + KYC status                        │
└─────────────────────────────────────────────────┘

┌───────────────┬─────────────────────────────────┐
│ LEFT PANEL    │ RIGHT PANEL (Tabs)              │
│               │                                 │
│ Quick Stats:  │ ┌──────────────────────────────┐│
│ - Amount      │ │ 1. Overview                  ││
│ - Rate        │ │ 2. PayIn Details             ││
│ - Fee         │ │ 3. PayOut Details            ││
│ - Total       │ │ 4. Timeline & History        ││
│               │ │ 5. Documents                 ││
│ Order Info:   │ │ 6. User Profile              ││
│ - Wallet      │ │ 7. Admin Notes               ││
│ - Network     │ └──────────────────────────────┘│
│ - Payment     │                                 │
│   Method      │ TAB CONTENT:                    │
│               │ ┌──────────────────────────────┐│
│ Risk Signals: │ │ Detailed information         ││
│ - Compliance  │ │ based on selected tab        ││
│ - AML checks  │ │                              ││
│               │ │ Interactive components       ││
│ Quick Actions:│ │ Forms, charts, data          ││
│ - Verify      │ │                              ││
│ - Process     │ └──────────────────────────────┘│
│ - Refund      │                                 │
│ - Cancel      │ ACTION BAR:                     │
│               │ [ Primary Action ] [ Secondary ]│
└───────────────┴─────────────────────────────────┘
```

**Компоненты:**
- `OrderHeader.tsx` - хедер с основной инфо
- `OrderQuickStats.tsx` - быстрая статистика
- `OrderOverviewTab.tsx` - обзор
- `OrderPayInTab.tsx` - детали PayIn
- `OrderPayOutTab.tsx` - детали PayOut
- `OrderTimelineTab.tsx` - история изменений
- `OrderDocumentsTab.tsx` - документы/proof
- `OrderUserTab.tsx` - инфо о клиенте
- `OrderNotesTab.tsx` - админ заметки

---

### 2️⃣ **Orders Management Table (Улучшение)**

**Файл:** `src/app/(admin)/admin/orders/page.tsx`

**Изменения:**

```typescript
// БЫЛО:
import { DataTable } from '@/components/admin/DataTable';

// СТАНЕТ:
import { DataTableAdvanced } from '@/components/admin/DataTableAdvanced';
import { OrderQuickStats } from './_components/OrderQuickStats';
import { OrderFilters } from './_components/OrderFilters';
```

**Новые возможности:**
1. **Advanced Filters:**
   - Status (multi-select)
   - Date Range
   - Currency (crypto + fiat)
   - Amount range
   - User search
   - Payment Method
   - Has PayIn/PayOut

2. **Bulk Actions:**
   - Export selected (CSV, PDF)
   - Bulk approve
   - Bulk cancel
   - Assign to admin
   - Send notifications

3. **Quick Stats:**
   - Total Orders
   - Total Volume
   - Pending Count
   - Completed Today
   - Average Order Value

4. **Performance:**
   - Redis caching (5 min TTL)
   - Pagination (default 25)
   - Lazy loading
   - Optimistic updates

---

### 3️⃣ **Status Flow Integration (Order ↔ PayIn ↔ PayOut)**

**Файл:** `src/lib/services/order-status-sync.service.ts` (уже есть!)

**Доработка:**

1. **Bidirectional Sync** ✅ (уже реализовано):
   ```
   PayIn VERIFIED → Order PROCESSING
   PayOut CONFIRMED → Order COMPLETED
   ```

2. **Добавить:**
   - Visual Flow Diagram в UI
   - Status History Timeline
   - Automated Transitions (configurable)
   - Rollback mechanism

3. **Validation Rules:**
   ```typescript
   // Нельзя COMPLETE order без PayIn VERIFIED
   // Нельзя создать PayOut без PayIn VERIFIED
   // Нельзя CANCEL order с PayOut SENT
   ```

---

### 4️⃣ **Уведомления (Notifications)**

**Новые файлы:**
- `src/lib/services/order-notification.service.ts`
- `src/lib/email-templates/order-status-changed.tsx`

**Триггеры:**
```typescript
Order Created → Email: "Your order APR-XXX created"
Order PAYMENT_PENDING → Email: "Awaiting payment"
Order PAYMENT_RECEIVED → Email: "Payment received"
Order PROCESSING → Email: "We are processing your order"
Order COMPLETED → Email: "Crypto sent! Check your wallet"
Order CANCELLED → Email: "Order cancelled" + reason
```

**Каналы:**
- ✅ Email (Resend)
- 📱 In-app notifications (future)
- 💬 SMS (optional, future)

---

### 5️⃣ **Performance Optimization**

**A) Redis Caching:**
```typescript
// Cache keys:
`admin:orders:list:{filters_hash}` - 5 min
`admin:orders:stats` - 5 min
`admin:orders:detail:{id}` - 10 min

// Invalidation:
- On order update
- On PayIn/PayOut changes
- On manual refresh
```

**B) Database Indexes:**
```sql
-- Already exist, but verify:
CREATE INDEX IF NOT EXISTS idx_order_status ON "Order"(status);
CREATE INDEX IF NOT EXISTS idx_order_user_created ON "Order"(userId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_order_payment_ref ON "Order"(paymentReference);

-- New indexes:
CREATE INDEX IF NOT EXISTS idx_order_status_created ON "Order"(status, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_order_fiat_currency ON "Order"(fiatCurrencyCode, createdAt DESC);
```

**C) API Optimization:**
```typescript
// Parallel queries:
const [orders, total, stats] = await Promise.all([
  prisma.order.findMany({ ... }),
  prisma.order.count({ ... }),
  getOrderStats()
]);

// Select only needed fields:
select: {
  id: true,
  paymentReference: true,
  status: true,
  // ... only what's displayed
}
```

---

### 6️⃣ **Enhanced Logging & Audit**

**Структура:**

1. **Order Status Changes:**
   ```typescript
   await orderAuditService.logStatusChange({
     orderId,
     oldStatus,
     newStatus,
     changedBy: adminId,
     reason: string,
     metadata: {
       payInId?,
       payOutId?,
       autoTransition: boolean
     }
   });
   ```

2. **Financial Events:**
   ```typescript
   await orderAuditService.logFinancialEvent({
     orderId,
     eventType: 'PAYIN_VERIFIED' | 'PAYOUT_SENT' | 'REFUND',
     amount,
     currency,
     performedBy: adminId
   });
   ```

3. **Admin Actions:**
   ```typescript
   await auditService.logAdminAction(
     adminId,
     'ORDER_MODIFIED',
     'ORDER',
     orderId,
     { field: 'walletAddress', old, new }
   );
   ```

---

### 7️⃣ **Quick Actions (UX Improvement)**

**На странице списка:**
```typescript
- Approve Payment (PayIn: PENDING → VERIFIED)
- Process Order (Order: PENDING → PROCESSING)
- Send Crypto (create PayOut)
- Cancel & Refund
- View Details (navigate to /orders/[id])
- Export Order
```

**На странице деталей:**
```typescript
- Timeline view с action buttons на каждом этапе
- Inline forms для быстрых действий
- Keyboard shortcuts (Cmd+P = Process, Cmd+R = Refund)
```

---

## 📋 Implementation Order

### Phase 1: Foundation (3-4 hours)
1. ✅ Create Order Details Page structure
2. ✅ Implement OrderHeader component
3. ✅ Create tab components (Overview, PayIn, PayOut, Timeline)
4. ✅ Add routing `/admin/orders/[id]`

### Phase 2: Data & Integration (2-3 hours)
5. ✅ Enhance API `/api/admin/orders/[id]` - include PayIn, PayOut, Timeline
6. ✅ Implement OrderQuickStats
7. ✅ Add OrderFilters component
8. ✅ Integrate DataTableAdvanced

### Phase 3: Notifications (2 hours)
9. ✅ Create order-notification.service.ts
10. ✅ Email templates for status changes
11. ✅ Integrate with eventEmitter

### Phase 4: Performance (1-2 hours)
12. ✅ Add Redis caching for orders
13. ✅ Database indexes
14. ✅ API optimization

### Phase 5: Logging & Polish (1-2 hours)
15. ✅ Enhanced audit logging
16. ✅ Timeline component with full history
17. ✅ Quick actions UI
18. ✅ Final testing

**Total: ~10-13 hours of focused work**

---

## 🎨 Design Principles

1. **Enterprise-grade UX** - clean, professional, fast
2. **Information density** - все важное на виду
3. **Action-oriented** - минимум кликов до действия
4. **Performance** - <300ms page load
5. **Responsive** - работает на всех экранах
6. **Accessible** - keyboard navigation, screen readers

---

## ✅ Success Criteria

- ✅ Dedicated order details page с полной информацией
- ✅ <2 клика для основных действий админа
- ✅ Automatic notifications для клиентов
- ✅ Все изменения логируются с полным audit trail
- ✅ Redis caching = fast page loads
- ✅ Bulk actions для массовых операций
- ✅ Zero production errors

