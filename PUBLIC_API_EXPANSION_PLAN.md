# 📋 Public API v1 Expansion Plan

## 🎯 Текущее состояние

**Есть сейчас (5 endpoints):**
- `GET /api/v1/rates` - курсы обмена
- `GET /api/v1/currencies` - список криптовалют
- `POST /api/v1/orders` - создать заказ
- `GET /api/v1/orders` - список заказов
- `GET /api/v1/orders/{id}` - детали заказа

## 🚀 Предлагаемое расширение

### 1️⃣ **Customer Management** (Управление клиентами)

#### `POST /api/v1/customers`
**Создать клиента**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+48123456789",
  "phoneCountry": "PL",
  "metadata": {
    "externalId": "customer-123",
    "source": "mobile-app"
  }
}
```
**Response:** Customer ID, email, status

**Use case:** Партнеры могут создавать клиентов через API перед созданием заказа

---

#### `GET /api/v1/customers/{id}`
**Получить клиента**

**Response:** Полная информация о клиенте (без чувствительных данных)

---

#### `PATCH /api/v1/customers/{id}`
**Обновить клиента**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+48987654321"
}
```

---

#### `GET /api/v1/customers`
**Список клиентов**

**Query params:**
- `page`, `limit`
- `email` (поиск)
- `createdAfter`, `createdBefore`

---

### 2️⃣ **KYC Management** (Управление верификацией)

#### `POST /api/v1/customers/{id}/kyc`
**Инициировать KYC для клиента**
```json
{
  "redirectUrl": "https://partner.com/kyc-callback",
  "locale": "en"
}
```
**Response:** KYC session URL для редиректа клиента

**Use case:** Партнер отправляет клиента на KYC верификацию

---

#### `GET /api/v1/customers/{id}/kyc/status`
**Статус KYC верификации**

**Response:**
```json
{
  "status": "APPROVED",
  "verifiedAt": "2025-01-15T10:30:00Z",
  "expiresAt": "2026-01-15T10:30:00Z"
}
```

---

### 3️⃣ **Payment Methods** (Методы оплаты)

#### `GET /api/v1/payment-methods`
**Доступные методы оплаты**

**Query params:**
- `fiatCurrency` (EUR, PLN)
- `country`

**Response:**
```json
{
  "paymentMethods": [
    {
      "code": "SEPA",
      "name": "SEPA Bank Transfer",
      "currencies": ["EUR"],
      "processingTime": "1-3 business days",
      "minAmount": 50,
      "maxAmount": 50000
    }
  ]
}
```

---

### 4️⃣ **Wallets** (Кошельки клиентов)

#### `POST /api/v1/customers/{id}/wallets`
**Добавить кошелек клиенту**
```json
{
  "currencyCode": "BTC",
  "address": "bc1q...",
  "label": "My Hardware Wallet",
  "isDefault": true
}
```

**Use case:** Клиент может сохранить кошельки для быстрых заказов

---

#### `GET /api/v1/customers/{id}/wallets`
**Список кошельков клиента**

---

#### `DELETE /api/v1/customers/{id}/wallets/{walletId}`
**Удалить кошелек**

---

### 5️⃣ **Order Enhancements** (Улучшения заказов)

#### `POST /api/v1/orders/{id}/cancel`
**Отменить заказ**
```json
{
  "reason": "Customer changed mind"
}
```

**Conditions:** Только если статус PENDING или AWAITING_PAYMENT

---

#### `GET /api/v1/orders/{id}/invoice`
**Скачать инвойс**

**Response:** PDF file

---

#### `GET /api/v1/orders/{id}/payment-instructions`
**Инструкции по оплате**

**Response:**
```json
{
  "bankName": "Example Bank",
  "accountHolder": "Apricode Exchange Ltd",
  "iban": "PL...",
  "swift": "ABCDPLPW",
  "reference": "APR-123-ABC",
  "amount": 1000.00,
  "currency": "EUR"
}
```

---

### 6️⃣ **Webhooks** (События в реальном времени)

#### `POST /api/v1/webhooks`
**Создать webhook**
```json
{
  "url": "https://partner.com/webhooks/apricode",
  "events": ["order.created", "order.completed", "kyc.approved"],
  "description": "Production webhook"
}
```

---

#### `GET /api/v1/webhooks`
**Список webhooks**

---

#### `PATCH /api/v1/webhooks/{id}`
**Обновить webhook**

---

#### `DELETE /api/v1/webhooks/{id}`
**Удалить webhook**

---

#### `GET /api/v1/webhooks/{id}/deliveries`
**История доставки webhook**

**Response:**
```json
{
  "deliveries": [
    {
      "id": "del_123",
      "event": "order.completed",
      "status": "DELIVERED",
      "attempts": 1,
      "responseStatus": 200,
      "deliveredAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 7️⃣ **Analytics & Reporting** (Аналитика)

#### `GET /api/v1/analytics/summary`
**Общая статистика**

**Query params:**
- `from`, `to` (date range)

**Response:**
```json
{
  "period": {
    "from": "2025-01-01",
    "to": "2025-01-31"
  },
  "orders": {
    "total": 150,
    "completed": 120,
    "pending": 20,
    "cancelled": 10
  },
  "volume": {
    "totalFiat": 150000.00,
    "currency": "EUR"
  },
  "customers": {
    "total": 45,
    "new": 12,
    "verified": 40
  }
}
```

---

#### `GET /api/v1/analytics/orders`
**Статистика заказов**

**Query params:**
- `from`, `to`
- `groupBy` (day, week, month)

---

### 8️⃣ **Account Management** (Управление аккаунтом)

#### `GET /api/v1/account`
**Информация об API ключе**

**Response:**
```json
{
  "name": "Production API Key",
  "permissions": ["orders.read", "orders.create", "customers.manage"],
  "rateLimit": {
    "limit": 1000,
    "remaining": 950,
    "resetAt": "2025-01-15T11:00:00Z"
  },
  "usage": {
    "today": 50,
    "thisMonth": 1500
  }
}
```

---

#### `GET /api/v1/account/usage`
**История использования API**

---

### 9️⃣ **Rates & Pricing** (Расширенные курсы)

#### `GET /api/v1/rates/calculate`
**Калькулятор обмена**

**Query params:**
- `from=EUR&to=BTC&amount=1000`

**Response:**
```json
{
  "from": {
    "currency": "EUR",
    "amount": 1000.00
  },
  "to": {
    "currency": "BTC",
    "amount": 0.02345678
  },
  "rate": 42650.00,
  "fees": {
    "platform": 15.00,
    "percentage": 1.5
  },
  "total": {
    "fiat": 1015.00,
    "crypto": 0.02345678
  }
}
```

---

#### `GET /api/v1/rates/history`
**Исторические курсы**

**Query params:**
- `pair=BTC/EUR`
- `from`, `to`
- `interval` (1h, 1d, 1w)

---

### 🔟 **Limits & Validation** (Лимиты)

#### `GET /api/v1/limits`
**Лимиты для клиента**

**Response:**
```json
{
  "customer": {
    "id": "cust_123",
    "kycStatus": "APPROVED"
  },
  "limits": {
    "daily": {
      "limit": 10000.00,
      "used": 2500.00,
      "remaining": 7500.00,
      "currency": "EUR"
    },
    "monthly": {
      "limit": 50000.00,
      "used": 15000.00,
      "remaining": 35000.00,
      "currency": "EUR"
    }
  }
}
```

---

## 📊 Итого предлагаемых endpoints

### По категориям:

| Категория | Endpoints | Описание |
|-----------|-----------|----------|
| **Customers** | 5 | CRUD клиентов |
| **KYC** | 2 | Инициация и статус KYC |
| **Wallets** | 3 | Управление кошельками |
| **Orders** | 3 | Отмена, инвойс, инструкции |
| **Payment Methods** | 1 | Доступные методы оплаты |
| **Webhooks** | 5 | CRUD webhooks + история |
| **Analytics** | 2 | Статистика и отчеты |
| **Account** | 2 | Информация об API ключе |
| **Rates** | 2 | Калькулятор и история |
| **Limits** | 1 | Лимиты клиента |

**Итого: +26 новых endpoints**

**Всего в Public API v1: 31 endpoint**

---

## 🎯 Приоритизация (фазы)

### **Phase 1: Essential (MVP)** ⭐⭐⭐
**Критично для базовой интеграции:**
1. `POST /api/v1/customers` - создание клиентов
2. `GET /api/v1/customers/{id}` - получение клиента
3. `POST /api/v1/customers/{id}/kyc` - инициация KYC
4. `GET /api/v1/customers/{id}/kyc/status` - статус KYC
5. `GET /api/v1/payment-methods` - методы оплаты
6. `POST /api/v1/orders/{id}/cancel` - отмена заказа
7. `GET /api/v1/rates/calculate` - калькулятор

**Endpoints: 7**
**Время: 1 неделя**

---

### **Phase 2: Webhooks & Automation** ⭐⭐
**Для автоматизации и уведомлений:**
1. `POST /api/v1/webhooks` - создание webhook
2. `GET /api/v1/webhooks` - список webhooks
3. `PATCH /api/v1/webhooks/{id}` - обновление
4. `DELETE /api/v1/webhooks/{id}` - удаление
5. `GET /api/v1/webhooks/{id}/deliveries` - история

**Endpoints: 5**
**Время: 1 неделя**

---

### **Phase 3: Enhanced Features** ⭐
**Для продвинутых интеграций:**
1. `POST /api/v1/customers/{id}/wallets` - кошельки
2. `GET /api/v1/customers/{id}/wallets`
3. `DELETE /api/v1/customers/{id}/wallets/{id}`
4. `GET /api/v1/orders/{id}/invoice` - инвойс
5. `GET /api/v1/orders/{id}/payment-instructions`
6. `GET /api/v1/account` - информация об API ключе
7. `GET /api/v1/limits` - лимиты

**Endpoints: 7**
**Время: 1 неделя**

---

### **Phase 4: Analytics & Reporting** ⭐
**Для бизнес-аналитики:**
1. `GET /api/v1/analytics/summary`
2. `GET /api/v1/analytics/orders`
3. `GET /api/v1/rates/history`
4. `GET /api/v1/account/usage`
5. `GET /api/v1/customers` - список с фильтрами
6. `PATCH /api/v1/customers/{id}` - обновление

**Endpoints: 6**
**Время: 1 неделя**

---

## 🔐 Security Considerations

### Authentication
- Все endpoints требуют `X-API-Key` header
- API ключи привязаны к организации (multi-tenancy)
- Разные уровни permissions для ключей

### Rate Limiting
- **Standard:** 100 req/min
- **Premium:** 1000 req/min
- **Enterprise:** Custom limits

### Permissions
```typescript
enum ApiPermission {
  // Customers
  'customers.read',
  'customers.create',
  'customers.update',
  'customers.delete',
  
  // Orders
  'orders.read',
  'orders.create',
  'orders.cancel',
  
  // KYC
  'kyc.initiate',
  'kyc.read',
  
  // Webhooks
  'webhooks.manage',
  
  // Analytics
  'analytics.read',
}
```

---

## 📝 Implementation Checklist

### For each new endpoint:

- [ ] Create API route (`/src/app/api/v1/...`)
- [ ] Add Zod validation schema
- [ ] Implement API key authentication
- [ ] Add permission checks
- [ ] Add rate limiting
- [ ] Write tests
- [ ] Add to OpenAPI spec
- [ ] Update Scalar documentation
- [ ] Add code examples (JS, Python, cURL)
- [ ] Update CHANGELOG

---

## 🎯 Success Metrics

### После Phase 1:
- Партнеры могут создавать клиентов через API
- Полный цикл: Customer → KYC → Order
- Базовая интеграция работает end-to-end

### После Phase 2:
- Webhooks для автоматизации
- Real-time уведомления о событиях
- Меньше polling, больше push

### После Phase 3:
- Управление кошельками
- Скачивание инвойсов
- Мониторинг лимитов

### После Phase 4:
- Полная аналитика для партнеров
- Исторические данные
- Business intelligence

---

## 💡 Recommendations

### Начать с Phase 1 (Essential):
1. **Customer Management** - основа для всего
2. **KYC Integration** - обязательное требование
3. **Rate Calculator** - помощь партнерам

### Затем Phase 2 (Webhooks):
- Критично для автоматизации
- Снижает нагрузку на API (меньше polling)
- Улучшает UX партнеров

### Далее по потребности:
- Phase 3 если нужны advanced features
- Phase 4 для enterprise клиентов

---

## 🚀 Next Steps

1. **Утвердить список endpoints** для Phase 1
2. **Создать детальные спецификации** (request/response schemas)
3. **Обновить OpenAPI spec**
4. **Начать implementation** Phase 1
5. **Написать integration guide** для партнеров

---

**Готовы начать с Phase 1?** 🎯

