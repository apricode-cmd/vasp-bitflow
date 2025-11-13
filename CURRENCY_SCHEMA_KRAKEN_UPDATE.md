# 🔄 Currency Schema Update - добавление Kraken Support

## 📊 Текущая Структура

### Currency Model (Prisma Schema)

```prisma
model Currency {
  code               String    @id
  name               String
  symbol             String
  decimals           Int       @default(8)
  precision          Int       @default(8)
  coingeckoId        String    // ✅ Для CoinGecko API
  isActive           Boolean   @default(true)
  priority           Int       @default(0)
  isToken            Boolean   @default(false)
  iconUrl            String?
  minOrderAmount     Float     @default(0.001)
  maxOrderAmount     Float     @default(100)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  // ... relations
}
```

### Как работает CoinGecko:

1. В БД хранятся токены с `coingeckoId`:
   ```sql
   INSERT INTO "Currency" (code, name, symbol, coingeckoId)
   VALUES 
     ('BTC', 'Bitcoin', '₿', 'bitcoin'),
     ('ETH', 'Ethereum', 'Ξ', 'ethereum'),
     ('USDT', 'Tether', '₮', 'tether'),
     ('SOL', 'Solana', '◎', 'solana');
   ```

2. CoinGecko Service читает из БД:
   ```typescript
   const currencies = await prisma.currency.findMany({
     where: { 
       isActive: true,
       coingeckoId: { not: '' }  // Только токены с CoinGecko ID
     },
     select: {
       code: true,
       coingeckoId: true,  // 🔑 Ключевое поле!
       symbol: true
     }
   });
   
   // Строит запрос к API
   const coinIds = currencies.map(c => c.coingeckoId).join(',');
   // → "bitcoin,ethereum,tether,solana"
   
   // GET /simple/price?ids=bitcoin,ethereum,tether,solana&vs_currencies=eur,pln
   ```

3. Маппит ответ обратно на наши коды:
   ```typescript
   for (const currency of currencies) {
     const coinData = data[currency.coingeckoId];  // data['bitcoin']
     
     rates[currency.code] = {  // rates['BTC']
       EUR: coinData.eur,
       PLN: coinData.pln
     };
   }
   ```

---

## 🎯 Проблема с Kraken

Kraken использует **другую систему обозначений** для пар:

| Наш код | CoinGecko ID | Kraken Pair | Проблема |
|---------|--------------|-------------|----------|
| BTC     | bitcoin      | **XBTZ**    | Разные префиксы |
| ETH     | ethereum     | **XETHZ**   | + Z префикс |
| SOL     | solana       | **SOL**     | Одинаково |
| USDT    | tether       | **USDTZ**   | + Z префикс |

**Kraken notation:**
- Крупные валюты: `X` префикс (Bitcoin → **XBTZ**, Ethereum → **XETHZ**)
- Фиат: `Z` префикс (EUR → **ZEUR**, USD → **ZUSD**)
- **Полная пара:** `XXBTZEUR` (BTC/EUR), `XETHZUSD` (ETH/USD)

---

## ✅ Решение 1: Добавить `krakenPairId` в Currency (РЕКОМЕНДУЕТСЯ)

### Преимущества:
- ✅ Консистентно с `coingeckoId`
- ✅ Легко масштабируется на другие биржи
- ✅ Админ может управлять через UI
- ✅ Динамическое чтение из БД
- ✅ Нет хардкода в коде

### Обновление Schema:

```prisma
model Currency {
  code               String    @id
  name               String
  symbol             String
  decimals           Int       @default(8)
  precision          Int       @default(8)
  coingeckoId        String    // Для CoinGecko
  krakenAssetCode    String?   // 🆕 Для Kraken (XBTZ, XETHZ, SOL, USDTZ)
  isActive           Boolean   @default(true)
  priority           Int       @default(0)
  // ... остальное
}
```

### Migration SQL:

```sql
-- Add Kraken asset code column
ALTER TABLE "Currency" 
ADD COLUMN "krakenAssetCode" TEXT;

-- Update existing currencies with Kraken codes
UPDATE "Currency" SET "krakenAssetCode" = 'XBTZ' WHERE code = 'BTC';
UPDATE "Currency" SET "krakenAssetCode" = 'XETHZ' WHERE code = 'ETH';
UPDATE "Currency" SET "krakenAssetCode" = 'SOL' WHERE code = 'SOL';
UPDATE "Currency" SET "krakenAssetCode" = 'USDTZ' WHERE code = 'USDT';

-- Create index for performance
CREATE INDEX "Currency_krakenAssetCode_idx" ON "Currency"("krakenAssetCode");
```

### Обновленный KrakenAdapter:

```typescript
export class KrakenAdapter implements IRatesProvider {
  // ... existing code ...

  /**
   * Get all supported rates at once (DYNAMIC from DB)
   */
  async getCurrentRates(forceRefresh = false): Promise<ExchangeRates> {
    // Check cache...
    
    try {
      console.log('🔄 [Kraken] Fetching fresh rates...');

      // ✅ Get active currencies from database dynamically
      const currencies = await prisma.currency.findMany({
        where: { 
          isActive: true,
          krakenAssetCode: { not: null }  // Only currencies with Kraken code
        },
        select: {
          code: true,           // Our code (BTC, ETH, etc.)
          krakenAssetCode: true, // Kraken notation (XBTZ, XETHZ, etc.)
          symbol: true
        }
      });

      if (currencies.length === 0) {
        throw new Error('No active currencies with Kraken asset code found in database');
      }

      console.log('💰 Fetching rates for currencies:', 
        currencies.map(c => `${c.code} (${c.krakenAssetCode})`).join(', '));

      // Get supported fiat currencies
      const fiatCurrencies = await prisma.fiatCurrency.findMany({
        where: { isActive: true },
        select: { code: true }
      });

      // Build all pairs dynamically
      const pairs: string[] = [];
      const pairMapping: Map<string, { crypto: string; fiat: string }> = new Map();

      for (const crypto of currencies) {
        for (const fiat of fiatCurrencies) {
          const krakenPair = this.buildKrakenPair(
            crypto.krakenAssetCode!, 
            fiat.code
          );
          
          pairs.push(krakenPair);
          pairMapping.set(krakenPair, {
            crypto: crypto.code,
            fiat: fiat.code
          });
        }
      }

      // Fetch from Kraken API
      const allPairs = pairs.join(',');
      const response = await this.client!.get<KrakenTickerResponse>('/0/public/Ticker', {
        params: { pair: allPairs }
      });

      // Check for errors...

      // Transform response to our format
      const rates: ExchangeRates = {};
      let pairsProcessed = 0;

      for (const [krakenPair, ticker] of Object.entries(response.data.result)) {
        const mapping = pairMapping.get(krakenPair);
        
        if (mapping && ticker) {
          const { crypto, fiat } = mapping;
          
          if (!rates[crypto]) {
            rates[crypto] = {};
          }
          
          rates[crypto][fiat] = parseFloat(ticker.c[0]); // Last trade price
          pairsProcessed++;
        }
      }

      // Cache result
      this.ratesCache = {
        data: rates,
        timestamp: Date.now()
      };

      console.log(`✅ [Kraken] Fetched ${pairsProcessed} rates for ${Object.keys(rates).length} currencies`);

      return rates;
    } catch (error: any) {
      // Error handling...
    }
  }

  /**
   * Build Kraken pair notation from asset codes
   * 
   * @param cryptoAssetCode Kraken crypto code (XBTZ, XETHZ, SOL, USDTZ)
   * @param fiatCode Our fiat code (EUR, USD, PLN)
   * @returns Kraken pair notation (XXBTZEUR, XETHZUSD, SOLPLN, etc.)
   */
  private buildKrakenPair(cryptoAssetCode: string, fiatCode: string): string {
    // Kraken fiat notation
    const fiatMapping: Record<string, string> = {
      'EUR': 'ZEUR',
      'USD': 'ZUSD',
      'PLN': 'PLN'  // PLN doesn't have Z prefix
    };

    const krakenFiat = fiatMapping[fiatCode] || fiatCode;
    
    // Build pair: crypto + fiat
    // Examples: XXBTZEUR, XETHZUSD, SOLPLN, USDTZEUR
    return `X${cryptoAssetCode}${krakenFiat}`;
  }
}
```

---

## ✅ Решение 2: Hardcoded mapping (ТЕКУЩИЙ ВАРИАНТ)

Это уже реализовано в `KrakenAdapter.ts`:

```typescript
private readonly pairMapping: Record<string, string> = {
  'BTC-EUR': 'XXBTZEUR',
  'BTC-USD': 'XXBTZUSD',
  'ETH-EUR': 'XETHZEUR',
  // ...
};
```

### Недостатки:
- ❌ Хардкод в коде
- ❌ Нужно обновлять код для новых токенов
- ❌ Не масштабируется
- ❌ Админ не может управлять через UI

---

## 🎯 Рекомендация

**Использовать Решение 1** (добавить `krakenAssetCode` в Currency):

### Преимущества:
1. **Консистентность:** по аналогии с `coingeckoId`
2. **Масштабируемость:** легко добавить новые биржи (`binanceSymbol`, `coinbaseAsset`, etc.)
3. **Гибкость:** админ управляет через UI
4. **DRY principle:** нет дублирования данных
5. **Типобезопасность:** TypeScript + Prisma

### Будущая архитектура (для нескольких бирж):

```prisma
model Currency {
  code               String    @id
  name               String
  symbol             String
  
  // Rate provider asset codes
  coingeckoId        String?   // CoinGecko
  krakenAssetCode    String?   // Kraken
  binanceSymbol      String?   // Binance
  coinbaseAsset      String?   // Coinbase Pro
  
  // ... остальное
}
```

Каждый rate provider читает свое поле из БД динамически! 🎯

---

## 📝 Implementation Steps

1. **Update Prisma Schema** (add `krakenAssetCode`)
2. **Create Migration SQL** (add column, update values)
3. **Update KrakenAdapter** (read from DB instead of hardcoded map)
4. **Update Seed Script** (include krakenAssetCode)
5. **Update Admin UI** (allow editing krakenAssetCode)
6. **Test with all providers** (CoinGecko + Kraken)

---

**Хочешь, я реализую Решение 1?** 🚀

