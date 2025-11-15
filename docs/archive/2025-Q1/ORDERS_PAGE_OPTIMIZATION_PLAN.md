# Orders Management Page - Детальный План Оптимизации

## 🔍 Анализ текущих проблем

### 1. **Проблемы производительности:**
- ❌ API загружает ОГРОМНОЕ количество связанных данных (10+ includes)
- ❌ Загружает payIn/payOut с 4 вложенными includes каждый
- ❌ Отсутствует пагинация на клиенте (загружает все заказы сразу)
- ❌ 4 дополнительных запроса для reference data
- ❌ Нет виртуализации для больших списков
- ❌ Kanban пересчитывает все колонки при каждом рендере

### 2. **Проблемы архитектуры:**
- ❌ Монолитный файл (542 строки)
- ❌ Вся логика в одном компоненте
- ❌ Дублирование кода между Kanban и Table
- ❌ Нет переиспользуемых компонентов

### 3. **Текущий API Response (слишком много данных):**
```typescript
{
  user: { profile: {...} },
  currency: {...},
  fiatCurrency: {...},
  paymentMethod: {...},
  blockchain: {...},
  payIn: {
    fiatCurrency: {...},
    cryptocurrency: {...},
    paymentMethod: {...},
    network: {...}
  },
  payOut: {
    fiatCurrency: {...},
    cryptocurrency: {...},
    paymentMethod: {...},
    network: {...}
  }
}
```

---

## 🎯 План Оптимизации (Пошаговый)

### **Phase 1: API Optimization** ⚡
**Цель:** Уменьшить размер данных в 3-5 раз

#### 1.1. Создать легковесный endpoint для списка
```typescript
GET /api/admin/orders/light
```
**Возвращает только:**
- id, paymentReference, status
- cryptoAmount, currencyCode (только код!)
- totalFiat, fiatCurrencyCode (только код!)
- user: { email } (без profile!)
- payIn: { status } (только статус!)
- payOut: { status } (только статус!)
- createdAt

**Экономия:** ~70% размера данных

#### 1.2. Оптимизировать основной endpoint
```typescript
// Было
include: {
  user: { include: { profile: true } },
  payIn: { include: { fiatCurrency, cryptocurrency, paymentMethod, network } },
  // ... 10+ includes
}

// Стало
select: {
  id: true,
  paymentReference: true,
  status: true,
  currencyCode: true,  // только код, не объект!
  user: {
    select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } }
  },
  payIn: { select: { id: true, status: true } },
  payOut: { select: { id: true, status: true } }
}
```

#### 1.3. Кэширование с правильными ключами
- ✅ Статистика: 10 минут
- ✅ Список заказов: 2 минуты
- ✅ Reference data: 30 минут

---

### **Phase 2: Component Decomposition** 🧩
**Цель:** Разбить монолит на переиспользуемые компоненты

#### Структура:
```
src/app/(admin)/admin/orders/
├── page.tsx (главный контроллер, ~100 строк)
├── _components/
│   ├── OrderFilters.tsx (уже есть ✅)
│   ├── OrderQuickStats.tsx (уже есть ✅)
│   ├── OrdersTable.tsx (новый)
│   ├── OrdersKanban.tsx (новый, оптимизированный)
│   ├── OrderCardCompact.tsx (новый, для Kanban)
│   ├── OrderActionsMenu.tsx (новый)
│   └── BulkActionsBar.tsx (новый)
```

#### 2.1. OrdersTable Component
- Использует `DataTableAdvanced`
- Виртуализация для >100 строк
- Lazy loading при скролле
- Bulk selection
- Export функционал

#### 2.2. OrdersKanban Component
- Мемоизированные колонки
- Виртуализация карточек
- Lazy loading
- Drag & drop оптимизация

#### 2.3. OrderCardCompact Component
- Минимальная информация
- Мемоизация
- Skeleton на загрузке

---

### **Phase 3: Frontend Performance** 🚀
**Цель:** Мгновенная отрисовка UI

#### 3.1. React Optimizations
```typescript
// Мемоизация
const filteredOrders = useMemo(() => 
  orders.filter(o => selectedStatus === 'all' || o.status === selectedStatus),
  [orders, selectedStatus]
);

// Debounce для поиска
const debouncedSearch = useDebouncedValue(searchTerm, 300);

// Virtual scrolling для Table
import { useVirtualizer } from '@tanstack/react-virtual';
```

#### 3.2. Pagination
- Client-side pagination: 20 заказов на страницу
- Server-side pagination для >1000 заказов
- Infinite scroll опция

#### 3.3. Lazy Loading
- Reference data загружать только когда нужно
- Stats загружать отдельно
- Skeleton screens

---

### **Phase 4: Smart Caching & Updates** 💾
**Цель:** Минимизировать запросы

#### 4.1. React Query / SWR Integration
```typescript
const { data, isLoading, mutate } = useSWR(
  `/api/admin/orders/light?status=${status}`,
  fetcher,
  { 
    refreshInterval: 30000, // каждые 30 сек
    revalidateOnFocus: false,
    dedupingInterval: 5000
  }
);
```

#### 4.2. Optimistic Updates
- Статус меняется мгновенно на UI
- Rollback при ошибке

#### 4.3. Background Sync
- WebSocket для real-time updates (опционально)
- Polling с умным интервалом

---

### **Phase 5: UI/UX Improvements** 🎨
**Цель:** Профессиональный интерфейс

#### 5.1. Filters Enhancement
- ✅ Status tabs (как сейчас)
- ✅ Search с debounce
- ✅ Date range picker
- 🆕 Currency filter
- 🆕 Amount range filter
- 🆕 Save filter presets

#### 5.2. Bulk Actions
- Select all
- Select filtered
- Actions: Cancel, Export, Assign

#### 5.3. View Options
- ✅ Kanban / Table toggle
- 🆕 Compact / Detailed view
- 🆕 Column customization

---

## 📊 Ожидаемые результаты

| Метрика | Сейчас | После оптимизации |
|---------|--------|-------------------|
| Initial Load | 3-5s | 0.5-1s ⚡ |
| API Response Size | ~500KB | ~100KB 📉 |
| Rendering Time | 2-3s | <500ms ⚡ |
| Memory Usage | High | Medium 📉 |
| Re-renders | Many | Minimal 📉 |

---

## 🛠️ Implementation Order

### Step 1: API Optimization (1-2 hours)
1. Создать `/api/admin/orders/light` endpoint
2. Оптимизировать select queries
3. Улучшить кэширование

### Step 2: Core Components (2-3 hours)
1. OrdersTable.tsx
2. OrdersKanban.tsx (рефакторинг)
3. OrderCardCompact.tsx

### Step 3: Performance (1-2 hours)
1. Мемоизация
2. Pagination
3. Debouncing

### Step 4: UI Polish (1 hour)
1. Loading states
2. Empty states
3. Error handling

---

## 🎯 Priority Quick Wins

### Must Do (критично):
1. ✅ Создать light API endpoint
2. ✅ Добавить пагинацию
3. ✅ Мемоизировать filteredOrders
4. ✅ Debounce search

### Should Do (важно):
5. ✅ Разбить на компоненты
6. ✅ Virtual scrolling для Table
7. ✅ Оптимизировать Kanban

### Nice to Have (позже):
8. ⏳ React Query integration
9. ⏳ WebSocket updates
10. ⏳ Advanced filters

---

## 🚀 Let's Start!

Начнём с **Quick Wins** - они дадут максимальный эффект с минимальными усилиями.

1. Создадим light API endpoint
2. Оптимизируем запросы
3. Добавим мемоизацию
4. Разобьём на компоненты

**Согласен с планом?** Начинаем с API optimization?

