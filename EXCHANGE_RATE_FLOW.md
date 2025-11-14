# Exchange Rate Formation - Полный цикл

## 📊 Как формируется Exchange Rate: 88906.00 EUR/BTC

### 🔄 Поток данных (от источника до отображения)

```
1. Rate Provider (CoinGecko/Kraken)
   ↓
2. Rate Provider Service (с Redis кешем 30 сек)
   ↓
3. Rate Management Service (проверка Manual Override)
   ↓
4. Order Creation (сохранение в Order.rate)
   ↓
5. PayIn Details (отображение на фронте)
```

---

## 1️⃣ **Источник данных - Rate Provider**

### Active Provider
Система использует **один активный** rate provider:
- **CoinGecko** (по умолчанию)
- **Kraken** (альтернатива)

Проверка активного провайдера:
```typescript
// src/lib/services/rate-provider.service.ts
async getActiveProvider() {
  const provider = await prisma.integration.findFirst({
    where: {
      service: { in: ['coingecko', 'kraken'] },
      isEnabled: true,
      status: 'active'
    }
  });
}
```

### Получение курса от провайдера
```typescript
// src/lib/services/rate-provider.service.ts
async getRate(crypto: string, fiat: string): Promise<number> {
  // 1. Проверка Redis cache (TTL: 30 секунд)
  const cached = await CacheService.getRate(crypto, fiat);
  if (cached !== null) return cached;

  // 2. Получение от активного провайдера
  const provider = await integrationFactory.getRatesProvider();
  const rate = await provider.getRate(crypto, fiat);
  
  // 3. Сохранение в Redis cache
  await CacheService.setRate(crypto, fiat, rate, 30);
  
  return rate; // Например: 88906.00
}
```

---

## 2️⃣ **Rate Management Service - Manual Override**

### Приоритет источников
```typescript
// src/lib/services/rate-management.service.ts
async getCurrentRate(cryptoCode: string, fiatCode: string): Promise<number> {
  // 1. ПРИОРИТЕТ: Manual Rate Override (admin устанавливает вручную)
  const manualRate = await this.getActiveManualRate(cryptoCode, fiatCode);
  if (manualRate) {
    return manualRate.rate; // Если админ установил курс вручную
  }

  // 2. FALLBACK: Active Rate Provider (CoinGecko/Kraken)
  return await rateProviderService.getRate(cryptoCode, fiatCode);
}
```

### Manual Rate Override
Admin может установить фиксированный курс через админ-панель:

```sql
-- Таблица ManualRate
CREATE TABLE ManualRate (
  id            String   PRIMARY KEY,
  cryptoCode    String,  -- "BTC"
  fiatCode      String,  -- "EUR"
  rate          Float,   -- 88906.00 (курс установлен вручную)
  isActive      Boolean, -- true
  validFrom     DateTime,
  validTo       DateTime?, -- NULL = бессрочно
  createdBy     String,
  reason        String?
);
```

**Когда используется Manual Override:**
- Аномальная волатильность
- Технические проблемы с провайдером
- Специальные условия для клиентов
- Тестирование

---

## 3️⃣ **Order Creation - Сохранение курса**

### Создание заказа
```typescript
// src/app/api/orders/route.ts
export async function POST(request: NextRequest) {
  // 1. Получение текущего курса
  const rate = await rateManagementService.getCurrentRate(
    'BTC',  // Crypto
    'EUR'   // Fiat
  );
  // rate = 88906.00 EUR/BTC

  // 2. Расчет суммы заказа
  const calculation = calculateOrderTotal(
    0.02184046, // cryptoAmount (BTC)
    88906.00,   // rate (EUR/BTC)
    0.015       // feePercent (1.5%)
  );

  // Результат:
  // {
  //   amount: 0.02184046,
  //   rate: 88906.00,
  //   fiatAmount: 1941.87,     // 0.02184046 * 88906.00
  //   fee: 29.13,              // 1941.87 * 0.015
  //   feePercentage: 0.015,
  //   totalFiat: 1971.00       // 1941.87 + 29.13
  // }

  // 3. Сохранение в БД
  const order = await prisma.order.create({
    data: {
      cryptoAmount: 0.02184046,
      rate: 88906.00,           // ← СОХРАНЯЕТСЯ курс на момент создания
      fiatAmount: 1941.87,
      feePercent: 1.5,
      feeAmount: 29.13,
      totalFiat: 1971.00,
      // ... другие поля
    }
  });
}
```

### Расчет формулы
```typescript
// src/lib/utils/order-calculations.ts
export function calculateOrderTotal(
  cryptoAmount: number,
  exchangeRate: number,
  feePercentage: number
): OrderCalculation {
  const fiatAmount = cryptoAmount * exchangeRate;  // 0.02184046 * 88906 = 1941.87
  const fee = fiatAmount * feePercentage;          // 1941.87 * 0.015 = 29.13
  const totalFiat = fiatAmount + fee;              // 1941.87 + 29.13 = 1971.00

  return {
    amount: cryptoAmount,     // 0.02184046 BTC
    rate: exchangeRate,       // 88906.00 EUR/BTC
    fiatAmount,               // 1941.87 EUR
    fee,                      // 29.13 EUR
    feePercentage,            // 0.015 (1.5%)
    totalFiat                 // 1971.00 EUR
  };
}
```

---

## 4️⃣ **PayIn Details - Отображение курса**

### API Response
```typescript
// GET /api/admin/pay-in/[id]
{
  success: true,
  data: {
    id: "...",
    order: {
      id: "cmhv0ym8q0022jnhq07skmbw0",
      cryptoAmount: 0.02184046,
      rate: 88906.00,              // ← Exchange Rate отображается отсюда
      fiatAmount: 1941.87,
      feePercent: 1.5,
      feeAmount: 29.13,
      totalFiat: 1971.00,
      // ...
    }
  }
}
```

### Frontend Display
```tsx
// src/app/(admin)/admin/pay-in/[id]/_components/PayInOverviewTab.tsx
<div>
  <label>Exchange Rate</label>
  <p>{payIn.order.rate.toFixed(2)}</p>
  {/* Отображается: 88906.00 */}
</div>
```

---

## 🔍 **Важные особенности**

### 1. Курс "замораживается" при создании заказа
✅ **Курс НЕ меняется** после создания Order  
✅ Клиент платит **точную сумму** как при создании  
✅ Защита от волатильности для клиента и платформы

```sql
-- Order.rate хранит исторический курс
SELECT 
  id,
  rate,           -- 88906.00 (курс на момент создания)
  createdAt,      -- 2025-01-15 10:00:00
  totalFiat       -- 1971.00 EUR
FROM Order
WHERE id = 'cmhv0ym8q0022jnhq07skmbw0';
```

### 2. Redis кеширование (30 секунд)
✅ Снижение нагрузки на Rate Provider API  
✅ Быстрый отклик для пользователей  
✅ TTL = 30 секунд (баланс между актуальностью и производительностью)

```typescript
// Cache key format
const cacheKey = `rate:${crypto}:${fiat}`; // "rate:BTC:EUR"
const ttl = 30; // seconds
```

### 3. Manual Override приоритетнее
```
Priority:
1. Manual Rate (admin установил) → HIGHEST PRIORITY
2. CoinGecko/Kraken (market rate) → FALLBACK
```

### 4. Audit Trail
Все изменения курсов логируются:
```typescript
// Таблица RateHistory
{
  cryptoCode: "BTC",
  fiatCode: "EUR",
  rate: 88906.00,
  source: "coingecko", // или "kraken", "manual"
  createdAt: "2025-01-15T10:00:00Z"
}
```

---

## 📈 **Пример: BTC/EUR = 88906.00**

### Сценарий создания Order

```typescript
// 1. Пользователь хочет купить 0.02184046 BTC
const cryptoAmount = 0.02184046;

// 2. Система получает текущий курс
const rate = await rateManagementService.getCurrentRate('BTC', 'EUR');
// rate = 88906.00 EUR/BTC

// 3. Расчет суммы
const fiatAmount = 0.02184046 * 88906.00 = 1941.87 EUR
const fee = 1941.87 * 0.015 = 29.13 EUR
const totalFiat = 1941.87 + 29.13 = 1971.00 EUR

// 4. Заказ создается с курсом 88906.00
// Даже если через 5 минут курс станет 90000.00,
// клиент заплатит 1971.00 EUR (как было рассчитано)
```

---

## 🔧 **Конфигурация**

### Rate Providers (выбор в админке)
```typescript
// Доступные провайдеры:
const RATE_PROVIDERS = [
  {
    service: 'coingecko',
    name: 'CoinGecko',
    free: true,
    rateLimit: '50 calls/min'
  },
  {
    service: 'kraken',
    name: 'Kraken',
    free: true,
    rateLimit: 'Unlimited (public API)'
  }
];
```

### Platform Config
```typescript
// src/lib/constants.ts
export const PLATFORM_CONFIG = {
  FEE_PERCENTAGE: 0.015,        // 1.5% комиссия платформы
  MIN_ORDER_VALUE_EUR: 50,      // Минимум 50 EUR
  MAX_ORDER_VALUE_EUR: 50000,   // Максимум 50,000 EUR
};
```

---

## 🎯 **Заключение**

**Exchange Rate (88906.00)** формируется так:

1. ✅ **Источник**: CoinGecko или Kraken API (market rate)
2. ✅ **Кеширование**: Redis (30 секунд) для производительности
3. ✅ **Override**: Manual Rate (если админ установил вручную)
4. ✅ **Сохранение**: В Order.rate при создании заказа
5. ✅ **Заморозка**: Курс НЕ меняется после создания
6. ✅ **Отображение**: На фронте в PayIn Details

**Преимущества системы:**
- 🔒 Защита от волатильности
- ⚡ Высокая производительность (Redis)
- 🎛️ Гибкость (Manual Override)
- 📊 Полная прозрачность
- 📜 Audit trail

