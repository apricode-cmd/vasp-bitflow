# Integration Storage Standard

## 🎯 Цель документа

Определить единый стандарт хранения интеграций для всех провайдеров в системе Apricode Exchange.

## 📊 Анализ продакшен данных

### Текущее состояние на Production:

```sql
SELECT service, category, has_encrypted_apikey, config FROM Integration;
```

| Service   | Category   | has_encrypted_apiKey | Config содержит |
|-----------|------------|---------------------|-----------------|
| Sumsub    | KYC        | ✅ true             | appToken, secretKey, levelName, webhookSecret (открыто) |
| Tatum     | BLOCKCHAIN | ✅ true             | apiKey, network (открыто) |
| Resend    | EMAIL      | ✅ true             | apiKey, fromEmail (открыто) |
| CoinGecko | RATES      | ✅ true             | baseUrl, cacheDuration |
| Kraken    | RATES      | ❌ false            | null |
| KYCAID    | KYC        | ❌ false            | apiKey, formId, webhookSecret (открыто) |

### Выводы:

1. **Config хранит ВСЕ данные открыто** - для отображения в админ-панели
2. **apiKey хранит зашифрованную копию** критичных секретов
3. Формат шифрования: `encrypted:{iv}:{authTag}:{encryptedData}`

## 🏗️ Единый стандарт хранения

### Для всех интеграций:

```typescript
Integration {
  service: string           // Уникальный ID провайдера
  category: string          // KYC | VIRTUAL_IBAN | EMAIL | BLOCKCHAIN | RATES
  isEnabled: boolean        // Активность
  status: string           // active | inactive | error
  
  // Конфигурация (открыто) - для админ-панели
  config: {
    // Публичные параметры
    sandbox?: boolean
    baseUrl?: string
    authUrl?: string
    levelName?: string
    network?: string
    // И ВСЕ секреты тоже (для отображения в форме)
    apiKey?: string
    clientId?: string
    clientSecret?: string
    appToken?: string
    secretKey?: string
    webhookSecret?: string
  }
  
  // Зашифрованные секреты (для использования в коде)
  apiKey: string | null     // encrypted:{iv}:{authTag}:{data}
  
  apiEndpoint: string       // Базовый URL API
  lastTested: DateTime
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Что шифруется в `apiKey`:

#### Вариант A: Простой провайдер (1 секрет)
```typescript
// Пример: Tatum, Resend, CoinGecko
apiKey = encrypt("actual-api-key-string")
```

#### Вариант B: OAuth провайдер (несколько секретов)
```typescript
// Пример: BCB Group, Sumsub
const credentials = {
  clientId: "xxx",
  clientSecret: "yyy",
  counterpartyId: "zzz",
  segregatedAccountId: "aaa"
};
apiKey = encrypt(JSON.stringify(credentials))
```

## 🔐 Процесс сохранения (Admin UI → DB)

### 1. Админ заполняет форму:
```typescript
// Данные из формы
{
  clientId: "Nzc482UW1smHy7HEZSmlQrXUrbS3oBnw",
  clientSecret: "lSN7mBUF3eV88lnWSTwccrXxJQAOdmOFMCsYgWE9EJKVAwWlRqZyMcsEADl0M2FW",
  counterpartyId: "13608",
  segregatedAccountId: "17218",
  sandbox: true,
  authUrl: "https://auth.uat.bcb.group/oauth/token",
  clientApiUrl: "https://client-api.uat.bcb.group"
}
```

### 2. API обрабатывает:
```typescript
// Определяем какие поля чувствительные
const sensitiveFields = ['apiKey', 'clientSecret', 'secretKey', 'appToken', 'webhookSecret'];

// Извлекаем чувствительные данные
const secrets = {};
const publicConfig = {};

for (const [key, value] of Object.entries(formData)) {
  if (sensitiveFields.includes(key) || key.includes('secret') || key.includes('key')) {
    secrets[key] = value;
  } else {
    publicConfig[key] = value;
  }
}

// Для BCB Group:
secrets = {
  clientId: "Nzc482UW1smHy7HEZSmlQrXUrbS3oBnw",
  clientSecret: "lSN7mBUF3eV88lnWSTwccrXxJQAOdmOFMCsYgWE9EJKVAwWlRqZyMcsEADl0M2FW",
  counterpartyId: "13608",
  segregatedAccountId: "17218"
}

publicConfig = {
  sandbox: true,
  authUrl: "https://auth.uat.bcb.group/oauth/token",
  clientApiUrl: "https://client-api.uat.bcb.group"
}
```

### 3. Сохраняем в DB:
```typescript
await prisma.integration.upsert({
  where: { service: 'BCB_GROUP' },
  data: {
    // ВСЕ данные в config (для админ-панели)
    config: {
      ...publicConfig,
      ...secrets  // ВСЕ секреты тоже
    },
    // Зашифрованная копия секретов в apiKey
    apiKey: encrypt(JSON.stringify(secrets))
  }
});
```

**Результат в DB:**
```json
{
  "config": {
    "sandbox": true,
    "authUrl": "https://auth.uat.bcb.group/oauth/token",
    "clientApiUrl": "https://client-api.uat.bcb.group",
    "clientId": "Nzc482UW1smHy7HEZSmlQrXUrbS3oBnw",
    "clientSecret": "lSN7mBUF3eV88lnWSTwccrXxJQAOdmOFMCsYgWE9EJKVAwWlRqZyMcsEADl0M2FW",
    "counterpartyId": "13608",
    "segregatedAccountId": "17218"
  },
  "apiKey": "encrypted:abc123:def456:ghijklmnop..."
}
```

## 📖 Процесс загрузки (DB → Code)

### GET /api/admin/integrations (Admin UI)
```typescript
// Для отображения в форме используем config напрямую
return {
  service: 'BCB_GROUP',
  config: integration.config, // Все поля из config (включая секреты)
  isEnabled: true,
  status: 'active'
};
```

### IntegrationFactory.getActiveProvider (Runtime)
```typescript
const integration = await prisma.integration.findUnique({ where: { service } });

// Декриптуем apiKey
let decryptedCredentials = {};
if (integration.apiKey) {
  const decrypted = decrypt(integration.apiKey);
  try {
    // Пробуем JSON
    decryptedCredentials = JSON.parse(decrypted);
  } catch {
    // Простая строка
    decryptedCredentials = { apiKey: decrypted };
  }
}

// Мерджим с публичной конфигурацией
const config = {
  ...integration.config,      // Публичные параметры
  ...decryptedCredentials     // Расшифрованные секреты
};

// Инициализируем провайдер
await provider.initialize(config);
```

## ✅ Преимущества подхода

1. **Безопасность**: Секреты зашифрованы в `apiKey`
2. **Удобство**: В админ-панели все поля доступны из `config`
3. **Гибкость**: Поддержка любых типов интеграций (1 ключ или N ключей)
4. **Единообразие**: Один подход для всех провайдеров

## 🚫 Что НЕ делать

❌ **Не храните секреты только в config без шифрования apiKey**
```typescript
// ПЛОХО
{ config: { clientSecret: "xxx" }, apiKey: null }
```

❌ **Не храните публичную конфигурацию в зашифрованном apiKey**
```typescript
// ПЛОХО
apiKey = encrypt(JSON.stringify({ sandbox: true, baseUrl: "..." }))
```

❌ **Не дублируйте шифрование**
```typescript
// ПЛОХО
config: {
  clientSecret: encrypt("xxx") // уже зашифровано
}
apiKey: encrypt(JSON.stringify({ clientSecret: encrypt("xxx") })) // двойное!
```

## 🔄 Миграция существующих интеграций

### Если секреты только в config:
```typescript
const secrets = extractSensitiveFields(integration.config);
await prisma.integration.update({
  where: { service },
  data: {
    apiKey: encrypt(JSON.stringify(secrets))
    // config остается как есть
  }
});
```

### Если секреты только в apiKey:
```typescript
const decrypted = decrypt(integration.apiKey);
const secrets = JSON.parse(decrypted);
await prisma.integration.update({
  where: { service },
  data: {
    config: {
      ...integration.config,
      ...secrets  // добавляем в config
    }
    // apiKey остается как есть
  }
});
```

## 📋 Чеклист для новых интеграций

- [ ] Определить чувствительные поля (apiKey, clientSecret, etc.)
- [ ] Определить публичные поля (sandbox, baseUrl, etc.)
- [ ] Сохранить ВСЕ поля в `config` (для UI)
- [ ] Сохранить зашифрованные секреты в `apiKey`
- [ ] Обновить `IntegrationFactory` для декриптации JSON если нужно
- [ ] Обновить админ форму для отображения всех полей из `config`
- [ ] Добавить тест интеграции с расшифрованными данными

---

**Последнее обновление**: 2025-12-04
**Статус**: ✅ Production Standard

