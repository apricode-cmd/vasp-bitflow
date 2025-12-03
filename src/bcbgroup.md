# BCB Group API — Руководство по интеграции крипто-обменника

> **Версия**: 1.0  
> **API Base URL**: `https://api.bcb.group`  
> **Auth URL**: `https://auth.bcb.group`  
> **Окружение**: Sandbox (GPG ключи)

---

## 📋 Оглавление

1. [Обзор](#обзор)
2. [Аутентификация](#аутентификация)
3. [Управление счетами](#управление-счетами)
4. [Балансы](#балансы)
5. [Транзакции](#транзакции)
6. [Бенефициары](#бенефициары)
7. [Платежи](#платежи)
8. [BLINC Network](#blinc-network)
9. [Webhooks](#webhooks)
10. [Verification of Payee (VoP)](#verification-of-payee)
11. [Коды ошибок](#коды-ошибок)
12. [Примеры интеграции](#примеры-интеграции)

---

## Обзор

BCB Group REST API предоставляет доступ к управлению:
- **Bank accounts** — фиатные банковские счета
- **Custody accounts** — кастодиальные счета
- **Wallet accounts** — криптовалютные кошельки

### Архитектура для крипто-обменника

```
┌─────────────────────────────────────────────────────────────┐
│                    КРИПТО-ОБМЕННИК                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │   Wallet    │    │    Bank     │    │  Custodial  │    │
│   │  (BTC/ETH)  │◄──►│  (USD/EUR)  │◄──►│   Account   │    │
│   └─────────────┘    └─────────────┘    └─────────────┘    │
│          │                  │                  │            │
│          └──────────────────┼──────────────────┘            │
│                             ▼                               │
│                    ┌─────────────────┐                      │
│                    │   BCB Group     │                      │
│                    │      API        │                      │
│                    └─────────────────┘                      │
│                             │                               │
│          ┌──────────────────┼──────────────────┐            │
│          ▼                  ▼                  ▼            │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │    BLINC    │    │   SWIFT/    │    │  Blockchain │    │
│   │   Network   │    │   FPS/SEPA  │    │   Networks  │    │
│   └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Аутентификация

### Получение Access Token

```bash
curl --request POST \
  --url https://auth.bcb.group/oauth/token \
  --header 'Content-Type: application/json' \
  --data '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
  }'
```

**Ответ:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

### Использование токена

Все запросы должны содержать заголовок:

```
Authorization: Bearer <access_token>
```

### Пример на Python

```python
import requests

class BCBClient:
    def __init__(self, client_id: str, client_secret: str, sandbox: bool = True):
        self.base_url = "https://api.bcb.group"
        self.auth_url = "https://auth.bcb.group"
        self.client_id = client_id
        self.client_secret = client_secret
        self.token = None
    
    def authenticate(self) -> str:
        """Получение access token"""
        response = requests.post(
            f"{self.auth_url}/oauth/token",
            json={
                "client_id": self.client_id,
                "client_secret": self.client_secret
            }
        )
        response.raise_for_status()
        self.token = response.json()["access_token"]
        return self.token
    
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
```

---

## Управление счетами

### Типы счетов

| Тип | `account_type` | Описание |
|-----|----------------|----------|
| Банковский | `Bank` | Фиатные счета (USD, EUR, GBP и т.д.) |
| Кастодиальный | `Custodial` | Хранение активов у кастодиана |
| Кошелёк | `Wallet` | Криптовалютные кошельки (BTC, ETH и т.д.) |

### GET /v3/accounts — Список всех счетов

```bash
curl -X GET "https://api.bcb.group/v3/accounts" \
  -H "Authorization: Bearer <token>"
```

**Ответ:**
```json
[
  {
    "id": 12345,
    "aid": "ACC-ABC123",
    "counterparty_id": 67890,
    "cid": "CID-XYZ789",
    "account_type": "Wallet",
    "ccy": "BTC",
    "host_name": "BCB Custody",
    "node_name": "My Company Ltd",
    "node_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "account_label": "BTC Hot Wallet",
    "bcb_controlled": 1,
    "blinc_id": "800999999999",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-12-01T15:45:00.000Z"
  },
  {
    "id": 12346,
    "aid": "ACC-DEF456",
    "account_type": "Bank",
    "ccy": "EUR",
    "host_name": "Partner Bank",
    "host_hub": "DEUTDEFF",
    "iban": "DE89370400440532013000",
    "node_name": "My Company Ltd",
    "account_label": "EUR Operating Account"
  }
]
```

### Ключевые поля счёта

| Поле | Описание |
|------|----------|
| `id` | Внутренний числовой ID |
| `aid` | Алфавитно-цифровой ID счёта |
| `counterparty_id` | Внутренний ID контрагента |
| `cid` | Алфавитно-цифровой ID контрагента |
| `account_type` | `Wallet` / `Bank` / `Custodial` |
| `ccy` | Тикер актива (BTC, USD, EUR и т.д.) |
| `node_address` | Номер счёта / адрес кошелька |
| `iban` | IBAN для банковских счетов |
| `blinc_id` | ID в сети BLINC |
| `bcb_controlled` | 1 = BCB может оперировать счётом |

### Python: Получение счетов

```python
def get_accounts(self, account_type: str = None) -> list:
    """
    Получить список счетов
    
    Args:
        account_type: 'Wallet', 'Bank', 'Custodial' или None для всех
    """
    response = requests.get(
        f"{self.base_url}/v3/accounts",
        headers=self._headers()
    )
    response.raise_for_status()
    accounts = response.json()
    
    if account_type:
        accounts = [a for a in accounts if a.get("account_type") == account_type]
    
    return accounts

def get_crypto_wallets(self) -> list:
    """Получить только криптокошельки"""
    return self.get_accounts(account_type="Wallet")

def get_fiat_accounts(self) -> list:
    """Получить только фиатные счета"""
    return self.get_accounts(account_type="Bank")
```

---

## Балансы

### GET /v3/accounts/{account_id}/balance — Баланс счёта

```bash
curl -X GET "https://api.bcb.group/v3/accounts/12345/balance" \
  -H "Authorization: Bearer <token>"
```

**Ответ:**
```json
{
  "counterparty_id": 67890,
  "cid": "CID-XYZ789",
  "aid": "ACC-ABC123",
  "account_name": "My Company Ltd",
  "account_type": "Wallet",
  "ticker": "BTC",
  "balance": "2.54678901",
  "description": "BTC Hot Wallet",
  "bcb_controlled": 1,
  "reporting_ccy": "USD",
  "asset_name": "Bitcoin",
  "display_name": "Bitcoin (BTC)",
  "decimals_price": 2,
  "decimals_quantity": 8
}
```

### Python: Работа с балансами

```python
def get_balance(self, account_id: int) -> dict:
    """Получить баланс конкретного счёта"""
    response = requests.get(
        f"{self.base_url}/v3/accounts/{account_id}/balance",
        headers=self._headers()
    )
    response.raise_for_status()
    return response.json()

def get_all_balances(self) -> dict:
    """Получить балансы всех счетов"""
    accounts = self.get_accounts()
    balances = {}
    
    for account in accounts:
        balance = self.get_balance(account["id"])
        ticker = balance.get("ticker", "UNKNOWN")
        
        if ticker not in balances:
            balances[ticker] = {
                "total": 0,
                "accounts": []
            }
        
        balances[ticker]["total"] += float(balance.get("balance", 0))
        balances[ticker]["accounts"].append({
            "id": account["id"],
            "label": account.get("account_label"),
            "balance": balance.get("balance"),
            "type": account.get("account_type")
        })
    
    return balances
```

---

## Транзакции

### GET /v3/accounts/{account_id}/transactions — История транзакций

```bash
curl -X GET "https://api.bcb.group/v3/accounts/12345/transactions" \
  -H "Authorization: Bearer <token>"
```

**Ответ:**
```json
[
  {
    "tx_id": "TXN-789ABC",
    "account_id": 12345,
    "value_date": "2024-12-01",
    "credit": 1,
    "details": "Deposit from external wallet",
    "ticker": "BTC",
    "amount": "0.5",
    "approved": 1,
    "notes": "Customer deposit",
    "source_name": "Blockchain"
  },
  {
    "tx_id": "TXN-456DEF",
    "account_id": 12345,
    "value_date": "2024-11-30",
    "credit": 0,
    "details": "Withdrawal to bc1q...",
    "ticker": "BTC",
    "amount": "0.25",
    "approved": 1,
    "notes": "Customer withdrawal",
    "source_name": "API"
  }
]
```

### Ключевые поля транзакции

| Поле | Описание |
|------|----------|
| `tx_id` | Уникальный ID транзакции |
| `credit` | `1` = приход, `0` = расход |
| `amount` | Сумма (всегда положительная) |
| `approved` | `1` = завершено, `0` = в ожидании |
| `network` | Платёжная схема (FPS, CHAPS, SWIFT, BLINC) |

### GET /v3/transactions/{tx_id} — Детали транзакции

```bash
curl -X GET "https://api.bcb.group/v3/transactions/TXN-789ABC" \
  -H "Authorization: Bearer <token>"
```

**Ответ:**
```json
{
  "tx_id": "TXN-789ABC",
  "account_id": 12345,
  "blinc_id": "800999999999",
  "network": "BLINC",
  "value_date": "2024-12-01",
  "credit": 1,
  "details": {
    "sender_name": "Partner Exchange",
    "sender_account": "800888888888"
  },
  "ticker": "USD",
  "amount": "50000.00",
  "approved": 1,
  "notes": "Settlement payment",
  "source_name": "BLINC"
}
```

### Python: Работа с транзакциями

```python
def get_transactions(self, account_id: int, 
                     start_date: str = None, 
                     end_date: str = None) -> list:
    """Получить транзакции по счёту"""
    params = {}
    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date
    
    response = requests.get(
        f"{self.base_url}/v3/accounts/{account_id}/transactions",
        headers=self._headers(),
        params=params
    )
    response.raise_for_status()
    return response.json()

def get_transaction_details(self, tx_id: str) -> dict:
    """Получить детали транзакции"""
    response = requests.get(
        f"{self.base_url}/v3/transactions/{tx_id}",
        headers=self._headers()
    )
    response.raise_for_status()
    return response.json()

def get_deposits(self, account_id: int) -> list:
    """Получить только входящие транзакции"""
    transactions = self.get_transactions(account_id)
    return [tx for tx in transactions if tx.get("credit") == 1]

def get_withdrawals(self, account_id: int) -> list:
    """Получить только исходящие транзакции"""
    transactions = self.get_transactions(account_id)
    return [tx for tx in transactions if tx.get("credit") == 0]
```

---

## Бенефициары

### GET /v3/beneficiaries — Список бенефициаров

```bash
curl -X GET "https://api.bcb.group/v3/beneficiaries" \
  -H "Authorization: Bearer <token>"
```

### POST /v4/accounts — Создание бенефициара

> ⚠️ **Важно**: Версия 3 устарела. Используйте v4 для создания бенефициаров.

#### Банковский бенефициар (GBP, Sort Code)

```bash
curl -X POST "https://api.bcb.group/v4/accounts" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "counterparty_id": 67890,
    "cid": "CID-XYZ789",
    "name": "John Doe GBP Account",
    "account_type": "Bank",
    "ccy": "GBP",
    "host_name": "Barclays Bank",
    "host_hub": "200000",
    "host_country": "GB",
    "node_name": "John Doe",
    "node_address": "12345678",
    "node_location_line_1": "123 Main Street",
    "node_location_city": "London",
    "node_location_postcode": "SW1A 1AA",
    "node_country": "GB",
    "node_type": "individual",
    "bcb_controlled": 1,
    "is_beneficiary": 1
  }'
```

#### Банковский бенефициар (EUR, IBAN)

```bash
curl -X POST "https://api.bcb.group/v4/accounts" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "counterparty_id": 67890,
    "cid": "CID-XYZ789",
    "name": "Hans Mueller EUR Account",
    "account_type": "Bank",
    "ccy": "EUR",
    "host_country": "DE",
    "node_name": "Hans Mueller",
    "node_location_line_1": "Hauptstrasse 1",
    "node_location_city": "Berlin",
    "node_country": "DE",
    "node_type": "individual",
    "iban": "DE89370400440532013000",
    "bic": "COBADEFFXXX",
    "bcb_controlled": 1,
    "is_beneficiary": 1
  }'
```

#### Банковский бенефициар (USD, Fedwire)

```bash
curl -X POST "https://api.bcb.group/v4/accounts" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "counterparty_id": 67890,
    "cid": "CID-XYZ789",
    "name": "Jane Smith USD Account",
    "account_type": "Bank",
    "ccy": "USD",
    "host_hub": "021000021",
    "host_country": "US",
    "node_name": "Jane Smith",
    "node_address": "123456789012",
    "node_location_line_1": "100 Wall Street",
    "node_location_city": "New York",
    "node_country": "US",
    "node_type": "individual",
    "bcb_controlled": 1,
    "is_beneficiary": 1
  }'
```

#### Криптовалютный бенефициар (Wallet)

```bash
curl -X POST "https://api.bcb.group/v4/accounts" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "counterparty_id": 67890,
    "cid": "CID-XYZ789",
    "name": "Customer BTC Wallet",
    "account_type": "Wallet",
    "ccy": "BTC",
    "node_name": "Customer Name",
    "node_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "node_location_line_1": "Customer Address",
    "node_location_city": "City",
    "node_country": "US",
    "node_type": "individual",
    "bcb_controlled": 1,
    "is_beneficiary": 1
  }'
```

### Python: Работа с бенефициарами

```python
def get_beneficiaries(self) -> list:
    """Получить список всех бенефициаров"""
    response = requests.get(
        f"{self.base_url}/v3/beneficiaries",
        headers=self._headers()
    )
    response.raise_for_status()
    return response.json()

def create_bank_beneficiary(self, 
                            counterparty_id: int,
                            cid: str,
                            name: str,
                            currency: str,
                            account_details: dict) -> dict:
    """
    Создать банковского бенефициара
    
    Args:
        counterparty_id: ID контрагента
        cid: Алфавитно-цифровой ID контрагента
        name: Имя бенефициара
        currency: Валюта (GBP, EUR, USD и т.д.)
        account_details: Словарь с деталями счёта
    """
    payload = {
        "counterparty_id": counterparty_id,
        "cid": cid,
        "name": name,
        "account_type": "Bank",
        "ccy": currency,
        "bcb_controlled": 1,
        "is_beneficiary": 1,
        **account_details
    }
    
    response = requests.post(
        f"{self.base_url}/v4/accounts",
        headers=self._headers(),
        json=payload
    )
    response.raise_for_status()
    return response.json()

def create_wallet_beneficiary(self,
                              counterparty_id: int,
                              cid: str,
                              name: str,
                              crypto: str,
                              wallet_address: str,
                              owner_details: dict) -> dict:
    """
    Создать криптовалютного бенефициара
    
    Args:
        counterparty_id: ID контрагента
        cid: Алфавитно-цифровой ID контрагента
        name: Имя бенефициара
        crypto: Криптовалюта (BTC, ETH и т.д.)
        wallet_address: Адрес кошелька
        owner_details: Данные владельца
    """
    payload = {
        "counterparty_id": counterparty_id,
        "cid": cid,
        "name": name,
        "account_type": "Wallet",
        "ccy": crypto,
        "node_address": wallet_address,
        "bcb_controlled": 1,
        "is_beneficiary": 1,
        **owner_details
    }
    
    response = requests.post(
        f"{self.base_url}/v4/accounts",
        headers=self._headers(),
        json=payload
    )
    response.raise_for_status()
    return response.json()
```

### Таблица требований по валютам

| Валюта | Страна | Обязательные поля |
|--------|--------|-------------------|
| **GBP** | GB | `host_hub` (Sort Code), `node_address` (Account Number) |
| **GBP CHAPS** | GB | + `node_location_*` (полный адрес), `node_location_postcode` |
| **EUR** | IBAN страны | `iban`, `bic`, `node_location_*` |
| **USD** | US | `host_hub` (Fedwire Routing), `node_address` (Account Number) |
| **USD** | Другие | `bic`, `node_address` или `iban` |
| **CAD** | CA | `host_hub` (Routing Number), `bic`, `node_address` |
| **AUD/NZD** | AU/NZ | `host_hub` (BSB), `bic`, `node_address` |
| **Crypto** | — | `node_address` (Wallet Address) |

---

## Платежи

### POST /v5/payments/authorise — Создание платежа

> ⚠️ **Важно**: Используйте версию 5 для всех новых платежей.

#### Платёжные схемы

| Схема | Описание |
|-------|----------|
| `AUTO` | Автоматический выбор для внешних платежей |
| `BLINC` | Платежи внутри сети BLINC (24/7, без комиссии) |
| `INTERNAL` | Между счетами одного контрагента в BCB |

#### Платёж существующему бенефициару

```bash
curl -X POST "https://api.bcb.group/v5/payments/authorise" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "counterparty_id": 67890,
    "sender_account_id": 12345,
    "beneficiary_account_id": 54321,
    "ccy": "GBP",
    "amount": "1000.00",
    "reference": "Invoice #12345",
    "reason": "GDSV",
    "notes": "Payment for services",
    "preferred_scheme": "AUTO",
    "nonce": "unique-payment-id-123"
  }'
```

#### Платёж без предварительного создания бенефициара (GBP FPS)

```bash
curl -X POST "https://api.bcb.group/v5/payments/authorise" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "counterparty_id": 67890,
    "sender_account_id": 12345,
    "ccy": "GBP",
    "amount": "500.00",
    "reference": "Payment for order #789",
    "reason": "GDSV",
    "preferred_scheme": "AUTO",
    "nonce": "unique-payment-id-456",
    "beneficiary_name": "John Doe",
    "beneficiary_account_number": "12345678",
    "beneficiary_sort_code": "200000"
  }'
```

#### Платёж EUR (SEPA)

```bash
curl -X POST "https://api.bcb.group/v5/payments/authorise" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "counterparty_id": 67890,
    "sender_account_id": 12346,
    "ccy": "EUR",
    "amount": "2500.00",
    "reference": "Contract payment",
    "reason": "COMC",
    "preferred_scheme": "AUTO",
    "nonce": "unique-payment-id-789",
    "beneficiary_name": "Hans Mueller",
    "beneficiary_address_line_1": "Hauptstrasse 1",
    "beneficiary_city": "Berlin",
    "beneficiary_country": "DE",
    "beneficiary_iban": "DE89370400440532013000",
    "beneficiary_bic": "COBADEFFXXX"
  }'
```

#### Платёж USD (Wire)

```bash
curl -X POST "https://api.bcb.group/v5/payments/authorise" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "counterparty_id": 67890,
    "sender_account_id": 12347,
    "ccy": "USD",
    "amount": "10000.00",
    "reference": "Investment transfer",
    "reason": "INVS",
    "preferred_scheme": "AUTO",
    "nonce": "unique-payment-id-012",
    "beneficiary_name": "Jane Smith",
    "beneficiary_address_line_1": "100 Wall Street",
    "beneficiary_city": "New York",
    "beneficiary_country": "US",
    "beneficiary_account_number": "123456789012",
    "beneficiary_routing_number": "021000021",
    "beneficiary_bank_name": "JPMorgan Chase",
    "beneficiary_bank_address": "383 Madison Avenue, New York",
    "beneficiary_bank_country": "US"
  }'
```

**Ответ:**
```json
[
  {
    "endToEndIdentification": "E2E-ABC123",
    "transactionId": "TXN-DEF456",
    "nonce": "unique-payment-id-123",
    "response": "Accepted"
  }
]
```

### Purpose Codes (Коды назначения)

| Код | Категория | Описание |
|-----|-----------|----------|
| `GDSV` | Commercial | Покупка/продажа товаров и услуг |
| `COMC` | Commercial | Коммерческий платёж |
| `SUPP` | Commercial | Платёж поставщику |
| `SALA` | Salary | Выплата зарплаты |
| `INVS` | Investment | Инвестиции и ценные бумаги |
| `FREX` | Investment | Валютные операции |
| `CORT` | Settlement | Расчёт по сделке |
| `INTC` | Cash Management | Внутрикорпоративный платёж |
| `INTP` | Cash Management | Платёж между счетами одного лица |
| `LOAN` | Finance | Выдача займа |
| `LOAR` | Finance | Погашение займа |
| `REFU` | General | Возврат средств |

### Python: Работа с платежами

```python
def create_payment(self,
                   sender_account_id: int,
                   counterparty_id: int,
                   currency: str,
                   amount: str,
                   reference: str,
                   reason: str,
                   beneficiary_account_id: int = None,
                   beneficiary_details: dict = None,
                   scheme: str = "AUTO",
                   nonce: str = None) -> dict:
    """
    Создать платёж
    
    Args:
        sender_account_id: ID счёта отправителя
        counterparty_id: ID контрагента
        currency: Валюта
        amount: Сумма
        reference: Назначение платежа (для получателя)
        reason: Purpose Code
        beneficiary_account_id: ID бенефициара (если создан)
        beneficiary_details: Детали бенефициара (если не создан)
        scheme: AUTO, BLINC или INTERNAL
        nonce: Уникальный ID для идемпотентности
    """
    import uuid
    
    payload = {
        "counterparty_id": counterparty_id,
        "sender_account_id": sender_account_id,
        "ccy": currency,
        "amount": str(amount),
        "reference": reference,
        "reason": reason,
        "preferred_scheme": scheme,
        "nonce": nonce or str(uuid.uuid4())
    }
    
    if beneficiary_account_id:
        payload["beneficiary_account_id"] = beneficiary_account_id
    elif beneficiary_details:
        payload.update(beneficiary_details)
    else:
        raise ValueError("Необходимо указать beneficiary_account_id или beneficiary_details")
    
    response = requests.post(
        f"{self.base_url}/v5/payments/authorise",
        headers=self._headers(),
        json=payload
    )
    response.raise_for_status()
    return response.json()

def send_gbp_fps(self,
                 sender_account_id: int,
                 counterparty_id: int,
                 amount: str,
                 reference: str,
                 beneficiary_name: str,
                 account_number: str,
                 sort_code: str) -> dict:
    """Быстрый платёж GBP через FPS"""
    return self.create_payment(
        sender_account_id=sender_account_id,
        counterparty_id=counterparty_id,
        currency="GBP",
        amount=amount,
        reference=reference,
        reason="GDSV",
        beneficiary_details={
            "beneficiary_name": beneficiary_name,
            "beneficiary_account_number": account_number,
            "beneficiary_sort_code": sort_code
        }
    )

def send_crypto(self,
                sender_account_id: int,
                counterparty_id: int,
                crypto: str,
                amount: str,
                wallet_address: str,
                beneficiary_name: str) -> dict:
    """Отправка криптовалюты"""
    return self.create_payment(
        sender_account_id=sender_account_id,
        counterparty_id=counterparty_id,
        currency=crypto,
        amount=amount,
        reference=f"Crypto withdrawal to {wallet_address[:10]}...",
        reason="CORT",
        beneficiary_details={
            "beneficiary_name": beneficiary_name,
            "beneficiary_account_number": wallet_address
        }
    )
```

### Reverse Deposit — Возврат депозита

```bash
curl -X POST "https://api.bcb.group/v3/payments/reverse-deposit" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "endToEndId": "E2E-DEPOSIT-123"
  }'
```

---

## BLINC Network

BLINC (BCB Liquidity Interchange Network Consortium) — внутренняя сеть BCB для мгновенных переводов 24/7 без комиссии.

### GET /v3/accounts/{account_id}/blinc-beneficiaries — BLINC бенефициары

```bash
curl -X GET "https://api.bcb.group/v3/accounts/12345/blinc-beneficiaries" \
  -H "Authorization: Bearer <token>"
```

**С фильтром по валюте:**
```bash
curl -X GET "https://api.bcb.group/v3/accounts/12345/blinc-beneficiaries?ccy=GBP" \
  -H "Authorization: Bearer <token>"
```

**Ответ:**
```json
[
  {
    "id": 99999,
    "blinc_id": "800888888888",
    "name": "Partner Exchange Ltd",
    "ccy": "GBP"
  },
  {
    "id": 99998,
    "blinc_id": "800777777777",
    "name": "Liquidity Provider Inc",
    "ccy": "USD"
  }
]
```

### GET /v3/blinc-accounts/{blinc_id} — Информация о BLINC аккаунте

```bash
curl -X GET "https://api.bcb.group/v3/blinc-accounts/800999999999" \
  -H "Authorization: Bearer <token>"
```

### Платёж через BLINC

```bash
curl -X POST "https://api.bcb.group/v5/payments/authorise" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "counterparty_id": 67890,
    "sender_account_id": 12345,
    "beneficiary_account_id": 99999,
    "ccy": "GBP",
    "amount": "50000.00",
    "reference": "Settlement Q4",
    "reason": "CORT",
    "preferred_scheme": "BLINC",
    "nonce": "blinc-payment-001"
  }'
```

### Python: BLINC операции

```python
def get_blinc_beneficiaries(self, account_id: int, currency: str = None) -> list:
    """Получить BLINC бенефициаров"""
    params = {}
    if currency:
        params["ccy"] = currency
    
    response = requests.get(
        f"{self.base_url}/v3/accounts/{account_id}/blinc-beneficiaries",
        headers=self._headers(),
        params=params
    )
    response.raise_for_status()
    return response.json()

def send_blinc_payment(self,
                       sender_account_id: int,
                       counterparty_id: int,
                       blinc_beneficiary_id: int,
                       currency: str,
                       amount: str,
                       reference: str) -> dict:
    """Мгновенный платёж через BLINC"""
    return self.create_payment(
        sender_account_id=sender_account_id,
        counterparty_id=counterparty_id,
        currency=currency,
        amount=amount,
        reference=reference,
        reason="CORT",
        beneficiary_account_id=blinc_beneficiary_id,
        scheme="BLINC"
    )
```

---

## Webhooks

### POST /v3/webhooks — Регистрация Webhook

> ⚠️ **Обязательно**: Webhook необходим для отслеживания статусов платежей!

```bash
curl -X POST "https://api.bcb.group/v3/webhooks" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/bcb",
    "events": ["payment.status"]
  }'
```

### Формат Webhook уведомлений

#### Успешный платёж

```json
[
  {
    "endToEndIdentification": "E2E-ABC123",
    "transactionId": "TXN-DEF456",
    "nonce": "unique-payment-id-123",
    "response": "Complete"
  }
]
```

#### Статусы платежей

| Статус | Описание |
|--------|----------|
| `Accepted` | Платёж принят в обработку |
| `Processing` | Платёж обрабатывается |
| `Complete` | Платёж завершён успешно |
| `Rejected` | Платёж отклонён |
| `vopheld` | Требуется Verification of Payee |

### Python: Обработка Webhook

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/bcb', methods=['POST'])
def handle_bcb_webhook():
    """Обработчик BCB webhooks"""
    data = request.json
    
    for event in data:
        e2e_id = event.get('endToEndIdentification')
        tx_id = event.get('transactionId')
        nonce = event.get('nonce')
        status = event.get('response')
        
        if status == 'Complete':
            # Платёж успешно завершён
            mark_payment_complete(nonce, tx_id)
        
        elif status == 'Rejected':
            # Платёж отклонён
            mark_payment_failed(nonce, tx_id)
        
        elif status == 'vopheld':
            # Требуется подтверждение VoP
            vop_data = event.get('data', {})
            handle_vop_check(nonce, vop_data)
        
        elif status in ['Accepted', 'Processing']:
            # Платёж в обработке
            update_payment_status(nonce, status)
    
    return jsonify({'status': 'ok'}), 200
```

---

## Verification of Payee

VoP (Verification of Payee) — проверка соответствия имени получателя данным счёта. **Обязателен для SEPA/EUR платежей.**

### Статусы VoP

| Статус | Описание | Действие |
|--------|----------|----------|
| `match` | Полное совпадение | Платёж выполняется автоматически |
| `close_match` | Близкое совпадение | Можно продолжить (с риском) |
| `no_match` | Нет совпадения | Рекомендуется отменить |
| `impossible_match` | Проверка невозможна | На усмотрение |

### Webhook при close_match

```json
[
  {
    "endToEndIdentification": "E2E-ABC123",
    "transactionId": "TXN-DEF456",
    "nonce": "payment-123",
    "response": "vopheld",
    "data": {
      "matchStatus": "close_match",
      "matchedName": "Jane Smith"
    }
  }
]
```

### Webhook при no_match

```json
[
  {
    "endToEndIdentification": "E2E-ABC123",
    "transactionId": "TXN-DEF456",
    "nonce": "payment-123",
    "response": "vopheld",
    "data": {
      "matchStatus": "no_match"
    }
  }
]
```

### Python: Обработка VoP

```python
def handle_vop_check(nonce: str, vop_data: dict):
    """Обработка VoP статуса"""
    match_status = vop_data.get('matchStatus')
    matched_name = vop_data.get('matchedName')
    
    if match_status == 'close_match':
        # Близкое совпадение — запросить подтверждение у пользователя
        notify_user_vop_close_match(nonce, matched_name)
    
    elif match_status == 'no_match':
        # Нет совпадения — отменить или запросить подтверждение
        notify_user_vop_no_match(nonce)
    
    elif match_status == 'impossible_match':
        # Проверка невозможна
        notify_user_vop_impossible(nonce)
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| `200` | Успешно |
| `400` | Неверный запрос или отсутствуют обязательные параметры |
| `401` | Ошибка аутентификации (невалидный/истёкший токен) |
| `403` | Доступ запрещён |
| `404` | Ресурс не найден |
| `405` | Метод не поддерживается |

---

## Примеры интеграции

### Полный пример: Крипто-обменник

```python
import requests
import uuid
from typing import Optional, List, Dict
from dataclasses import dataclass
from enum import Enum

class AccountType(Enum):
    WALLET = "Wallet"
    BANK = "Bank"
    CUSTODIAL = "Custodial"

class PaymentScheme(Enum):
    AUTO = "AUTO"
    BLINC = "BLINC"
    INTERNAL = "INTERNAL"

@dataclass
class PaymentResult:
    success: bool
    e2e_id: str
    tx_id: str
    nonce: str
    status: str
    error: Optional[str] = None

class BCBExchangeClient:
    """Клиент BCB Group API для крипто-обменника"""
    
    def __init__(self, client_id: str, client_secret: str):
        self.base_url = "https://api.bcb.group"
        self.auth_url = "https://auth.bcb.group"
        self.client_id = client_id
        self.client_secret = client_secret
        self.token = None
        self.counterparty_id = None
        self.cid = None
    
    def authenticate(self) -> bool:
        """Аутентификация и получение токена"""
        try:
            response = requests.post(
                f"{self.auth_url}/oauth/token",
                json={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                }
            )
            response.raise_for_status()
            data = response.json()
            self.token = data["access_token"]
            return True
        except Exception as e:
            print(f"Authentication failed: {e}")
            return False
    
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def _request(self, method: str, endpoint: str, **kwargs) -> dict:
        """Универсальный метод запроса с авто-реаутентификацией"""
        url = f"{self.base_url}{endpoint}"
        response = requests.request(method, url, headers=self._headers(), **kwargs)
        
        if response.status_code == 401:
            # Токен истёк — переаутентификация
            if self.authenticate():
                response = requests.request(method, url, headers=self._headers(), **kwargs)
        
        response.raise_for_status()
        return response.json()
    
    # ==================== ACCOUNTS ====================
    
    def get_accounts(self, account_type: AccountType = None) -> List[Dict]:
        """Получить список счетов"""
        accounts = self._request("GET", "/v3/accounts")
        if account_type:
            accounts = [a for a in accounts if a.get("account_type") == account_type.value]
        return accounts
    
    def get_crypto_wallets(self) -> List[Dict]:
        """Получить криптокошельки"""
        return self.get_accounts(AccountType.WALLET)
    
    def get_fiat_accounts(self) -> List[Dict]:
        """Получить фиатные счета"""
        return self.get_accounts(AccountType.BANK)
    
    def get_balance(self, account_id: int) -> Dict:
        """Получить баланс счёта"""
        return self._request("GET", f"/v3/accounts/{account_id}/balance")
    
    def get_all_balances(self) -> Dict[str, Dict]:
        """Получить все балансы сгруппированные по валюте"""
        accounts = self.get_accounts()
        balances = {}
        
        for account in accounts:
            balance_data = self.get_balance(account["id"])
            ticker = balance_data.get("ticker", "UNKNOWN")
            balance = float(balance_data.get("balance", 0))
            
            if ticker not in balances:
                balances[ticker] = {"total": 0, "accounts": []}
            
            balances[ticker]["total"] += balance
            balances[ticker]["accounts"].append({
                "id": account["id"],
                "label": account.get("account_label"),
                "balance": balance,
                "type": account.get("account_type")
            })
        
        return balances
    
    # ==================== TRANSACTIONS ====================
    
    def get_transactions(self, account_id: int) -> List[Dict]:
        """Получить транзакции по счёту"""
        return self._request("GET", f"/v3/accounts/{account_id}/transactions")
    
    def get_transaction_details(self, tx_id: str) -> Dict:
        """Получить детали транзакции"""
        return self._request("GET", f"/v3/transactions/{tx_id}")
    
    # ==================== BENEFICIARIES ====================
    
    def get_beneficiaries(self) -> List[Dict]:
        """Получить список бенефициаров"""
        return self._request("GET", "/v3/beneficiaries")
    
    def create_wallet_beneficiary(self,
                                   name: str,
                                   crypto: str,
                                   wallet_address: str,
                                   owner_name: str,
                                   owner_address: str,
                                   owner_city: str,
                                   owner_country: str) -> Dict:
        """Создать криптовалютного бенефициара"""
        payload = {
            "counterparty_id": self.counterparty_id,
            "cid": self.cid,
            "name": name,
            "account_type": "Wallet",
            "ccy": crypto,
            "node_name": owner_name,
            "node_address": wallet_address,
            "node_location_line_1": owner_address,
            "node_location_city": owner_city,
            "node_country": owner_country,
            "node_type": "individual",
            "bcb_controlled": 1,
            "is_beneficiary": 1
        }
        return self._request("POST", "/v4/accounts", json=payload)
    
    def create_bank_beneficiary_gbp(self,
                                     name: str,
                                     account_holder: str,
                                     account_number: str,
                                     sort_code: str) -> Dict:
        """Создать GBP банковского бенефициара"""
        payload = {
            "counterparty_id": self.counterparty_id,
            "cid": self.cid,
            "name": name,
            "account_type": "Bank",
            "ccy": "GBP",
            "host_hub": sort_code,
            "host_country": "GB",
            "node_name": account_holder,
            "node_address": account_number,
            "node_country": "GB",
            "node_type": "individual",
            "bcb_controlled": 1,
            "is_beneficiary": 1
        }
        return self._request("POST", "/v4/accounts", json=payload)
    
    # ==================== PAYMENTS ====================
    
    def send_payment(self,
                     sender_account_id: int,
                     currency: str,
                     amount: str,
                     reference: str,
                     reason: str = "GDSV",
                     beneficiary_account_id: int = None,
                     beneficiary_details: dict = None,
                     scheme: PaymentScheme = PaymentScheme.AUTO) -> PaymentResult:
        """
        Отправить платёж
        
        Returns:
            PaymentResult с данными о платеже
        """
        nonce = str(uuid.uuid4())
        
        payload = {
            "counterparty_id": self.counterparty_id,
            "sender_account_id": sender_account_id,
            "ccy": currency,
            "amount": str(amount),
            "reference": reference,
            "reason": reason,
            "preferred_scheme": scheme.value,
            "nonce": nonce
        }
        
        if beneficiary_account_id:
            payload["beneficiary_account_id"] = beneficiary_account_id
        elif beneficiary_details:
            payload.update(beneficiary_details)
        else:
            return PaymentResult(
                success=False,
                e2e_id="",
                tx_id="",
                nonce=nonce,
                status="Error",
                error="Missing beneficiary information"
            )
        
        try:
            result = self._request("POST", "/v5/payments/authorise", json=payload)
            
            if result and len(result) > 0:
                return PaymentResult(
                    success=True,
                    e2e_id=result[0].get("endToEndIdentification", ""),
                    tx_id=result[0].get("transactionId", ""),
                    nonce=result[0].get("nonce", nonce),
                    status=result[0].get("response", "Unknown")
                )
        except Exception as e:
            return PaymentResult(
                success=False,
                e2e_id="",
                tx_id="",
                nonce=nonce,
                status="Error",
                error=str(e)
            )
    
    def send_crypto_withdrawal(self,
                                sender_wallet_id: int,
                                crypto: str,
                                amount: str,
                                beneficiary_wallet_id: int,
                                reference: str = "Crypto withdrawal") -> PaymentResult:
        """Вывод криптовалюты"""
        return self.send_payment(
            sender_account_id=sender_wallet_id,
            currency=crypto,
            amount=amount,
            reference=reference,
            reason="CORT",
            beneficiary_account_id=beneficiary_wallet_id
        )
    
    def send_fiat_withdrawal_gbp(self,
                                  sender_account_id: int,
                                  amount: str,
                                  beneficiary_name: str,
                                  account_number: str,
                                  sort_code: str,
                                  reference: str) -> PaymentResult:
        """Вывод GBP на банковский счёт"""
        return self.send_payment(
            sender_account_id=sender_account_id,
            currency="GBP",
            amount=amount,
            reference=reference,
            reason="GDSV",
            beneficiary_details={
                "beneficiary_name": beneficiary_name,
                "beneficiary_account_number": account_number,
                "beneficiary_sort_code": sort_code
            }
        )
    
    # ==================== BLINC ====================
    
    def get_blinc_beneficiaries(self, account_id: int, currency: str = None) -> List[Dict]:
        """Получить BLINC бенефициаров"""
        endpoint = f"/v3/accounts/{account_id}/blinc-beneficiaries"
        if currency:
            endpoint += f"?ccy={currency}"
        return self._request("GET", endpoint)
    
    def send_blinc_payment(self,
                           sender_account_id: int,
                           blinc_beneficiary_id: int,
                           currency: str,
                           amount: str,
                           reference: str) -> PaymentResult:
        """Мгновенный платёж через BLINC"""
        return self.send_payment(
            sender_account_id=sender_account_id,
            currency=currency,
            amount=amount,
            reference=reference,
            reason="CORT",
            beneficiary_account_id=blinc_beneficiary_id,
            scheme=PaymentScheme.BLINC
        )
    
    # ==================== DEPOSITS ====================
    
    def reverse_deposit(self, end_to_end_id: str) -> Dict:
        """Вернуть депозит отправителю"""
        return self._request(
            "POST",
            "/v3/payments/reverse-deposit",
            json={"endToEndId": end_to_end_id}
        )


# ==================== ИСПОЛЬЗОВАНИЕ ====================

if __name__ == "__main__":
    # Инициализация клиента
    client = BCBExchangeClient(
        client_id="YOUR_CLIENT_ID",
        client_secret="YOUR_CLIENT_SECRET"
    )
    
    # Аутентификация
    if not client.authenticate():
        print("Failed to authenticate")
        exit(1)
    
    # Установка counterparty данных (получите из вашего аккаунта)
    client.counterparty_id = 12345
    client.cid = "CID-XYZ789"
    
    # Получить все балансы
    print("=== BALANCES ===")
    balances = client.get_all_balances()
    for ticker, data in balances.items():
        print(f"{ticker}: {data['total']}")
    
    # Получить криптокошельки
    print("\n=== CRYPTO WALLETS ===")
    wallets = client.get_crypto_wallets()
    for wallet in wallets:
        print(f"- {wallet.get('account_label')}: {wallet.get('ccy')}")
    
    # Получить фиатные счета
    print("\n=== FIAT ACCOUNTS ===")
    fiat = client.get_fiat_accounts()
    for account in fiat:
        print(f"- {account.get('account_label')}: {account.get('ccy')}")
    
    # Пример отправки GBP
    # result = client.send_fiat_withdrawal_gbp(
    #     sender_account_id=12345,
    #     amount="100.00",
    #     beneficiary_name="John Doe",
    #     account_number="12345678",
    #     sort_code="200000",
    #     reference="Test payment"
    # )
    # print(f"Payment result: {result}")
```

---

## Контакты и ресурсы

| Ресурс | Ссылка |
|--------|--------|
| **API Base URL** | https://api.bcb.group |
| **Auth URL** | https://auth.bcb.group |
| **Документация** | https://bcbdigital.docs.apiary.io |
| **Поддержка** | support@bcb.group |

---

