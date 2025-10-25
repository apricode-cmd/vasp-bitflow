# Как запустить сервер Apricode Exchange

## Быстрый старт

```bash
# 1. Перейти в папку проекта
cd "/Users/bogdankononenko/Работа/Development/Project/crm vasp"

# 2. Убить процесс на порту 3000 (если занят)
lsof -ti:3000 | xargs kill -9

# 3. Запустить сервер
npm run dev
```

Сервер запустится на: **http://localhost:3000**

## Тестовые аккаунты

### Администратор
- **Email:** admin@apricode.io
- **Password:** SecureAdmin123!
- **URL:** http://localhost:3000/login
- **Доступ:** Админ-панель `/admin`

### Клиент (KYC одобрен)
- **Email:** client@test.com
- **Password:** TestClient123!
- **URL:** http://localhost:3000/login
- **Доступ:** Клиентский дашборд `/dashboard`

## Основные страницы

### Публичные
- `http://localhost:3000` - Landing page
- `http://localhost:3000/login` - Вход
- `http://localhost:3000/register` - Регистрация

### Клиентские (требуют авторизации)
- `http://localhost:3000/dashboard` - Дашборд
- `http://localhost:3000/buy` - Покупка крипты
- `http://localhost:3000/orders` - Мои заказы
- `http://localhost:3000/kyc` - KYC верификация
- `http://localhost:3000/profile` - Профиль

### Админские (требуют роль ADMIN)
- `http://localhost:3000/admin` - Админ дашборд
- `http://localhost:3000/admin/orders` - Управление заказами
- `http://localhost:3000/admin/kyc` - Обзор KYC
- `http://localhost:3000/admin/settings` - Настройки

## Полезные команды

```bash
# База данных
npm run db:seed          # Пересоздать тестовые данные
npx prisma studio        # Открыть UI для БД (http://localhost:5555)
npx prisma migrate reset # Сбросить БД (ОСТОРОЖНО!)

# Разработка
npm run dev              # Запуск dev сервера
npm run build            # Сборка production
npm run lint             # Проверка ESLint

# Остановить сервер
lsof -ti:3000 | xargs kill -9
```

## Проблемы и решения

### Порт 3000 занят
```bash
# Убить процесс
lsof -ti:3000 | xargs kill -9

# Или запустить на другом порту
PORT=3001 npm run dev
```

### База данных не подключается
```bash
# Проверить PostgreSQL
pg_isready

# Пересоздать БД
dropdb apricode_dev
createdb apricode_dev
npx prisma migrate dev
npm run db:seed
```

### Ошибки Prisma Client
```bash
# Перегенерировать Prisma Client
npx prisma generate
```

## Данные в БД после seed

✅ **2 пользователя:**
- 1 Admin (admin@apricode.io)
- 1 Client с одобренным KYC (client@test.com)

✅ **4 криптовалюты:**
- Bitcoin (BTC) - ₿
- Ethereum (ETH) - Ξ
- Tether (USDT) - ₮
- Solana (SOL) - ◎

✅ **2 фиатные валюты:**
- Euro (EUR) - €
- Polish Zloty (PLN) - zł

✅ **8 торговых пар:**
- BTC/EUR, BTC/PLN
- ETH/EUR, ETH/PLN
- USDT/EUR, USDT/PLN
- SOL/EUR, SOL/PLN

✅ **2 банковских счёта:**
- EUR: European Bank (IBAN: PL61109010140000071219812874)
- PLN: Polski Bank (IBAN: PL27114020040000300201355387)

✅ **3 примера заказов:**
- PENDING: 0.01 BTC
- PROCESSING: 0.5 ETH
- COMPLETED: 1000 USDT

✅ **7 системных настроек:**
- Комиссия платформы: 1.5%
- Срок действия заказа: 24 часа
- Минимальный заказ: €10
- И другие...

---

**Готово! Начинайте тестирование! 🚀**

