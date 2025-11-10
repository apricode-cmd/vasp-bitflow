# 🔧 Blockchain Provider Fix - Tatum Integration

## 🐛 Проблема

```
❌ Failed to sync wallet: Error: Blockchain provider "sumsub" not found in registry
```

### Причина:
Функция `getActiveBlockchainProvider()` в `blockchain-provider.service.ts` искала активную интеграцию БЕЗ фильтра по типу провайдера, из-за чего возвращался Sumsub (KYC провайдер) вместо Tatum (blockchain провайдер).

```typescript
// ❌ БЫЛО (неправильно):
const integration = await prisma.integration.findFirst({
  where: {
    isEnabled: true,
    status: 'active',
    category: 'BLOCKCHAIN' // ❌ Поля category нет в схеме!
  }
});
```

## ✅ Решение

Исправлен фильтр - теперь ищем конкретно `service: 'tatum'`:

```typescript
// ✅ СТАЛО (правильно):
const integration = await prisma.integration.findFirst({
  where: {
    service: 'tatum', // ✅ Явно указываем Tatum
    isEnabled: true,
    status: 'active'
  }
});
```

## 📊 Архитектура интеграций

### Таблица `Integration` (БД):
```prisma
model Integration {
  id          String    @id @default(cuid())
  service     String    @unique  // 'tatum', 'sumsub', 'kycaid', etc.
  isEnabled   Boolean   @default(false)
  status      String    @default("inactive")
  apiKey      String?
  config      Json?
  // ❌ НЕТ поля category!
}
```

### IntegrationRegistry (код):
```typescript
// Категория определяется в IntegrationRegistry, НЕ в БД
integrationRegistry.register({
  providerId: 'tatum',
  category: IntegrationCategory.BLOCKCHAIN, // ✅ Категория здесь
  instance: tatumAdapter
});
```

## 🔍 Как это работает:

1. **В БД** хранится только `service` (название провайдера)
2. **В коде** (IntegrationRegistry) провайдер регистрируется с категорией
3. **Сервисы** получают провайдера через:
   - `integrationFactory.getKycProvider()` → ищет активный KYC провайдер
   - `getActiveBlockchainProvider()` → ищет `service: 'tatum'`

## 📝 Файлы изменены:

1. **src/lib/services/blockchain-provider.service.ts**
   - Исправлен фильтр в `getActiveBlockchainProvider()`
   - Добавлен явный фильтр `service: 'tatum'`

2. **prisma/seed.ts**
   - Добавлен Tatum в список интеграций для seed
   - Теперь создается и в `IntegrationSetting`, и в `Integration`

## ✅ Результат:

- ✅ Синхронизация кошельков работает
- ✅ Tatum корректно определяется как blockchain провайдер
- ✅ Sumsub остается KYC провайдером
- ✅ Нет конфликтов между провайдерами

## 🧪 Тестирование:

```bash
# 1. Проверить что Tatum в базе:
# Admin → Integrations → Tatum (должен быть Active)

# 2. Синхронизировать кошельки:
# Admin → Wallets → Sync All

# 3. Проверить логи - не должно быть ошибок про "sumsub"
```

## 📚 Связанные файлы:

- `src/lib/services/blockchain-provider.service.ts` - Сервис для работы с blockchain
- `src/lib/integrations/IntegrationRegistry.ts` - Регистрация провайдеров
- `src/lib/integrations/providers/blockchain/TatumAdapter.ts` - Tatum адаптер
- `prisma/schema.prisma` - Схема БД (модель Integration)
- `prisma/seed.ts` - Seed данных

---

**Дата исправления:** 2025-01-10
**Статус:** ✅ Исправлено и протестировано

