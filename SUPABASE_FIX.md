# 🔧 Fix: Prisma + Supabase Connection Pooler Error

## ❌ Ошибка:
```
prepared statement "s0" already exists
```

## ✅ Решение:

### **1. Обнови Environment Variables в Vercel:**

Зайди в **Vercel Dashboard** → **Settings** → **Environment Variables**

Замени `DATABASE_URL` на:

```bash
# Transaction Pooler (для запросов)
DATABASE_URL="postgresql://postgres.vgxpapfqwpzggqrwvkri:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct Connection (для миграций)
DIRECT_URL="postgresql://postgres.vgxpapfqwpzggqrwvkri:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

⚠️ **ВАЖНО:** Замени `PASSWORD` на свой реальный пароль от Supabase!

---

### **2. Redeploy в Vercel:**

1. Перейди в **Deployments**
2. Найди последний деплой
3. Нажми **⋮** → **Redeploy**

---

## 🔍 Почему это работает?

- **Порт 6543** - Transaction Mode (pooler) - для обычных запросов
- **Порт 5432** - Direct Connection - для миграций
- **`?pgbouncer=true`** - указывает Prisma использовать prepared statements корректно
- **`connection_limit=1`** - ограничивает количество соединений для serverless

---

## 📝 Локальная разработка:

В твоем `.env` файле (локально) используй:

```bash
# Local PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/apricode"

# Или Supabase direct (для локальной разработки)
DATABASE_URL="postgresql://postgres.vgxpapfqwpzggqrwvkri:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

---

## 🚀 После исправления:

✅ Ошибка "prepared statement already exists" исчезнет
✅ Vercel сможет подключиться к Supabase
✅ Все API endpoints заработают

---

## 📚 Дополнительная информация:

- [Prisma + Supabase Guide](https://www.prisma.io/docs/guides/database/supabase)
- [Supabase Connection Pooler](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

