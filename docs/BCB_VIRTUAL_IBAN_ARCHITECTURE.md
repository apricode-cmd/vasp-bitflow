# BCB Group Virtual IBAN Architecture

## Обзор

BCB Group предоставляет инфраструктуру для создания **Virtual IBAN** - персональных банковских счетов для клиентов вашей платформы.

## Архитектура BCB API

BCB имеет **два отдельных API**:

### 1. Services API (`api.bcb.group`)
- **Назначение:** Управление счетами платформы, балансами, транзакциями
- **Endpoints:**
  - `GET /v3/accounts` - список счетов
  - `GET /v3/balances/{account_id}` - баланс счета
  - `GET /v3/accounts/{account_id}/transactions` - транзакции
  - `POST /v4/accounts` - создание **beneficiary** (получателя для исходящих платежей)

### 2. Client API (`client-api.bcb.group`)
- **Назначение:** Создание Virtual IBAN для клиентов платформы
- **Endpoints:**
  - `POST /v2/accounts/{accountId}/virtual` - создание Virtual IBAN
  - `GET /v1/accounts/{accountId}/virtual/all-account-data` - список Virtual IBAN
  - `POST /v1/accounts/{accountId}/virtual/{iban}/close` - закрытие Virtual IBAN

## Типы счетов BCB

```
┌─────────────────────────────────────────────────────────────────┐
│                     BCB Counterparty (13608)                     │
│                     "Digital Boost SRO 2"                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐    ┌──────────────────────┐           │
│  │   EUR Test A         │    │   EUR Test B         │           │
│  │   ID: 94092438       │    │   ID: 94092442       │           │
│  │   DK2289000025309665 │    │   DK9289000025309666 │           │
│  │   (Operating)        │    │   (Operating)        │           │
│  └──────────────────────┘    └──────────────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │   EUR (VIRTUAL)  ← Для Virtual IBAN клиентов     │           │
│  │   ID: 94092443                                    │           │
│  │   IBAN: DK6589000025309667                        │           │
│  │   ✓ Настроен для Client API                       │           │
│  │                                                   │           │
│  │   ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │           │
│  │   │ Client 1    │ │ Client 2    │ │ Client N   │ │           │
│  │   │ Virtual     │ │ Virtual     │ │ Virtual    │ │           │
│  │   │ IBAN        │ │ IBAN        │ │ IBAN       │ │           │
│  │   │ DK80890...  │ │ DK12340...  │ │ DK56780... │ │           │
│  │   └─────────────┘ └─────────────┘ └────────────┘ │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  ┌──────────────────────┐    ┌──────────────────────┐           │
│  │   GBP Test A         │    │   GBP (VIRTUAL)      │           │
│  │   ID: 94092439       │    │   ID: 94092445       │           │
│  │   (Operating)        │    │   (For Virtual IBAN) │           │
│  └──────────────────────┘    └──────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Как определить VIRTUAL счёт

BCB помечает счета для Virtual IBAN в поле `account_label`:
- `"Digital Boost SRO 2 - EUR Test A"` → Обычный операционный счёт
- `"Digital Boost SRO 2 - EUR (VIRTUAL)"` → **Счёт для Virtual IBAN** ✓

## Flow создания Virtual IBAN

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client    │      │  Platform   │      │ BCB Client  │      │    BCB      │
│   (User)    │      │   (You)     │      │    API      │      │   System    │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │                    │
       │ 1. Request IBAN    │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │ 2. POST /v2/accounts/{segregatedId}/virtual
       │                    │    [{ correlationId, name, address... }]
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │    202 Accepted    │ 3. Create Virtual  │
       │                    │<───────────────────│    Account         │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │ 4. GET /v1/accounts/{id}/virtual/all-account-data
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │ { iban, bic, status }                   │
       │                    │<───────────────────│                    │
       │                    │                    │                    │
       │  5. Return IBAN    │                    │                    │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
```

## Входящие платежи (Top-up)

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client's  │      │    BCB      │      │  Platform   │      │  Platform   │
│    Bank     │      │   System    │      │  Webhook    │      │   Database  │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │                    │
       │ SEPA Transfer      │                    │                    │
       │ to DK8089000...    │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │ Webhook: transaction.created            │
       │                    │ { iban, amount, reference }             │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │                    │ Find user by IBAN  │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │ Update balance     │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
```

## Ключевые поля для создания Virtual IBAN

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `correlationId` | UUID | ✓ | Уникальный ID для связи с вашим userId |
| `name` | string(1-35) | ✓ | Имя владельца |
| `addressLine1` | string(1-35) | ✓ | Адрес (улица) |
| `city` | string(1-35) | ✓ | Город |
| `country` | string(2) | ✓ | ISO код страны (UA, GB, DE...) |
| `nationality` | string(2) | ✓ | ISO код национальности |
| `dateOfBirth` | YYYY-MM-DD | ✓ | Дата рождения |
| `isIndividual` | boolean | ✓ | true для физлиц |

## Конфигурация в Admin Panel

В настройках BCB Group Virtual IBAN должны быть:

1. **OAuth Credentials:**
   - Client ID
   - Client Secret

2. **Counterparty ID:** Ваш ID в системе BCB (например: 13608)

3. **Segregated Account:** Автоматически определяется по метке "(VIRTUAL)"

## Безопасность

1. **OAuth токены** живут 30 дней, автоматически обновляются
2. **Credentials** хранятся зашифрованными (AES-256-GCM)
3. **correlationId** должен быть UUID для BCB, маппится на ваш userId
4. **Webhooks** подписываются для верификации

## Sandbox vs Production

| Параметр | Sandbox | Production |
|----------|---------|------------|
| Auth URL | `https://auth.uat.bcb.group` | `https://auth.bcb.group` |
| Services API | `https://api.uat.bcb.group` | `https://api.bcb.group` |
| Client API | `https://client-api.uat.bcb.group` | `https://client-api.bcb.group` |

## Troubleshooting

### "No segregated account found for id"
- Проверьте что используете счёт с меткой "(VIRTUAL)" в `account_label`
- Обычные счета (EUR Test A/B) не работают с Client API

### "correlationId must be a UUID"
- `correlationId` должен быть в формате UUID (например: `550e8400-e29b-41d4-a716-446655440000`)
- Не используйте ваш внутренний userId напрямую

### "iban is required, bic is required"
- Это ошибка при использовании `/v4/accounts` (Services API)
- Для создания Virtual IBAN используйте Client API `/v2/accounts/{id}/virtual`

