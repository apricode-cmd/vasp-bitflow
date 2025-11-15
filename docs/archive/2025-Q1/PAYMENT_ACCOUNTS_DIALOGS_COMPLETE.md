# ✅ Payment Accounts - Create/Edit Functionality Complete!

## 🎉 Что добавлено

### 1. Диалоги для создания/редактирования

#### Bank Account Dialog (`/components/admin/BankAccountDialog.tsx`)
- ✅ Полная форма для банковских счетов
- ✅ Поля: Code, Name, Currency, Bank Details, IBAN, SWIFT, BIC
- ✅ Reference Template для order ID
- ✅ Payment Instructions
- ✅ Active/Default switches
- ✅ Priority setting
- ✅ Валидация обязательных полей
- ✅ Create/Update modes

#### Crypto Wallet Dialog (`/components/admin/CryptoWalletDialog.tsx`)
- ✅ Полная форма для крипто кошельков
- ✅ Поля: Code, Name, Cryptocurrency, Blockchain Network
- ✅ Wallet Address (с mono font)
- ✅ Memo/Tag для XRP, XLM
- ✅ Balance tracking (current/minimum)
- ✅ Balance alerts toggle
- ✅ Active/Default switches
- ✅ Priority setting
- ✅ Валидация обязательных полей
- ✅ Create/Update modes

### 2. Интеграция в `/admin/payments`

#### Добавлено в page.tsx:
- ✅ Import диалогов
- ✅ Состояния для диалогов (`bankDialogOpen`, `cryptoDialogOpen`)
- ✅ Состояние `selectedAccount` для редактирования
- ✅ Reference data states (`fiatCurrencies`, `cryptocurrencies`, `blockchains`)
- ✅ Загрузка reference data в `fetchData()`
- ✅ Actions column с кнопкой Edit в Bank Accounts table
- ✅ Actions column с кнопкой Edit в Crypto Wallets table
- ✅ Обработчики onClick для кнопок "Add Bank Account"
- ✅ Обработчики onClick для кнопок "Add Crypto Wallet"
- ✅ Рендер диалогов в конце компонента

### 3. API Endpoints используются

#### Существующие:
- ✅ `GET /api/admin/payment-accounts` - список
- ✅ `POST /api/admin/payment-accounts` - создание
- ✅ `PUT /api/admin/payment-accounts/[id]` - обновление
- ✅ `GET /api/admin/resources/fiat-currencies` - для выбора валют
- ✅ `GET /api/admin/resources/currencies?active=true` - криптовалюты
- ✅ `GET /api/admin/blockchains` - blockchain networks

## 🎨 Features

### Bank Account Dialog
- **Required fields**: Code*, Name*, Currency*
- **Optional fields**: Description, Bank Name, Account Holder, Bank Address, IBAN, SWIFT, BIC, Reference Template, Instructions
- **Settings**: Active, Default, Priority
- **Validation**: Показывает toast при отсутствии обязательных полей
- **Mode detection**: Автоматически Edit mode если передан `account`
- **Success callback**: Вызывает `fetchData()` для обновления списка

### Crypto Wallet Dialog
- **Required fields**: Code*, Name*, Cryptocurrency*, Blockchain*, Address*
- **Optional fields**: Description, Memo/Tag, Balance, Min Balance, Instructions
- **Settings**: Active, Default, Alerts Enabled, Priority
- **Validation**: Показывает toast при отсутствии обязательных полей
- **Mode detection**: Автоматически Edit mode если передан `wallet`
- **Success callback**: Вызывает `fetchData()` для обновления списка

## 🔄 User Flow

### Создание Bank Account:
1. Клик "Add Bank Account" → Открывается диалог
2. Заполнение формы (обязательные поля подсвечены *)
3. Выбор валюты через Combobox (EUR, PLN)
4. Клик "Create" → POST к API
5. Success toast → Диалог закрывается → Таблица обновляется

### Редактирование Bank Account:
1. Клик иконки Edit в таблице → Открывается диалог с данными
2. Code field disabled (нельзя менять)
3. Изменение полей
4. Клик "Update" → PUT к API
5. Success toast → Диалог закрывается → Таблица обновляется

### Создание Crypto Wallet:
1. Клик "Add Crypto Wallet" → Открывается диалог
2. Заполнение: Code, Name, Cryptocurrency (BTC/ETH/USDT/SOL)
3. Выбор Blockchain Network (BITCOIN/ETHEREUM/BSC/POLYGON)
4. Ввод wallet address (mono font для читаемости)
5. Опционально: Memo, Balance, Min Balance
6. Клик "Create" → POST к API
7. Success toast → Диалог закрывается → Таблица обновляется

### Редактирование Crypto Wallet:
1. Клик иконки Edit в таблице → Открывается диалог с данными
2. Code field disabled (нельзя менять)
3. Изменение полей (address, balance, settings)
4. Клик "Update" → PUT к API
5. Success toast → Диалог закрывается → Таблица обновляется

## 📋 UI Improvements

### Tables:
- ✅ Добавлена колонка "Actions" с кнопкой Edit
- ✅ Кнопки "Add" теперь функциональны

### Dialogs:
- ✅ Responsive layout (sm:max-w-2xl)
- ✅ Scroll для длинных форм (max-h-[90vh])
- ✅ Группировка полей по секциям
- ✅ Mono font для IBAN, addresses
- ✅ Hints под полями (например, "Use {orderId} placeholder")
- ✅ Disabled state для Code field при редактировании
- ✅ Loading state для кнопки Save

## 🚀 Готово к использованию!

### ✅ Можно сейчас:
1. Создавать Bank Accounts через UI
2. Редактировать Bank Accounts
3. Создавать Crypto Wallets через UI
4. Редактировать Crypto Wallets
5. Все данные сохраняются в базу через API
6. Валидация работает
7. Toast notifications информируют о результате

### 🔜 Следующие шаги (опционально):
- [ ] PSP Provider dialog
- [ ] Payment Method dialog
- [ ] Delete confirmation
- [ ] Bulk operations
- [ ] Export/Import

---

**Status:** ✅ 100% Functional
**Дата:** 26 октября 2025
**Версия:** 2.0.0

🎊 Create/Edit полностью работает!

