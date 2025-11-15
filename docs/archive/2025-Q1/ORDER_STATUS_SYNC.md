# Order Status Synchronization

## 📋 Обзор

Автоматическая синхронизация статусов между **Order**, **PayIn** и **PayOut** согласно финансовой архитектуре проекта.

## 🔄 Правила синхронизации

### PayIn → Order

| PayIn Status | Order Status | Описание |
|--------------|--------------|----------|
| `RECEIVED` | `PAYMENT_RECEIVED` | Платёж получен |
| `VERIFIED` | `PROCESSING` | Платёж проверен, начинаем обработку |
| `FAILED` | `FAILED` | Платёж не прошёл |
| `REFUNDED` | `REFUNDED` | Возврат средств |
| `EXPIRED` | `CANCELLED` | Истёк срок ожидания |

### PayOut → Order

| PayOut Status | Order Status | Описание |
|---------------|--------------|----------|
| `SENT` | `PROCESSING` | Крипта отправлена |
| `CONFIRMING` | `PROCESSING` | Ждём подтверждений в блокчейне |
| `CONFIRMED` | `COMPLETED` | ✅ Транзакция подтверждена |
| `FAILED` | `FAILED` | Не удалось отправить |
| `CANCELLED` | `CANCELLED` | Отменено |

## 🔧 Реализация

### Сервис: `order-status-sync.service.ts`

```typescript
import { syncOrderOnPayInCreate } from '@/lib/services/order-status-sync.service';

// При создании PayIn
await syncOrderOnPayInCreate(orderId, payInStatus);

// При обновлении PayIn
await syncOrderOnPayInUpdate(orderId, oldStatus, newStatus);

// При создании PayOut
await syncOrderOnPayOutCreate(orderId, payOutStatus);

// При обновлении PayOut
await syncOrderOnPayOutUpdate(orderId, oldStatus, newStatus);

// Умная синхронизация (учитывает оба PayIn и PayOut)
await syncOrderSmart(orderId);
```

### Интеграция в API

#### ✅ POST `/api/admin/pay-in`
- Автоматически обновляет Order после создания PayIn

#### ✅ PATCH `/api/admin/pay-in/[id]`
- Отслеживает изменение статуса PayIn
- Обновляет Order если статус изменился

#### ✅ POST `/api/admin/pay-out`
- Автоматически обновляет Order после создания PayOut

#### ✅ PATCH `/api/admin/pay-out/[id]`
- Отслеживает изменение статуса PayOut
- Обновляет Order если статус изменился

## 🎯 Примеры сценариев

### Сценарий 1: BUY Order (Покупка криптовалюты)

```
1. Order создан → PENDING
2. PayIn создан (RECEIVED) → Order: PAYMENT_RECEIVED
3. PayIn updated (VERIFIED) → Order: PROCESSING
4. PayOut создан (SENT) → Order: PROCESSING (не меняется)
5. PayOut updated (CONFIRMED) → Order: COMPLETED ✅
```

### Сценарий 2: Возврат средств

```
1. Order: PAYMENT_RECEIVED
2. PayIn updated (REFUNDED) → Order: REFUNDED
```

### Сценарий 3: Неудачная отправка

```
1. Order: PROCESSING
2. PayOut updated (FAILED) → Order: FAILED
```

## 🛡️ Безопасность

- **Все изменения логируются** через `console.log`
- **Продолжает работу при ошибках** (graceful degradation)
- **Используется транзакция** где необходимо
- **Кэш инвалидируется** автоматически

## 🔍 Мониторинг

Все синхронизации логируются в консоль:

```
✅ [Order Sync] Order abc123 status updated to COMPLETED (PayOut: SENT → CONFIRMED)
✅ [Order Sync] Order def456 status updated to PROCESSING (PayIn created with VERIFIED)
```

## 📊 Приоритет определения статуса (Smart Sync)

Если есть и PayIn, и PayOut, приоритет:

1. **PayOut CONFIRMED** → `COMPLETED` (финальный статус)
2. **PayOut SENT/CONFIRMING** → `PROCESSING`
3. **PayOut FAILED/CANCELLED** → `FAILED/CANCELLED`
4. **PayIn VERIFIED** → `PROCESSING`
5. **PayIn RECEIVED** → `PAYMENT_RECEIVED`
6. **PayIn FAILED/REFUNDED** → `FAILED/REFUNDED`

## 🚀 Использование

Синхронизация происходит **автоматически** при:

- ✅ Создании PayIn
- ✅ Обновлении статуса PayIn
- ✅ Создании PayOut
- ✅ Обновлении статуса PayOut

**Не требуется** вручную обновлять Order статус!

## 📝 Changelog

- **2025-11-14**: Initial implementation
- Полная синхронизация Order ↔ PayIn ↔ PayOut
- Graceful error handling
- Smart sync с приоритетом PayOut

