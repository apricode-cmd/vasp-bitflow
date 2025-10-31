# 🔐 Как войти в Apricode Exchange

## ✅ Всё готово для входа!

**Сервер работает:** http://localhost:3000  
**База данных:** Заполнена  
**Админ создан:** ✅  

---

## 📝 Шаг за шагом

### 1. Откройте страницу логина

```
http://localhost:3000/login
```

### 2. Выберите аккаунт

#### Вариант A: Администратор
```
Email: admin@apricode.io
Password: SecureAdmin123!
```
После входа → Redirect на **http://localhost:3000/admin**

#### Вариант B: Клиент (KYC одобрен)
```
Email: client@test.com  
Password: TestClient123!
```
После входа → Redirect на **http://localhost:3000/dashboard**

### 3. Нажмите "Sign In"

### 4. Готово! ✅

Вы должны быть авторизованы и перенаправлены на соответствующую страницу.

---

## 🔍 Что делать если не работает

### Проблема: "Invalid credentials"

**Решение 1: Проверьте БД**
```bash
# Откройте Prisma Studio
open http://localhost:5555

# Найдите таблицу "User"
# Должно быть 2 пользователя:
# - admin@apricode.io (ADMIN)
# - client@test.com (CLIENT)
```

**Решение 2: Пересоздайте seed**
```bash
cd "/Users/bogdankononenko/Работа/Development/Project/crm vasp"
DATABASE_URL="postgresql://bogdankononenko@localhost:5432/apricode_dev" npm run db:seed
```

### Проблема: Страница не загружается

**Решение: Перезапустите сервер**
```bash
cd "/Users/bogdankononenko/Работа/Development/Project/crm vasp"

# Убить текущий процесс
lsof -ti:3000 | xargs kill -9

# Очистить кеш
rm -rf .next

# Запустить снова
npm run dev
```

### Проблема: "Cannot read properties of undefined"

**Решение: Проверьте DATABASE_URL**
```bash
# Проверьте файл .env.local
cat .env.local | grep DATABASE_URL

# Должно быть:
# DATABASE_URL="postgresql://bogdankononenko@localhost:5432/apricode_dev"

# Если неправильно, исправьте и перезапустите сервер
```

---

## 🧪 Тестирование после входа

### Как админ (admin@apricode.io):

1. **Dashboard** - http://localhost:3000/admin
   - Должны увидеть статистику
   - Недавние заказы
   - Счётчики (users, orders, KYC)

2. **Orders** - http://localhost:3000/admin/orders
   - Все 3 заказа от client@test.com
   - Можно менять статусы

3. **KYC** - http://localhost:3000/admin/kyc
   - 1 KYC session (APPROVED для client@test.com)

4. **Settings** - http://localhost:3000/admin/settings
   - Платформенная комиссия: 1.5%
   - Банковские счета (EUR, PLN)
   - Криптовалюты

### Как клиент (client@test.com):

1. **Dashboard** - http://localhost:3000/dashboard
   - Статистика ваших заказов
   - KYC статус (APPROVED)

2. **Buy Crypto** - http://localhost:3000/buy
   - Выберите BTC/ETH/USDT/SOL
   - Введите сумму
   - Wallet address
   - Создайте заказ

3. **My Orders** - http://localhost:3000/orders
   - Список ваших 3 заказов
   - Нажмите "View Details"

4. **Order Details** - Любой заказ
   - Банковские реквизиты
   - Payment reference
   - Статус заказа

5. **KYC** - http://localhost:3000/kyc
   - Статус: APPROVED ✅

6. **Profile** - http://localhost:3000/profile
   - Ваши данные

---

## 📊 Данные в БД (можете проверить в Prisma Studio)

### Пользователи
| Email | Роль | KYC Status | Password (hashed) |
|-------|------|------------|-------------------|
| admin@apricode.io | ADMIN | - | bcrypt hash |
| client@test.com | CLIENT | APPROVED | bcrypt hash |

### Заказы
| ID | User | Crypto | Status | Payment Ref |
|----|------|--------|--------|-------------|
| 1 | client | 0.01 BTC | PENDING | APR-2025-TEST001 |
| 2 | client | 0.5 ETH | PROCESSING | APR-2025-TEST002 |
| 3 | client | 1000 USDT | COMPLETED | APR-2025-TEST003 |

---

## 🎉 Успешного тестирования!

**Всё работает! Просто откройте http://localhost:3000/login и войдите!**

Если у вас возникнут проблемы:
1. Проверьте логи в терминале где запущен `npm run dev`
2. Откройте Prisma Studio (http://localhost:5555) и проверьте данные
3. Проверьте консоль браузера (F12) для ошибок JavaScript

---

**Приятного тестирования! 🚀**






