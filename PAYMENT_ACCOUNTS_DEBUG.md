# 🔍 Payment Accounts - Проверка данных

## Текущее состояние API

### 1. ✅ Payment Accounts API (`/api/admin/payment-accounts`)
**Endpoint**: GET `/api/admin/payment-accounts`  
**Response format**:
```json
{
  "success": true,
  "accounts": [
    {
      "id": "...",
      "code": "...",
      "name": "...",
      "type": "BANK_ACCOUNT" | "CRYPTO_WALLET",
      "fiatCurrency": { "code": "EUR", "name": "Euro", "symbol": "€" },
      "cryptocurrency": { "code": "BTC", "name": "Bitcoin", "symbol": "₿" },
      "blockchain": { "code": "BITCOIN", "name": "Bitcoin" },
      "isActive": true,
      "isDefault": false,
      "priority": 1
    }
  ],
  "total": 0
}
```

### 2. ✅ Payment Methods API (`/api/admin/payment-methods`)
**Endpoint**: GET `/api/admin/payment-methods`  
**Response format**:
```json
{
  "success": true,
  "methods": [
    {
      "code": "sepa",
      "name": "SEPA Transfer",
      "type": "bank_transfer",
      "direction": "IN",
      "providerType": "BANK_ACCOUNT",
      "automationLevel": "MANUAL",
      "currency": "EUR",
      "paymentAccount": { "code": "...", "name": "..." },
      "minAmount": 10,
      "maxAmount": 50000,
      "isActive": true,
      "isAvailableForClients": true
    }
  ],
  "total": 0
}
```

### 3. ✅ PSP Connectors API (`/api/admin/resources/psp-connectors`)
**Endpoint**: GET `/api/admin/resources/psp-connectors`  
**Response format**: Нужно проверить!

## Проблемы и решения

### Проблема 1: Данные не отображаются
**Причина**: Возможно пустая база данных или неправильная структура ответа API

**Решение**:
1. Запустить `npm run seed` для заполнения тестовыми данными
2. Проверить console.log в браузере на наличие ошибок
3. Добавить отладочные логи в fetchData

### Проблема 2: Columns могут не совпадать с API
**Текущие columns для Bank Accounts**:
- `name` ✅
- `bankName` ✅
- `accountHolder` ✅
- `iban` ✅
- `fiatCurrency` ✅ (объект с code, name, symbol)
- `isDefault` ✅
- `isActive` ✅

**Текущие columns для Crypto Wallets**:
- `name` ✅
- `cryptocurrency` ✅ (объект)
- `blockchain` ✅ (объект)
- `address` ✅
- `balance` ✅
- `isActive` ✅

**Текущие columns для Payment Methods**:
- `name` ✅
- `direction` ✅
- `providerType` ✅
- `automationLevel` ✅
- `currency` ✅
- `minAmount`, `maxAmount` ✅
- `isActive`, `isAvailableForClients` ✅

## Как проверить

### 1. Проверить API в браузере
Открыть Developer Tools (F12) → Network → перейти на страницу `/admin/payments`

Должны быть запросы:
- ✅ GET `/api/admin/payment-accounts` → status 200
- ✅ GET `/api/admin/payment-methods` → status 200
- ✅ GET `/api/admin/resources/psp-connectors` → status 200
- ✅ GET `/api/admin/resources/fiat-currencies` → status 200
- ✅ GET `/api/admin/resources/currencies?active=true` → status 200
- ✅ GET `/api/admin/blockchains` → status 200

### 2. Проверить Console
Должны быть логи:
```
Fetching payment data...
Bank Accounts: 0 (or number)
Crypto Wallets: 0 (or number)
Payment Methods: 0 (or number)
PSP Connectors: 0 (or number)
```

### 3. Проверить базу данных
```bash
npx prisma studio
```

Открыть таблицы:
- `PaymentAccount` → должны быть записи
- `PaymentMethod` → должны быть записи
- `PspConnector` → должны быть записи

### 4. Заполнить тестовыми данными
```bash
npm run seed
```

## Что делать дальше

1. **Открыть страницу** `/admin/payments` в браузере
2. **Открыть DevTools** (F12) → Console и Network
3. **Проверить запросы** - все ли успешны (status 200)?
4. **Проверить ответы** - есть ли данные в `accounts`, `methods`, `data`?
5. **Если данных нет** → запустить `npm run seed`
6. **Если есть ошибки** → отправить мне скриншот консоли

## Ожидаемое поведение

✅ **Правильно**: Таблицы показывают данные с корректными колонками  
✅ **Правильно**: При клике на "Edit" открывается диалог с данными  
✅ **Правильно**: При клике на "Delete" открывается подтверждение  
✅ **Правильно**: При клике на "Add" открывается пустой диалог  

❌ **Неправильно**: Пустые таблицы (если в БД есть данные)  
❌ **Неправильно**: Ошибки в консоли  
❌ **Неправильно**: Колонки показывают `undefined` или `[object Object]`

