# 🔧 Исправление Ключей Интеграций

## Проблема
Обнаружено **двойное шифрование** API ключей в интеграциях:
- Resend
- Sumsub
- CoinGecko
- KYCAID

## Причина
При сохранении через UI отправлялся весь объект интеграции, включая уже зашифрованный ключ, что приводило к повторному шифрованию.

## Решение
1. ✅ Добавлена проверка на двойное шифрование в `integration-management.service.ts`
2. ✅ Все поврежденные ключи удалены из базы
3. ✅ Сервер перезапущен

## Следующие шаги

### 1. Resend (Email)
```
URL: /admin/integrations
API Key: re_8AChNGre_7Ho83xrY2zF36xMT3214qtvF
From Email: onboarding@resend.dev (для тестов)
```

### 2. Sumsub (KYC)
```
URL: /admin/integrations
App Token: sbx:XXXXXXXX или prd:XXXXXXXX
Secret Key: (32 символа)
Level Name: basic-kyc-level
```

### 3. CoinGecko (Rates)
```
URL: /admin/integrations
API Key: (ваш ключ CoinGecko)
```

### 4. KYCAID (если используется)
```
URL: /admin/integrations
API Key: (ваш ключ KYCAID)
```

### 5. Tatum (Blockchain)
**Статус:** ✅ В порядке (ключ не был поврежден)

## Как правильно сохранять ключи

1. Откройте `/admin/integrations`
2. Нажмите **Configure** на нужной интеграции
3. Введите **новый ключ** (не копируйте замаскированный!)
4. Нажмите **Save**
5. Проверьте статус - должен стать **Active**

## Проверка после сохранения

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import { encryptionService } from './src/lib/services/encryption.service';
const prisma = new PrismaClient();

async function check() {
  const resend = await prisma.integration.findUnique({ where: { service: 'resend' } });
  if (resend?.apiKey) {
    const decrypted = encryptionService.decrypt(resend.apiKey);
    console.log('Resend:', decrypted.startsWith('re_') ? '✅ OK' : '❌ ERROR');
  }
  await prisma.\$disconnect();
}
check();
"
```

## Архитектура модульной системы

### Поток данных:
```
UI (admin/integrations) 
  → API (/api/admin/integrations)
    → integration-management.service.ts
      → encryption.service.ts (encrypt)
        → Database (Integration table)
          → IntegrationFactory (decrypt)
            → Provider (ResendAdapter, SumsubAdapter, etc.)
```

### Ключевые файлы:
- `src/lib/services/integration-management.service.ts` - Логика сохранения
- `src/lib/services/encryption.service.ts` - Шифрование/расшифровка
- `src/lib/integrations/IntegrationFactory.ts` - Загрузка и инициализация
- `src/app/(admin)/admin/integrations/page.tsx` - UI

### Защита от двойного шифрования:
```typescript
// Теперь проверяем перед шифрованием:
const isAlreadyEncrypted = 
  updates.apiKey.startsWith('encrypted:') || 
  updates.apiKey.startsWith('plain:');

if (isAlreadyEncrypted) {
  console.warn('⚠️ Attempting to encrypt already encrypted key - skipping');
  // Keep existing key
} else {
  updateData.apiKey = encrypt(updates.apiKey);
}
```

---

**Дата исправления:** 2025-01-26
**Статус:** ✅ Исправлено, требуется ввод новых ключей

