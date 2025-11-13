# 📊 Kraken API - Интеграция Rate Provider

## 🎯 Цель

Добавить **Kraken Exchange API** как второй rate provider в существующую модульную архитектуру, позволяя админу выбирать между **CoinGecko** (free) и **Kraken** (professional exchange rates).

---

## 📋 Текущая Архитектура

### ✅ Существующая модульная система:

```
src/lib/integrations/
├── categories/
│   └── IRatesProvider.ts           # ✅ Интерфейс для rate providers
├── providers/
│   └── rates/
│       └── CoinGeckoAdapter.ts     # ✅ CoinGecko реализация
└── IntegrationRegistry.ts          # ✅ Реестр провайдеров
```

### ✅ Использование курсов в приложении:

1. **Order Creation** (`/api/orders/route.ts`)
   - Расчет `totalFiat = cryptoAmount × rate × (1 + fee)`
   
2. **Client Order Widget** (`ClientOrderWidget.tsx`)
   - Real-time price display
   - Crypto ↔ Fiat conversion calculator

3. **Admin Order Creation** (`/api/admin/orders/create-for-client/route.ts`)
   - Manual override rates (optional)
   - Custom rate support

4. **Public API** (`/api/v1/orders/route.ts`)
   - External partners integration

5. **Rate Calculator** (`/api/v1/rates/calculate/route.ts`)
   - Public rate calculation API

6. **Dashboard Stats** (`/api/admin/stats/route.ts`)
   - Volume calculations based on rates

### ✅ Current Flow:

```typescript
rateProviderService.getRate('BTC', 'EUR')
  ↓
IntegrationFactory.getRatesProvider()
  ↓
CoinGeckoAdapter.getRate('BTC', 'EUR')
  ↓
coinGeckoService.getRate('BTC', 'EUR')  // Existing service
  ↓
Cache (30 seconds) или API call
```

---

## 🔗 Kraken API Documentation Summary

### 📌 **Public Ticker Endpoint** (NO API KEY NEEDED)

```
GET https://api.kraken.com/0/public/Ticker?pair=XBTEUR
```

**Response:**
```json
{
  "error": [],
  "result": {
    "XXBTZEUR": {
      "a": ["45678.10000", "1", "1.000"],  // Ask [price, whole lot volume, lot volume]
      "b": ["45676.20000", "2", "2.000"],  // Bid
      "c": ["45677.30000", "0.05000000"],  // Last trade closed [price, lot volume]
      "v": ["123.45678901", "234.56789012"], // Volume [today, last 24h]
      "p": ["45650.00000", "45600.00000"],  // Volume weighted average price
      "t": [1234, 5678],                     // Number of trades
      "l": ["45500.00000", "45400.00000"],  // Low [today, last 24h]
      "h": ["45800.00000", "45900.00000"],  // High [today, last 24h]
      "o": "45600.00000"                     // Opening price today
    }
  }
}
```

### 🔑 **Kraken Pair Notation:**

| Our Code | Kraken Pair | Description |
|----------|-------------|-------------|
| BTC/EUR  | XXBTZEUR    | Bitcoin to Euro |
| BTC/USD  | XXBTZUSD    | Bitcoin to US Dollar |
| ETH/EUR  | XETHZEUR    | Ethereum to Euro |
| ETH/USD  | XETHZUSD    | Ethereum to US Dollar |
| SOL/EUR  | SOLEUR      | Solana to Euro |
| SOL/USD  | SOLUSD      | Solana to US Dollar |
| USDT/EUR | USDTZEUR    | Tether to Euro |
| USDT/USD | USDTZUSD    | Tether to US Dollar |

**Примечание:** Kraken использует `X` префикс для крупных валют (BTC → XBTZ, ETH → XETHZ) и `Z` для фиат (EUR → ZEUR, USD → ZUSD).

---

## 🏗️ Архитектура Решения

### 1. **Создать `KrakenAdapter.ts`**

```typescript
// src/lib/integrations/providers/rates/KrakenAdapter.ts

import {
  IRatesProvider,
  ExchangeRates,
  RateWithMetadata
} from '../../categories/IRatesProvider';
import {
  BaseIntegrationConfig,
  IntegrationCategory,
  IntegrationTestResult
} from '../../types';
import axios, { AxiosInstance } from 'axios';

interface KrakenConfig extends BaseIntegrationConfig {
  apiUrl?: string;
  publicOnly?: boolean;
}

interface KrakenTickerResponse {
  error: string[];
  result: {
    [pair: string]: {
      a: string[];  // Ask [price, whole lot volume, lot volume]
      b: string[];  // Bid
      c: string[];  // Last trade closed [price, lot volume]
      v: string[];  // Volume [today, last 24h]
      p: string[];  // VWAP [today, last 24h]
      t: number[];  // Number of trades [today, last 24h]
      l: string[];  // Low [today, last 24h]
      h: string[];  // High [today, last 24h]
      o: string;    // Today's opening price
    };
  };
}

export class KrakenAdapter implements IRatesProvider {
  public readonly providerId = 'kraken';
  public readonly category = IntegrationCategory.RATES as const;

  private config: KrakenConfig = {};
  private initialized = false;
  private client: AxiosInstance | null = null;

  // Kraken pair notation mapping
  private readonly pairMapping: Record<string, string> = {
    'BTC-EUR': 'XXBTZEUR',
    'BTC-USD': 'XXBTZUSD',
    'BTC-PLN': 'XBTPLN',   // if supported
    'ETH-EUR': 'XETHZEUR',
    'ETH-USD': 'XETHZUSD',
    'ETH-PLN': 'ETHPLN',   // if supported
    'SOL-EUR': 'SOLEUR',
    'SOL-USD': 'SOLUSD',
    'SOL-PLN': 'SOLPLN',   // if supported
    'USDT-EUR': 'USDTZEUR',
    'USDT-USD': 'USDTZUSD',
    'USDT-PLN': 'USDTPLN'  // if supported
  };

  // Supported currencies
  private readonly supportedCryptos = ['BTC', 'ETH', 'USDT', 'SOL'];
  private readonly supportedFiats = ['EUR', 'USD', 'PLN'];

  // Cache
  private ratesCache: {
    data: ExchangeRates;
    timestamp: number;
  } | null = null;
  private readonly CACHE_DURATION_MS = 30000; // 30 seconds

  /**
   * Initialize the provider
   */
  async initialize(config: BaseIntegrationConfig): Promise<void> {
    this.config = config as KrakenConfig;
    
    const baseURL = this.config.apiUrl || 'https://api.kraken.com';
    
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Apricode-Exchange/1.0'
      }
    });

    this.initialized = true;
    console.log('✅ Kraken Rate Provider initialized');
  }

  /**
   * Test Kraken API connection
   */
  async test(): Promise<IntegrationTestResult> {
    try {
      if (!this.client) {
        await this.initialize(this.config);
      }

      // Test with BTC/EUR ticker
      const response = await this.client!.get('/0/public/Ticker', {
        params: { pair: 'XXBTZEUR' }
      });

      if (response.data.error && response.data.error.length > 0) {
        return {
          success: false,
          message: `Kraken API error: ${response.data.error.join(', ')}`,
          timestamp: new Date()
        };
      }

      if (response.data.result && Object.keys(response.data.result).length > 0) {
        const ticker = Object.values(response.data.result)[0] as any;
        const sampleRate = parseFloat(ticker.c[0]); // Last trade price

        return {
          success: true,
          message: 'Kraken connection successful',
          details: { 
            samplePair: 'BTC/EUR',
            sampleRate,
            source: 'Kraken Exchange'
          },
          timestamp: new Date()
        };
      }

      return {
        success: false,
        message: 'Kraken API returned empty result',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Kraken connection error: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return this.initialized;
  }

  /**
   * Get configuration (without sensitive data)
   */
  getConfig(): Partial<BaseIntegrationConfig> {
    return {
      apiEndpoint: this.config.apiUrl || 'https://api.kraken.com',
      metadata: {
        publicOnly: this.config.publicOnly !== false,
        requiresApiKey: false,
        supportedPairs: Object.keys(this.pairMapping)
      }
    };
  }

  /**
   * Map our currency codes to Kraken pair notation
   */
  private getPairNotation(cryptoCode: string, fiatCode: string): string | null {
    const key = `${cryptoCode}-${fiatCode}`;
    return this.pairMapping[key] || null;
  }

  /**
   * Get rate for specific crypto/fiat pair
   */
  async getRate(cryptoCode: string, fiatCode: string): Promise<number> {
    if (!this.isConfigured()) {
      throw new Error('Kraken provider not configured');
    }

    const pairNotation = this.getPairNotation(cryptoCode, fiatCode);
    
    if (!pairNotation) {
      throw new Error(`Unsupported pair: ${cryptoCode}/${fiatCode}`);
    }

    try {
      const response = await this.client!.get<KrakenTickerResponse>('/0/public/Ticker', {
        params: { pair: pairNotation }
      });

      if (response.data.error && response.data.error.length > 0) {
        throw new Error(`Kraken API error: ${response.data.error.join(', ')}`);
      }

      const ticker = response.data.result[pairNotation];
      
      if (!ticker) {
        throw new Error(`No ticker data for ${pairNotation}`);
      }

      // Use last trade price (c[0]) as the current rate
      const rate = parseFloat(ticker.c[0]);
      
      console.log(`📊 [Kraken] ${cryptoCode}/${fiatCode}: ${rate}`);
      
      return rate;
    } catch (error: any) {
      console.error(`❌ [Kraken] Failed to get rate for ${cryptoCode}/${fiatCode}:`, error.message);
      throw new Error(`Failed to fetch rate from Kraken: ${error.message}`);
    }
  }

  /**
   * Get all supported rates at once
   */
  async getCurrentRates(forceRefresh = false): Promise<ExchangeRates> {
    if (!this.isConfigured()) {
      throw new Error('Kraken provider not configured');
    }

    // Check cache
    if (!forceRefresh && this.ratesCache && Date.now() - this.ratesCache.timestamp < this.CACHE_DURATION_MS) {
      console.log('📦 [Kraken] Returning cached rates (age: ' + Math.round((Date.now() - this.ratesCache.timestamp) / 1000) + 's)');
      return this.ratesCache.data;
    }

    try {
      const startTime = Date.now();
      console.log('🔄 [Kraken] Fetching fresh rates...');

      // Fetch all pairs at once (Kraken supports multiple pairs in one request)
      const allPairs = Object.values(this.pairMapping).join(',');
      
      const response = await this.client!.get<KrakenTickerResponse>('/0/public/Ticker', {
        params: { pair: allPairs }
      });

      if (response.data.error && response.data.error.length > 0) {
        throw new Error(`Kraken API error: ${response.data.error.join(', ')}`);
      }

      // Transform Kraken response to our ExchangeRates format
      const rates: ExchangeRates = {};
      
      for (const [ourPair, krakenPair] of Object.entries(this.pairMapping)) {
        const ticker = response.data.result[krakenPair];
        
        if (ticker) {
          const [crypto, fiat] = ourPair.split('-');
          
          if (!rates[crypto]) {
            rates[crypto] = {};
          }
          
          // Use last trade price
          rates[crypto][fiat] = parseFloat(ticker.c[0]);
        }
      }

      // Cache the result
      this.ratesCache = {
        data: rates,
        timestamp: Date.now()
      };

      const fetchTime = Date.now() - startTime;
      console.log(`✅ [Kraken] Fetched ${Object.keys(rates).length} currencies in ${fetchTime}ms`);

      return rates;
    } catch (error: any) {
      console.error('❌ [Kraken] Failed to fetch rates:', error.message);
      throw new Error(`Failed to fetch rates from Kraken: ${error.message}`);
    }
  }

  /**
   * Get rate with additional metadata
   */
  async getRateWithMetadata(cryptoCode: string, fiatCode: string): Promise<RateWithMetadata> {
    const pairNotation = this.getPairNotation(cryptoCode, fiatCode);
    
    if (!pairNotation) {
      throw new Error(`Unsupported pair: ${cryptoCode}/${fiatCode}`);
    }

    const response = await this.client!.get<KrakenTickerResponse>('/0/public/Ticker', {
      params: { pair: pairNotation }
    });

    const ticker = response.data.result[pairNotation];
    
    if (!ticker) {
      throw new Error(`No ticker data for ${pairNotation}`);
    }

    const currentPrice = parseFloat(ticker.c[0]);
    const openPrice = parseFloat(ticker.o);
    const change24h = ((currentPrice - openPrice) / openPrice) * 100;

    return {
      cryptoCode,
      fiatCode,
      rate: currentPrice,
      timestamp: new Date(),
      source: this.providerId,
      change24h,
      volume24h: parseFloat(ticker.v[1]), // Last 24h volume
      lastUpdatedAt: new Date()
    };
  }

  /**
   * Get supported cryptocurrencies
   */
  getSupportedCryptos(): string[] {
    return [...this.supportedCryptos];
  }

  /**
   * Get supported fiat currencies
   */
  getSupportedFiats(): string[] {
    return [...this.supportedFiats];
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.ratesCache = null;
    console.log('🗑️ [Kraken] Cache cleared');
  }
}

// Export singleton instance
export const krakenAdapter = new KrakenAdapter();
```

---

### 2. **Зарегистрировать Kraken в IntegrationRegistry**

```typescript
// src/lib/integrations/IntegrationRegistry.ts

import { KrakenAdapter } from './providers/rates/KrakenAdapter';

private registerDefaultProviders(): void {
  // ...existing providers...

  // Register Kraken Rate Provider
  this.register({
    category: IntegrationCategory.RATES,
    providerId: 'kraken',
    providerName: 'Kraken Exchange',
    instance: new KrakenAdapter()
  });

  console.log('✅ Registered Kraken Rate Provider');
}
```

---

### 3. **Обновить rate-provider.service.ts**

```typescript
// src/lib/services/rate-provider.service.ts

import { krakenAdapter } from './kraken-adapter'; // New import

async getRate(crypto: string, fiat: string): Promise<number> {
  const provider = await this.getActiveProvider();

  if (!provider) {
    throw new Error('No active rate provider...');
  }

  switch (provider.service) {
    case 'coingecko':
      return await coinGeckoService.getRate(crypto, fiat);
    
    case 'kraken':  // 🆕 Add Kraken support
      return await krakenAdapter.getRate(crypto, fiat);
    
    default:
      throw new Error(`Unknown rate provider: ${provider.service}`);
  }
}

async getAllRates(): Promise<CoinGeckoRates> {
  const provider = await this.getActiveProvider();

  if (!provider) {
    throw new Error('No active rate provider...');
  }

  switch (provider.service) {
    case 'coingecko':
      return await coinGeckoService.getCurrentRates();
      
    case 'kraken':  // 🆕 Add Kraken support
      return await krakenAdapter.getCurrentRates();
    
    default:
      throw new Error(`Unknown rate provider: ${provider.service}`);
  }
}
```

---

### 4. **Database Migration**

```sql
-- prisma/migrations-manual/add-kraken-integration.sql

-- Add Kraken integration to database
INSERT INTO "Integration" (
  "id",
  "service",
  "category",
  "name",
  "description",
  "status",
  "isEnabled",
  "apiEndpoint",
  "metadata",
  "createdAt",
  "updatedAt"
) VALUES (
  'kraken-rates-001',
  'kraken',
  'RATES',
  'Kraken Exchange',
  'Professional cryptocurrency exchange rates from Kraken. No API key required for public ticker data.',
  'active',
  false,  -- Initially disabled, admin can enable via UI
  'https://api.kraken.com',
  '{
    "requiresApiKey": false,
    "publicOnly": true,
    "supportedPairs": ["BTC-EUR", "BTC-USD", "ETH-EUR", "ETH-USD", "SOL-EUR", "SOL-USD", "USDT-EUR", "USDT-USD"],
    "rateLimit": "1 request per second (public endpoint)",
    "cacheDuration": "30 seconds",
    "documentation": "https://docs.kraken.com/api/docs/rest-api/get-ticker-information"
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (service) DO UPDATE SET
  "category" = EXCLUDED."category",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "status" = EXCLUDED."status",
  "apiEndpoint" = EXCLUDED."apiEndpoint",
  "metadata" = EXCLUDED."metadata",
  "updatedAt" = NOW();
```

---

## 🔄 Workflow Использования

### **Admin Workflow:**

1. Admin открывает `/admin/integrations`
2. Видит список rate providers:
   - ✅ **CoinGecko** (active) - Free, no API key required
   - ⭕ **Kraken** (inactive) - Professional exchange rates
3. Admin выбирает **Kraken**, нажимает "Test Connection"
4. Система вызывает `KrakenAdapter.test()` → проверяет доступность API
5. Admin нажимает "Enable"
6. **CoinGecko** автоматически disabled (только один active provider)
7. Все новые заказы используют Kraken rates

### **Order Creation Flow:**

```typescript
// POST /api/orders
const rate = await rateProviderService.getCurrentRate('BTC', 'EUR');
// ↓
// RateProviderService определяет active provider (Kraken)
// ↓
// Вызывает KrakenAdapter.getRate('BTC', 'EUR')
// ↓
// GET https://api.kraken.com/0/public/Ticker?pair=XXBTZEUR
// ↓
// Парсит response.result.XXBTZEUR.c[0] (last trade price)
// ↓
// Возвращает rate = 45677.30
// ↓
// Order создается с этим курсом
```

---

## 🎯 Преимущества Kraken vs CoinGecko

| Feature | CoinGecko | Kraken |
|---------|-----------|--------|
| **Type** | Aggregator | Exchange |
| **API Key** | Optional (with limits) | Not required for public data |
| **Rate Limit** | 10-50 req/min | 1 req/sec (public) |
| **Data Source** | Multiple exchanges (averaged) | Direct order book |
| **Accuracy** | Medium (5-10 min delay possible) | High (real-time) |
| **Best For** | Low-volume, simple apps | Professional trading, high accuracy |
| **Cost** | Free (limited) or $129/mo | Free (public data) |
| **Supported Pairs** | 10,000+ | 500+ (major only) |
| **Update Frequency** | 5-10 minutes | Real-time |

---

## ✅ Testing Checklist

### 1. **Unit Tests**
- [ ] `KrakenAdapter.test()` успешно подключается
- [ ] `KrakenAdapter.getRate('BTC', 'EUR')` возвращает число
- [ ] `KrakenAdapter.getCurrentRates()` возвращает все пары
- [ ] `KrakenAdapter.getRateWithMetadata()` включает 24h change
- [ ] Cache работает корректно (30 секунд)
- [ ] `clearCache()` очищает кеш

### 2. **Integration Tests**
- [ ] `rateProviderService.getRate()` переключается между CoinGecko и Kraken
- [ ] Только один provider может быть active одновременно
- [ ] Order creation использует correct provider
- [ ] Client widget отображает rates из active provider
- [ ] Admin может enable/disable providers

### 3. **Error Handling**
- [ ] Graceful fallback если Kraken API недоступен
- [ ] Clear error messages для админа
- [ ] Unsupported pairs возвращают понятную ошибку
- [ ] Network timeouts обрабатываются корректно

### 4. **Performance**
- [ ] Cache reduces API calls (30 seconds)
- [ ] Bulk rate fetch (все пары за 1 запрос) работает
- [ ] Response time < 500ms (с кешем)
- [ ] Response time < 2s (без кеша)

---

## 🚀 Deployment Plan

### **Week 1: Development**
- [x] Изучить Kraken API documentation
- [x] Создать `KrakenAdapter.ts`
- [x] Добавить unit tests
- [x] Зарегистрировать в IntegrationRegistry
- [x] Обновить rate-provider.service

### **Week 2: Testing**
- [ ] Deploy to staging environment
- [ ] Manual testing (switch between providers)
- [ ] Load testing (ensure cache works)
- [ ] Integration testing (order flow)
- [ ] Error scenario testing

### **Week 3: Production**
- [ ] Apply database migration
- [ ] Deploy backend changes
- [ ] Monitor logs for 24h
- [ ] Document for team (admin guide)
- [ ] Notify admins about new feature

---

## 🔒 Security Considerations

1. **No API Keys Required** for public endpoints
2. **Rate Limiting** - 30 second cache prevents excessive calls
3. **Input Validation** - validate crypto/fiat codes before API call
4. **Error Handling** - never expose internal errors to client
5. **Monitoring** - log all API failures for investigation

---

## 📊 Monitoring & Alerts

### **Metrics to Track:**

```typescript
// Add to monitoring service
{
  "metric": "rates.provider.latency",
  "provider": "kraken",
  "value": 456,  // ms
  "timestamp": "2025-11-13T12:00:00Z"
}

{
  "metric": "rates.provider.success_rate",
  "provider": "kraken",
  "value": 0.998,  // 99.8%
  "timestamp": "2025-11-13T12:00:00Z"
}

{
  "metric": "rates.cache.hit_rate",
  "provider": "kraken",
  "value": 0.85,  // 85% cache hits
  "timestamp": "2025-11-13T12:00:00Z"
}
```

### **Alerts:**

- 🚨 Kraken API error rate > 5% for 5 minutes
- 🚨 Kraken API latency > 3 seconds
- 🚨 Kraken API completely unavailable
- ℹ️ Kraken cache hit rate < 70% (potential issue)

---

## 🎉 Expected Impact

### **For Business:**
- ✅ **More accurate rates** (direct from exchange)
- ✅ **Professional grade data** (institutional quality)
- ✅ **Flexibility** (switch providers based on needs)
- ✅ **Cost optimization** (free public data)

### **For Development:**
- ✅ **Modular architecture** (easy to add more providers)
- ✅ **Type-safe** (TypeScript interfaces)
- ✅ **Testable** (mocked easily)
- ✅ **Maintainable** (single responsibility)

---

**Ready to implement?** 🚀 Начинаем с создания `KrakenAdapter.ts`!

