# 💰 Cryptocurrency Icons

## 📂 Структура папки

Эта папка содержит иконки криптовалют для отображения в UI.

## 📝 Naming Convention

Имя файла должно совпадать с **currency code** из базы данных:

```
BTC.svg    → Bitcoin
ETH.svg    → Ethereum
USDT.svg   → Tether
SOL.svg    → Solana
USDC.svg   → USD Coin
```

## 🎨 Формат иконок

**Рекомендуемый формат:** SVG
- ✅ Масштабируется без потери качества
- ✅ Маленький размер файла
- ✅ Поддержка цветов

**Альтернативные форматы:** PNG (512x512px минимум)

## 📊 Текущие криптовалюты в БД

```sql
SELECT code, name, iconUrl FROM "Currency" WHERE "isActive" = true;
```

**Нужны иконки для:**
- BTC (Bitcoin)
- ETH (Ethereum)
- USDT (Tether)
- SOL (Solana)

## 🔗 Как обновить iconUrl в базе

### Вариант 1: SQL Update (быстро)
```sql
UPDATE "Currency" SET "iconUrl" = '/uploads/currencies/BTC.svg' WHERE code = 'BTC';
UPDATE "Currency" SET "iconUrl" = '/uploads/currencies/ETH.svg' WHERE code = 'ETH';
UPDATE "Currency" SET "iconUrl" = '/uploads/currencies/USDT.svg' WHERE code = 'USDT';
UPDATE "Currency" SET "iconUrl" = '/uploads/currencies/SOL.svg' WHERE code = 'SOL';
```

### Вариант 2: Prisma Script
```typescript
// scripts/update-currency-icons.ts
import { prisma } from '@/lib/prisma';

const currencies = [
  { code: 'BTC', icon: '/uploads/currencies/BTC.svg' },
  { code: 'ETH', icon: '/uploads/currencies/ETH.svg' },
  { code: 'USDT', icon: '/uploads/currencies/USDT.svg' },
  { code: 'SOL', icon: '/uploads/currencies/SOL.svg' },
];

async function updateIcons() {
  for (const currency of currencies) {
    await prisma.currency.update({
      where: { code: currency.code },
      data: { iconUrl: currency.icon }
    });
    console.log(`✅ Updated ${currency.code}`);
  }
}

updateIcons();
```

### Вариант 3: Admin Panel (будущее)
UI в `/admin/config/currencies` для upload иконок

## 🌐 Где скачать иконки

### Бесплатные источники:
1. **CryptoIcons** - https://cryptoicons.co
   - 800+ SVG иконок
   - Free & Open Source
   
2. **Cryptocurrency Icons** - https://github.com/spothq/cryptocurrency-icons
   - 900+ криптовалют
   - Multiple sizes
   
3. **CoinGecko API** - https://www.coingecko.com/api/documentation
   - Динамические иконки
   - API endpoint: `/api/v3/coins/{id}`

### Премиум:
- **FlatIcon** - https://www.flaticon.com/search?word=cryptocurrency
- **IconFinder** - https://www.iconfinder.com/search?q=crypto

## 📦 Рекомендуемый размер

- **SVG**: Любой (векторный)
- **PNG**: 512x512px (для Retina displays)
- **File size**: < 50KB per icon

## 🎯 Пример использования в коде

```typescript
// В компоненте
<img 
  src={currency.iconUrl || '/uploads/currencies/default.svg'} 
  alt={currency.name}
  className="w-8 h-8"
/>
```

## 📝 TODO

- [ ] Загрузить иконки BTC, ETH, USDT, SOL
- [ ] Обновить iconUrl в базе
- [ ] Добавить default.svg (fallback)
- [ ] Создать admin UI для upload

