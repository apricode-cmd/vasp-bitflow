# 🔧 План Исправления Системы Интеграций

## Приоритет: ВЫСОКИЙ ⚡
## Дата: 2025-01-26

---

## 📋 Краткое Резюме Проблем

1. **Resend работает, но через ENV** - ключ в БД поврежден, работает fallback
2. **Sumsub работает через config** - специальная логика, но статус был inactive
3. **Двойное шифрование** - частично исправлено, нужна полная очистка
4. **Множественные источники** - ENV + DB + config = путаница

---

## 🎯 Решение: Database-First Подход

### Принцип:
**Один источник правды** - все ключи только в БД, зашифрованы, без fallback на ENV.

---

## 📝 Пошаговый План

### ✅ ШАГ 1: Защита от Двойного Шифрования (ГОТОВО)

**Что сделано:**
- ✅ Добавлена проверка в `integration-management.service.ts`
- ✅ Удалены все поврежденные ключи из БД
- ✅ Улучшена логика статуса для многопараметровых интеграций

**Файлы:**
- `src/lib/services/integration-management.service.ts`

---

### 🔄 ШАГ 2: Стандартизация Хранения Ключей

#### 2.1. Определить Типы Интеграций

**Тип A: Простые (1 ключ)**
- Resend, CoinGecko, Tatum, KYCAID
- Хранение: `Integration.apiKey` (зашифрован)
- Config: только дополнительные параметры

**Тип B: Сложные (несколько ключей)**
- Sumsub (appToken + secretKey + levelName)
- Хранение: `Integration.config` (весь JSON зашифрован)
- apiKey: null

#### 2.2. Создать Утилиты

**Файл:** `src/lib/services/integration-storage.service.ts`

```typescript
/**
 * Сохранить простую интеграцию (1 ключ)
 */
export async function saveSimpleIntegration(
  service: string,
  apiKey: string,
  additionalConfig?: Record<string, any>
): Promise<Integration> {
  const encrypted = encrypt(apiKey);
  
  return await prisma.integration.upsert({
    where: { service },
    update: {
      apiKey: encrypted,
      config: additionalConfig || {},
      status: 'active',
      updatedAt: new Date()
    },
    create: {
      service,
      isEnabled: true,
      apiKey: encrypted,
      config: additionalConfig || {},
      status: 'active'
    }
  });
}

/**
 * Сохранить сложную интеграцию (несколько ключей)
 */
export async function saveComplexIntegration(
  service: string,
  config: Record<string, any>
): Promise<Integration> {
  const encryptedConfig = encryptObject(config);
  
  return await prisma.integration.upsert({
    where: { service },
    update: {
      apiKey: null,  // Не используется
      config: { encrypted: encryptedConfig },
      status: 'active',
      updatedAt: new Date()
    },
    create: {
      service,
      isEnabled: true,
      apiKey: null,
      config: { encrypted: encryptedConfig },
      status: 'active'
    }
  });
}

/**
 * Загрузить интеграцию с расшифровкой
 */
export async function loadIntegration(
  service: string
): Promise<{ apiKey?: string; config: Record<string, any> }> {
  const integration = await prisma.integration.findUnique({
    where: { service }
  });
  
  if (!integration) {
    throw new Error(`Integration ${service} not found`);
  }
  
  // Простая интеграция
  if (integration.apiKey) {
    const apiKey = decrypt(integration.apiKey);
    const config = integration.config as Record<string, any> || {};
    return { apiKey, config };
  }
  
  // Сложная интеграция
  const configData = integration.config as any;
  if (configData?.encrypted) {
    const config = decryptObject(configData.encrypted);
    return { config };
  }
  
  // Старый формат (config не зашифрован)
  return { config: integration.config as Record<string, any> || {} };
}
```

#### 2.3. Обновить IntegrationFactory

**Файл:** `src/lib/integrations/IntegrationFactory.ts`

```typescript
async getProviderByService(service: string): Promise<IIntegrationProvider | null> {
  // Check cache
  if (this.initializedProviders.has(service)) {
    return this.initializedProviders.get(service)!;
  }

  const provider = integrationRegistry.getProvider(service);
  if (!provider) {
    return null;
  }

  // ✅ Использовать новый сервис
  const { apiKey, config } = await loadIntegration(service);
  
  const fullConfig: BaseIntegrationConfig = {
    apiKey,
    apiEndpoint: config.apiEndpoint,
    webhookSecret: config.webhookSecret,
    ...config
  };

  await this.initializeProvider(provider, fullConfig);
  this.initializedProviders.set(service, provider);

  return provider;
}
```

---

### 🗑️ ШАГ 3: Удалить Fallback на ENV

#### 3.1. Удалить из config.ts

**Файл:** `src/lib/config.ts`

```typescript
// ❌ Удалить:
kycaid: {
  apiKey: process.env.KYCAID_API_KEY!,
  formId: process.env.KYCAID_FORM_ID!,
  webhookSecret: process.env.KYCAID_WEBHOOK_SECRET!,
  baseUrl: process.env.KYCAID_BASE_URL!
},

coingecko: {
  apiUrl: process.env.COINGECKO_API_URL!
},

email: {
  apiKey: process.env.RESEND_API_KEY!,
  from: process.env.EMAIL_FROM!
},

// ✅ Оставить только:
app: {
  url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
},

admin: {
  email: process.env.ADMIN_EMAIL!,
  password: process.env.ADMIN_PASSWORD!
},

platform: {
  fee: parseFloat(process.env.PLATFORM_FEE || '0.015')
}
```

#### 3.2. Удалить из kycaid.ts

**Файл:** `src/lib/services/kycaid.ts`

```typescript
// ❌ Удалить fallback:
} else {
  // Fallback to env variables
  this.config = {
    baseUrl: config.kycaid.baseUrl,
    apiKey: config.kycaid.apiKey,
    formId: config.kycaid.formId,
    webhookSecret: config.kycaid.webhookSecret
  };
  console.log('⚠️ Using KYCAID config from env/fallback');
}

// ✅ Заменить на:
} else {
  throw new Error('KYCAID integration not configured in database');
}
```

#### 3.3. Удалить из .env

**Файл:** `.env`, `.env.local`

```bash
# ❌ Удалить (будут в БД):
RESEND_API_KEY="..."
KYCAID_API_KEY="..."
KYCAID_FORM_ID="..."
KYCAID_WEBHOOK_SECRET="..."
KYCAID_BASE_URL="..."
COINGECKO_API_URL="..."

# ✅ Оставить только:
DATABASE_URL="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="..."
ENCRYPTION_SECRET="..."  # ⚠️ ВАЖНО!
ADMIN_EMAIL="..."
ADMIN_PASSWORD="..."
PLATFORM_FEE="0.015"
```

---

### 🎨 ШАГ 4: Улучшить UI

#### 4.1. Не Отправлять Замаскированные Ключи

**Файл:** `src/app/(admin)/admin/integrations/page.tsx`

```typescript
const handleSave = async (service: string) => {
  setSaving(true);
  try {
    const integration = integrations[service];
    
    // ✅ Отправлять только changed fields
    const updates: any = {};
    
    // Проверяем apiKey
    if (integration.apiKey && !isMasked(integration.apiKey)) {
      updates.apiKey = integration.apiKey;
    }
    
    // Проверяем config
    if (integration.config) {
      const cleanConfig = { ...integration.config };
      // Удаляем замаскированные ключи из config
      Object.keys(cleanConfig).forEach(key => {
        if (typeof cleanConfig[key] === 'string' && isMasked(cleanConfig[key])) {
          delete cleanConfig[key];
        }
      });
      if (Object.keys(cleanConfig).length > 0) {
        updates.config = cleanConfig;
      }
    }
    
    // Другие поля
    if (integration.apiEndpoint) updates.apiEndpoint = integration.apiEndpoint;
    if (integration.isEnabled !== undefined) updates.isEnabled = integration.isEnabled;
    
    const response = await fetch('/api/admin/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service, updates })
    });
    
    // ... rest
  }
};

// Утилита для проверки маски
function isMasked(value: string): boolean {
  return value.includes('•') || 
         value.includes('*') || 
         value.includes('xxxx') ||
         /[^\x00-\x7F]/.test(value);
}
```

#### 4.2. Специальная Форма для Sumsub

**Уже есть** - работает правильно, сохраняет в `config`.

---

### 🧪 ШАГ 5: Тестирование

#### 5.1. Пересохранить Все Ключи

**Через UI `/admin/integrations`:**

1. **Resend:**
   - API Key: `re_8AChNGre_7Ho83xrY2zF36xMT3214qtvF`
   - From Email: `onboarding@resend.dev`
   - Проверка: отправить тестовое письмо

2. **Sumsub:**
   - App Token: `sbx:...` (уже сохранен)
   - Secret Key: `...` (уже сохранен)
   - Level Name: `id-and-liveness`
   - Проверка: тест соединения

3. **CoinGecko:**
   - API Key: (если нужен)
   - Проверка: получить курсы

4. **Tatum:**
   - API Key: (если используется)
   - Проверка: синхронизация кошельков

#### 5.2. Проверить Загрузку

```bash
npx tsx -e "
import { integrationFactory } from './src/lib/integrations/IntegrationFactory';

async function test() {
  const resend = await integrationFactory.getProviderByService('resend');
  console.log('Resend:', resend?.getConfig());
  
  const sumsub = await integrationFactory.getProviderByService('sumsub');
  console.log('Sumsub:', sumsub?.getConfig());
}

test();
"
```

#### 5.3. Проверить Работу

- ✅ Отправка email через Resend
- ✅ KYC верификация через Sumsub
- ✅ Получение курсов через CoinGecko
- ✅ Синхронизация кошельков через Tatum

---

### 📚 ШАГ 6: Документация

#### 6.1. Обновить INTEGRATION_SECURITY.md

- Добавить новый подход (Database-First)
- Удалить упоминания ENV переменных
- Добавить примеры для простых и сложных интеграций

#### 6.2. Создать INTEGRATION_GUIDE.md

- Как добавить новую интеграцию
- Как правильно хранить ключи
- Troubleshooting guide

#### 6.3. Обновить README.md

- Удалить ENV переменные для интеграций
- Указать что все настраивается через UI

---

## 🚀 Порядок Выполнения

### Сегодня (Критично):
1. ✅ Пересохранить Resend ключ
2. ✅ Проверить что все работает
3. ⏳ Создать `integration-storage.service.ts`
4. ⏳ Обновить `IntegrationFactory`

### Завтра:
5. ⏳ Удалить fallback на ENV
6. ⏳ Улучшить UI (не отправлять маски)
7. ⏳ Полное тестирование

### На этой неделе:
8. ⏳ Обновить документацию
9. ⏳ Code review
10. ⏳ Deploy на staging

---

## ✅ Критерии Успеха

1. **Все интеграции работают** - email, KYC, rates, blockchain
2. **Нет ENV переменных** - все ключи только в БД
3. **Нет двойного шифрования** - все ключи правильно зашифрованы
4. **Единый подход** - все интеграции работают одинаково
5. **Хорошая документация** - понятно как добавлять новые интеграции

---

## 🔍 Проверочный Список

- [ ] Resend работает без ENV
- [ ] Sumsub работает корректно
- [ ] CoinGecko работает без ENV
- [ ] Tatum работает (если используется)
- [ ] Нет ошибок расшифровки в логах
- [ ] UI не отправляет замаскированные ключи
- [ ] Документация обновлена
- [ ] Тесты пройдены

---

## 📞 Контакты

**Вопросы:** Обсудить с командой
**Проблемы:** Создать issue в репозитории
**Документация:** См. INTEGRATION_KEYS_ANALYSIS.md

