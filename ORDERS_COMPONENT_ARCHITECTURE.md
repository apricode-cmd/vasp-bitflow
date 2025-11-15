# Orders Management - Правильная Глобальная Архитектура

## 🎯 Философия

**Принципы:**
1. **Single Responsibility** - каждый компонент делает одну вещь
2. **Reusability** - максимальное переиспользование
3. **Performance** - мемоизация, lazy loading, виртуализация
4. **Consistency** - единый стиль со всеми другими страницами (Users, KYC, PayIn, PayOut)
5. **Enterprise-level** - профессиональный код

---

## 📁 Структура компонентов

```
src/app/(admin)/admin/orders/
├── page.tsx                          # Главный контроллер (~120 строк)
│                                     # - State management
│                                     # - Data fetching
│                                     # - Coordination
│
├── _components/
│   ├── OrderFilters.tsx              # ✅ Уже есть
│   ├── OrderQuickStats.tsx           # ✅ Уже есть
│   │
│   ├── OrdersTableView.tsx           # 🆕 Table view wrapper
│   │   └── Uses: DataTableAdvanced
│   │
│   ├── OrdersKanbanView.tsx          # 🆕 Kanban view (оптимизированный)
│   │   ├── KanbanColumn.tsx          # 🆕 Мемоизированная колонка
│   │   └── OrderCard.tsx             # 🆕 Компактная карточка
│   │
│   ├── OrderActions.tsx              # 🆕 Actions dropdown (переиспользуемый)
│   ├── BulkActionsBar.tsx            # 🆕 Bulk operations
│   └── EmptyState.tsx                # 🆕 Empty state placeholder
│
└── _lib/
    ├── useOrders.ts                  # 🆕 Custom hook для data fetching
    ├── useOrderFilters.ts            # 🆕 Custom hook для filters
    └── orderColumns.tsx              # 🆕 Column definitions
```

---

## 🔧 Детальное описание компонентов

### 1. **page.tsx** (Main Controller)
**Цель:** Координация, state, routing

```typescript
export default function OrdersPage() {
  // Custom hooks (вся логика вынесена!)
  const { orders, loading, refetch } = useOrders(filters);
  const { filters, setFilter } = useOrderFilters();
  
  return (
    <div>
      <Header />
      <OrderFilters /> {/* Уже есть */}
      <OrderQuickStats /> {/* Уже есть */}
      
      {viewMode === 'table' ? (
        <OrdersTableView />
      ) : (
        <OrdersKanbanView />
      )}
    </div>
  );
}
```

**Размер:** ~120 строк (вместо 542!)

---

### 2. **OrdersTableView.tsx** 
**Цель:** Table представление с DataTableAdvanced

**Фичи:**
- ✅ Использует DataTableAdvanced (как Users, KYC, PayIn)
- ✅ Row selection
- ✅ Bulk actions
- ✅ Export
- ✅ Column visibility
- ✅ Sorting
- ✅ Click → navigate to detail page

```typescript
interface OrdersTableViewProps {
  orders: Order[];
  loading: boolean;
  onRefresh: () => void;
}

export function OrdersTableView({ orders, loading, onRefresh }: OrdersTableViewProps) {
  const columns = useOrderColumns(); // Вынесено в отдельный файл
  
  const handleBulkCancel = async (selected: Order[]) => {
    // Bulk cancel logic
  };
  
  const handleExport = (selectedIds?: string[]) => {
    // Export logic
  };
  
  return (
    <DataTableAdvanced
      columns={columns}
      data={orders}
      isLoading={loading}
      searchKey="paymentReference"
      searchPlaceholder="Search by reference or email..."
      enableRowSelection
      enableExport
      bulkActions={[
        { label: 'Cancel Selected', onClick: handleBulkCancel, variant: 'destructive' },
        { label: 'Export Selected', onClick: () => handleExport(selectedIds) }
      ]}
      onRowClick={(order) => router.push(`/admin/orders/${order.id}`)}
      pageSize={20}
    />
  );
}
```

---

### 3. **OrdersKanbanView.tsx**
**Цель:** Kanban представление (оптимизированное)

**Оптимизации:**
- ✅ Мемоизированные колонки
- ✅ Virtual scrolling для >50 карточек
- ✅ Lazy loading
- ✅ Drag & drop (react-beautiful-dnd)

```typescript
export function OrdersKanbanView({ orders, loading, onStatusChange }: Props) {
  // Мемоизированная группировка
  const ordersByStatus = useMemo(() => 
    groupOrdersByStatus(orders),
    [orders]
  );
  
  const statuses = ['PENDING', 'PAYMENT_RECEIVED', 'PROCESSING', 'COMPLETED'];
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statuses.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            orders={ordersByStatus[status] || []}
            loading={loading}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
```

---

### 4. **KanbanColumn.tsx**
**Цель:** Мемоизированная колонка Kanban

```typescript
export const KanbanColumn = memo(({ status, orders, loading }: Props) => {
  return (
    <Droppable droppableId={status}>
      {(provided) => (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3>{getStatusLabel(status)}</h3>
              <Badge>{orders.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {orders.map((order, index) => (
                <Draggable
                  key={order.id}
                  draggableId={order.id}
                  index={index}
                >
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                      <OrderCard order={order} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          </CardContent>
        </Card>
      )}
    </Droppable>
  );
});
```

---

### 5. **OrderCard.tsx**
**Цель:** Компактная карточка заказа для Kanban

**Дизайн:** Минимальная информация, быстрый рендеринг

```typescript
export const OrderCard = memo(({ order }: { order: Order }) => {
  return (
    <Card 
      className="mb-2 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => router.push(`/admin/orders/${order.id}`)}
    >
      <CardContent className="p-3 space-y-2">
        {/* Payment Reference */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs">{order.paymentReference}</span>
          <Badge variant="outline" className="text-xs">
            {order.currencyCode}
          </Badge>
        </div>
        
        {/* Amount */}
        <div>
          <p className="text-lg font-semibold">
            {formatCurrency(order.totalFiat, order.fiatCurrencyCode)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatCryptoAmount(order.cryptoAmount)} {order.currencyCode}
          </p>
        </div>
        
        {/* User */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {order.user.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs truncate">{order.user.email}</span>
        </div>
        
        {/* Status indicators */}
        {(order.payIn || order.payOut) && (
          <div className="flex gap-1">
            {order.payIn && (
              <Badge variant="outline" className="text-xs">
                <TrendingDown className="h-3 w-3 mr-1" />
                {order.payIn.status}
              </Badge>
            )}
            {order.payOut && (
              <Badge variant="outline" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                {order.payOut.status}
              </Badge>
            )}
          </div>
        )}
        
        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  );
});
```

---

### 6. **OrderActions.tsx**
**Цель:** Переиспользуемый dropdown actions

```typescript
interface OrderActionsProps {
  order: Order;
  onAction: (action: string) => void;
}

export function OrderActions({ order, onAction }: OrderActionsProps) {
  const actions = getAvailableActions(order.status);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map(action => (
          <DropdownMenuItem
            key={action.key}
            onClick={() => onAction(action.key)}
            className={action.destructive ? 'text-destructive' : ''}
          >
            <action.icon className="h-4 w-4 mr-2" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

### 7. **BulkActionsBar.tsx**
**Цель:** Sticky bar для bulk operations

```typescript
export function BulkActionsBar({ selectedCount, actions, onClear }: Props) {
  if (selectedCount === 0) return null;
  
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Card className="shadow-lg">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <Badge>{selectedCount} selected</Badge>
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex gap-2">
            {actions.map(action => (
              <Button
                key={action.label}
                variant={action.variant}
                size="sm"
                onClick={action.onClick}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🪝 Custom Hooks

### useOrders.ts
**Цель:** Data fetching логика

```typescript
export function useOrders(filters: OrderFilters) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      
      const response = await fetch(`/api/admin/orders/light?${params}`);
      const data = await response.json();
      
      setOrders(data.orders || []);
    } catch (err) {
      setError(err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filters]);
  
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  return { orders, loading, error, refetch: fetchOrders };
}
```

### useOrderFilters.ts
**Цель:** Filter state management

```typescript
export function useOrderFilters() {
  const [filters, setFilters] = useState<OrderFilters>({
    status: 'all',
    search: '',
    dateRange: undefined
  });
  
  const setFilter = useCallback(<K extends keyof OrderFilters>(
    key: K,
    value: OrderFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const resetFilters = useCallback(() => {
    setFilters({
      status: 'all',
      search: '',
      dateRange: undefined
    });
  }, []);
  
  return { filters, setFilter, resetFilters };
}
```

---

## 📊 Column Definitions

### orderColumns.tsx
**Цель:** Reusable column definitions

```typescript
export function useOrderColumns(): ColumnDef<Order>[] {
  return useMemo(() => [
    // Selection column
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    
    // Customer
    {
      accessorKey: 'user.email',
      header: 'Customer',
      cell: ({ row }) => {
        const user = row.original.user;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.profile?.firstName || user.email}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        );
      }
    },
    
    // Payment Reference
    {
      accessorKey: 'paymentReference',
      header: 'Reference',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.paymentReference}</span>
      )
    },
    
    // ... остальные колонки
  ], []);
}
```

---

## 🎯 Benefits (Преимущества)

### Performance:
- ✅ Light API: 500KB → 100KB (5x)
- ✅ Мемоизация: устранены лишние re-renders
- ✅ Virtual scrolling: быстрая прокрутка
- ✅ Lazy loading: постепенная загрузка

### Maintainability:
- ✅ Модульность: каждый компонент <150 строк
- ✅ Переиспользование: единый стиль
- ✅ Тестируемость: изолированные компоненты
- ✅ Расширяемость: легко добавлять features

### Consistency:
- ✅ Единый DataTableAdvanced
- ✅ Единый паттерн для всех страниц
- ✅ Единый стиль кода
- ✅ Enterprise-level качество

---

## 📝 Implementation Order

1. **useOrders hook** - вынести data fetching
2. **useOrderFilters hook** - вынести filter state
3. **orderColumns.tsx** - вынести column definitions
4. **OrdersTableView** - создать table view
5. **OrderCard** - компактная карточка
6. **KanbanColumn** - мемоизированная колонка
7. **OrdersKanbanView** - оптимизированный Kanban
8. **BulkActionsBar** - bulk operations
9. **Refactor page.tsx** - упростить до ~120 строк

---

## 🚀 Ready to implement?

Начинаем по порядку, делаем все правильно и глобально!

