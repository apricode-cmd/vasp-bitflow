# Virtual IBAN - Руководство по настройке BCB Group

> **Enterprise-level** интеграция BCB Group для Virtual IBAN с полным шифрованием и безопасностью.

---

## 📋 Требования

1. **BCB Group аккаунт** с активным доступом к API
2. **OAuth credentials** (Client ID + Client Secret)
3. **Counterparty ID** и **CID** из вашего BCB аккаунта
4. **GPG ключи** (опционально, для дополнительной безопасности):
   - Private Key (`.asc` файл)
   - Passphrase
   - Key ID

---

## 🔐 Безопасность

Все чувствительные данные шифруются с использованием **AES-256-GCM** перед сохранением в базу данных:
- ✅ OAuth Client Secret
- ✅ GPG Private Key
- ✅ GPG Passphrase
- ✅ Webhook Secret

**Требование:** Убедитесь, что `ENCRYPTION_SECRET` установлен в `.env`:

```bash
ENCRYPTION_SECRET=<ваш_32+_символьный_ключ_шифрования>
```

Если `ENCRYPTION_SECRET` не установлен, данные будут храниться в plain text (только для DEV!).

---

## 🛠️ Настройка через админ-панель

### Шаг 1: Откройте админ-панель

```
https://your-domain.com/admin/integrations
```

Найдите карточку **"BCB Group Virtual IBAN"**.

### Шаг 2: Получите credentials от BCB Group

Вам понадобятся:

1. **OAuth Credentials** (обязательно):
   ```
   Client ID: your_client_id
   Client Secret: your_client_secret
   ```

2. **Account IDs** (обязательно):
   ```
   Counterparty ID: 12345 (numeric)
   CID: CID-XYZ789 (alphanumeric)
   ```

3. **GPG Keys** (опционально, для подписи запросов):
   - Скачайте ваш GPG private key (`.asc` файл)
   - Запомните passphrase
   - Узнайте Key ID (последние 8 символов fingerprint)

### Шаг 3: Заполните форму настройки

1. **Environment:**
   - `Sandbox` — для разработки/тестирования
   - `Production` — для боевой среды

2. **API URL:**
   ```
   Sandbox: https://api.sandbox.bcb.group
   Production: https://api.bcb.group
   ```

3. **OAuth Credentials:**
   - `OAuth Client ID` — ваш client_id
   - `OAuth Client Secret` — ваш client_secret (будет зашифрован)

4. **Account IDs:**
   - `Counterparty ID` — ваш numeric counterparty ID
   - `CID` — ваш alphanumeric client ID

5. **GPG Authentication** (опционально):
   - Загрузите `.asc` файл с private key
   - Введите passphrase
   - Введите Key ID (опционально)

6. **Webhook Secret** (опционально):
   - Секрет для верификации webhook подписей

### Шаг 4: Сохраните и протестируйте

1. Нажмите **"Save"**
2. Дождитесь успешного сохранения
3. Нажмите **"Test Connection"** для проверки

---

## 🧪 Тестирование интеграции

### Проверка через Admin API

```bash
curl -X GET "https://your-domain.com/api/admin/integrations/bcb-group" \
  -H "Cookie: your-admin-session-cookie"
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "data": {
    "service": "BCB_GROUP_VIRTUAL_IBAN",
    "status": "active",
    "isEnabled": true,
    "apiEndpoint": "https://api.bcb.group",
    "config": {
      "sandbox": false,
      "counterpartyId": "12345",
      "cid": "CID-XYZ789",
      "clientId": "your_client_id",
      "hasGpgKey": true,
      "hasWebhookSecret": true
    }
  }
}
```

### Проверка создания Virtual IBAN

1. Войдите как клиент с **APPROVED** KYC
2. Перейдите в `/virtual-iban`
3. Нажмите **"Get Virtual IBAN"**
4. Проверьте создание IBAN в админ-панели: `/admin/virtual-iban`

---

## 🔧 Troubleshooting

### ❌ Error: "Missing required config (counterpartyId, cid)"

**Причина:** Не заполнены обязательные поля Counterparty ID или CID.

**Решение:**
1. Откройте `/admin/integrations`
2. Откройте форму настройки BCB Group
3. Убедитесь, что `Counterparty ID` и `CID` заполнены
4. Сохраните и перезапустите сервер

### ❌ Error: "BCB authentication failed: 401"

**Причина:** Неверные OAuth credentials.

**Решение:**
1. Проверьте правильность `Client ID` и `Client Secret`
2. Убедитесь, что используете credentials для правильной среды (sandbox vs production)
3. Перегенерируйте credentials в BCB Group панели если нужно

### ❌ Error: "No active integration found in DB"

**Причина:** Интеграция не сохранена в базе данных.

**Решение:**
1. Откройте `/admin/integrations`
2. Настройте BCB Group интеграцию
3. Сохраните форму
4. Проверьте в базе данных:
   ```sql
   SELECT * FROM "Integration" WHERE service = 'BCB_GROUP_VIRTUAL_IBAN';
   ```

### ❌ GPG signing fails

**Причина:** Неверный GPG key или passphrase.

**Решение:**
1. Проверьте, что загружен правильный `.asc` файл
2. Проверьте правильность passphrase
3. Убедитесь, что GPG key не истек
4. GPG signing опционален - можно использовать только OAuth

---

## 📊 Мониторинг

### Логи интеграции

Все действия логируются:

```bash
# Инициализация
[BCB] Initializing BCB Group adapter: { baseUrl, counterpartyId, cid, hasOAuth, hasGPG }

# Аутентификация
[BCB] Authenticating...
[BCB] Authentication successful, token expires: <date>

# Создание аккаунта
[BCB] Creating virtual IBAN account: { userId, currency, country }
[BCB] Account created: { accountId, iban }

# Расшифровка
✅ Decrypted API key for BCB_GROUP_VIRTUAL_IBAN: client_sec...
✅ Decrypted GPG private key for BCB_GROUP_VIRTUAL_IBAN
✅ Decrypted GPG passphrase for BCB_GROUP_VIRTUAL_IBAN
```

### Проверка в базе данных

```sql
-- Проверить статус интеграции
SELECT 
  service,
  category,
  "isEnabled",
  status,
  "apiEndpoint",
  config
FROM "Integration"
WHERE service = 'BCB_GROUP_VIRTUAL_IBAN';

-- Проверить созданные Virtual IBAN аккаунты
SELECT 
  id,
  "userId",
  iban,
  currency,
  status,
  balance,
  "createdAt"
FROM "VirtualIbanAccount"
WHERE "providerId" = 'BCB_GROUP';
```

---

## 🔒 Best Practices

1. ✅ **Всегда используйте Sandbox** для разработки и тестирования
2. ✅ **Храните ENCRYPTION_SECRET в безопасности** (никогда не коммитьте в Git)
3. ✅ **Регулярно ротируйте OAuth credentials** (минимум раз в 90 дней)
4. ✅ **Используйте GPG signing** для production среды
5. ✅ **Мониторьте логи** на предмет ошибок аутентификации
6. ✅ **Тестируйте webhook endpoints** перед запуском в production
7. ✅ **Делайте резервные копии GPG ключей** в безопасном месте

---

## 📚 Дополнительные ресурсы

- **BCB Group API Docs:** https://bcbdigital.docs.apiary.io
- **Архитектура Virtual IBAN:** `/docs/current/VIRTUAL_IBAN_ARCHITECTURE.md`
- **Диаграммы flow:** `/docs/current/VIRTUAL_IBAN_DIAGRAMS.md`
- **GPG Setup Guide:** `/docs/current/VIRTUAL_IBAN_GPG_SETUP.md`

---

## ✅ Чеклист готовности к Production

- [ ] Интеграция настроена через `/admin/integrations`
- [ ] Test Connection успешен
- [ ] Создан тестовый Virtual IBAN аккаунт
- [ ] Проверена транзакция top-up
- [ ] Проверена транзакция balance deduction
- [ ] Webhook endpoint настроен и протестирован
- [ ] GPG signing работает (если используется)
- [ ] Мониторинг и алерты настроены
- [ ] Резервные копии GPG ключей сохранены
- [ ] OAuth credentials для Production получены

---

**Вопросы? Проблемы?**

Проверьте логи сервера или обратитесь к BCB Group Support: support@bcb.group





