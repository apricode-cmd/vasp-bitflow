# 🔧 Tatum Integration Setup

**Проблема:** Wallet sync fails with 401 authentication error

**Причина:** Используется тестовый API ключ `test-key` вместо реального

---

## ❌ Текущая ошибка:

```
❌ Failed to sync wallet: Error: Failed to get balance for TRON: 
TRON contract call error: 401 - {
  "statusCode": 401,
  "errorCode": "subscription.invalid",
  "message": "Authentication required. Make sure your requests are authenticated with a Tatum API key."
}
```

**Текущая конфигурация в БД:**
```sql
SELECT service, "isEnabled", status, config 
FROM "Integration" 
WHERE service = 'tatum';

-- Result:
service | isEnabled | status | config
--------|-----------|--------|---------------------------------------
tatum   | t         | active | {"apiKey": "test-key", "network": "mainnet"}
```

---

## ✅ Решение 1: Получить реальный Tatum API ключ

### Шаг 1: Регистрация на Tatum

1. Перейти на https://dashboard.tatum.io/
2. Создать аккаунт (FREE tier доступен)
3. Получить API ключ в Dashboard

### Шаг 2: Обновить конфигурацию в БД

```sql
-- Обновить API ключ
UPDATE "Integration" 
SET config = jsonb_set(
  config, 
  '{apiKey}', 
  '"your-real-tatum-api-key"'
)
WHERE service = 'tatum';

-- Проверить
SELECT service, config 
FROM "Integration" 
WHERE service = 'tatum';
```

### Шаг 3: Или через Admin UI

1. Перейти в `/admin/integrations`
2. Найти "Tatum (Blockchain Provider)"
3. Нажать "Configure"
4. Ввести реальный API ключ
5. Сохранить

---

## ✅ Решение 2: Отключить Tatum для dev (временно)

### Вариант A: Отключить через БД

```sql
-- Отключить Tatum
UPDATE "Integration" 
SET "isEnabled" = false, 
    status = 'inactive'
WHERE service = 'tatum';
```

### Вариант B: Отключить через Admin UI

1. Перейти в `/admin/integrations`
2. Найти "Tatum (Blockchain Provider)"
3. Toggle "Enabled" → OFF

---

## 📋 Tatum API Plans

### FREE Tier (для dev/testing):
- ✅ 5 requests/second
- ✅ Basic blockchain support
- ✅ Достаточно для разработки

### Paid Plans (для production):
- Start: $79/month - 25 req/sec
- Scale: $299/month - 100 req/sec
- Enterprise: Custom pricing

**Документация:** https://docs.tatum.io/

---

## 🔍 Проверка работы Tatum

После настройки API ключа:

### 1. Test через Admin UI

```
1. Перейти в /admin/integrations
2. Найти Tatum
3. Нажать "Test Connection"
4. Ожидается: ✅ Success
```

### 2. Test через API

```bash
# Test Tatum connection
curl -X POST http://localhost:3000/api/admin/integrations/tatum/test \
  -H "Cookie: your-session-cookie" \
  | jq '.'

# Expected:
{
  "success": true,
  "message": "Tatum connection successful"
}
```

### 3. Sync wallet balances

```bash
# Sync all wallets
curl -X POST http://localhost:3000/api/admin/wallets/sync-all \
  -H "Cookie: your-session-cookie" \
  | jq '.'

# Expected:
{
  "success": true,
  "synced": 4,
  "failed": 0
}
```

---

## 🐛 Troubleshooting

### Ошибка: 401 Unauthorized
**Причина:** Неверный API ключ  
**Решение:** Проверить API ключ в Tatum Dashboard

### Ошибка: 403 Forbidden
**Причина:** API ключ не имеет прав на операцию  
**Решение:** Проверить план подписки

### Ошибка: 429 Too Many Requests
**Причина:** Превышен rate limit  
**Решение:** 
- Увеличить план
- Добавить rate limiting в код
- Уменьшить частоту синхронизации

### Wallet sync fails для конкретной сети
**Причина:** Сеть не поддерживается текущим планом  
**Решение:** Проверить поддерживаемые сети в плане

---

## 📝 Альтернативные провайдеры

Если Tatum не подходит, можно использовать:

1. **Alchemy** - Ethereum, Polygon, Arbitrum
2. **Infura** - Ethereum, IPFS
3. **QuickNode** - Multi-chain
4. **Moralis** - Web3 APIs
5. **BlockCypher** - Bitcoin, Ethereum, Litecoin

Для добавления нового провайдера:
1. Создать adapter в `src/lib/integrations/providers/blockchain/`
2. Зарегистрировать в `IntegrationRegistry.ts`
3. Добавить в seed или через Admin UI

---

## 🎯 Рекомендации для Production

1. **Используйте реальный API ключ** (не test-key)
2. **Настройте rate limiting** в коде
3. **Мониторинг использования** API квоты
4. **Fallback провайдер** на случай недоступности
5. **Кеширование балансов** для снижения запросов
6. **Webhook notifications** вместо polling

---

## ✅ Checklist

- [ ] Зарегистрироваться на Tatum Dashboard
- [ ] Получить API ключ
- [ ] Обновить конфигурацию в БД или через UI
- [ ] Протестировать connection
- [ ] Протестировать wallet sync
- [ ] Настроить rate limiting (опционально)
- [ ] Настроить мониторинг (опционально)

---

**Status:** ⚠️ Требуется настройка  
**Priority:** Medium (для dev можно отключить, для prod - обязательно)

