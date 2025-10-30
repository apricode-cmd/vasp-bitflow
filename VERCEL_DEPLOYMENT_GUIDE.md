# 🚀 Deployment Guide - Vercel + Supabase

## Статус подготовки

✅ **Build проходит успешно** (`npm run build` - exit code 0)
✅ **TypeScript ошибки исправлены**
✅ **ESLint настроен для production**
✅ **Код запушен в GitHub**

---

## Шаг 1: Создание Supabase Database

### 1.1 Регистрация на Supabase

1. Перейди на [supabase.com](https://supabase.com)
2. Зарегистрируйся или войди через GitHub
3. Создай новый проект:
   - **Name:** `apricode-exchange-prod`
   - **Database Password:** (сохрани его!)
   - **Region:** Europe West (Frankfurt) - ближайший к вам
   - **Pricing:** Free tier (для начала достаточно)

### 1.2 Получение DATABASE_URL

После создания проекта:

1. Перейди в **Settings → Database**
2. Найди секцию **Connection string**
3. Выбери **URI** (не Pooler!)
4. Скопируй строку подключения:

```
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

**Важно:** Замени `[YOUR-PASSWORD]` на твой пароль БД!

### 1.3 Применение миграций Prisma

На **локальной машине**:

```bash
# 1. Создай .env.production (НЕ коммить!)
echo "DATABASE_URL='postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@...' " > .env.production

# 2. Применить миграции к Supabase
npx prisma migrate deploy --schema=./prisma/schema.prisma

# 3. (Опционально) Заполнить начальными данными
npx prisma db seed
```

---

## Шаг 2: Настройка Environment Variables для Production

### 2.1 Обязательные переменные

Создай список всех переменных из `.env.local`:

#### **Базовые**
```bash
# Database (Supabase)
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# NextAuth
NEXTAUTH_URL="https://your-domain.vercel.app"  # Будет известен после деплоя
NEXTAUTH_SECRET="[generate-new-secret-for-production]"

# Encryption (для API keys)
ENCRYPTION_SECRET="[generate-32-byte-hex-string]"
```

#### **Генерация секретов**

```bash
# NextAuth Secret
openssl rand -base64 32

# Encryption Secret
openssl rand -hex 32
```

#### **Интеграции**

```bash
# KYCAID
KYCAID_API_KEY="your-production-api-key"
KYCAID_FORM_ID="form_basic_liveness"
KYCAID_WEBHOOK_SECRET="your-webhook-secret"

# CoinGecko (можно использовать free tier)
COINGECKO_API_URL="https://api.coingecko.com/api/v3"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="noreply@yourdomain.com"

# Admin (первый запуск)
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="SecurePassword123!"
```

### 2.2 Опциональные переменные

```bash
# Для белого лейбла
NEXT_PUBLIC_BRAND_NAME="Your Exchange"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# Sentry (для мониторинга ошибок)
SENTRY_DSN="https://xxx@sentry.io/xxx"
```

---

## Шаг 3: Деплой на Vercel

### 3.1 Подключение репозитория

1. Перейди на [vercel.com](https://vercel.com)
2. Нажми **Add New Project**
3. Import твой GitHub репозиторий `apricode-cmd/vasp-crm`
4. Vercel автоматически определит Next.js

### 3.2 Настройка Build Settings

**Framework Preset:** Next.js (auto-detected)
**Root Directory:** `./` (корень проекта)
**Build Command:** `npm run build` (по умолчанию)
**Output Directory:** `.next` (по умолчанию)
**Install Command:** `npm install` (по умолчанию)

**Node.js Version:** 20.x (в Settings → General)

### 3.3 Добавление Environment Variables

В Vercel Dashboard → **Settings → Environment Variables**:

1. Добавь **ВСЕ** переменные из шага 2.1
2. Для каждой переменной выбери **Environment:**
   - ✅ Production
   - ✅ Preview (для тестовых веток)
   - ⬜ Development (не нужно)

**Важно:** 
- `NEXTAUTH_URL` оставь пока пустым (вернешься после деплоя)
- Все секреты должны быть **разные** для production!

### 3.4 Первый Deploy

1. Нажми **Deploy**
2. Vercel начнет сборку (займет ~5-10 минут)
3. Следи за логами Build

**Если build упадет:**
- Проверь логи в Vercel Dashboard
- Убедись, что `DATABASE_URL` правильный
- Проверь, что все секреты добавлены

### 3.5 Финализация NEXTAUTH_URL

После успешного деплоя:

1. Vercel даст тебе URL: `https://your-project.vercel.app`
2. Вернись в **Settings → Environment Variables**
3. Найди `NEXTAUTH_URL`
4. Установи значение: `https://your-project.vercel.app`
5. Нажми **Redeploy** (перезапусти деплой)

---

## Шаг 4: Настройка Custom Domain (опционально)

### 4.1 Добавление домена

1. В Vercel → **Settings → Domains**
2. Добавь свой домен: `exchange.apricode.agency`
3. Vercel покажет DNS записи

### 4.2 Настройка DNS

У твоего DNS провайдера (Cloudflare, GoDaddy, etc.):

```
Type: A
Name: exchange (или @)
Value: 76.76.21.21 (Vercel IP)

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 4.3 Обновление NEXTAUTH_URL

После подключения домена:
```bash
NEXTAUTH_URL="https://exchange.apricode.agency"
```

---

## Шаг 5: Post-Deploy Checklist

### 5.1 Проверка функциональности

✅ **Открой сайт** в браузере
✅ **Регистрация** нового пользователя работает
✅ **Логин** работает (admin@yourdomain.com)
✅ **KYC интеграция** работает (проверь KYCAID webhook)
✅ **Курсы валют** загружаются (CoinGecko)
✅ **Email уведомления** работают (Resend)

### 5.2 Настройка KYCAID Webhook

1. Открой админ-панель: `https://your-domain/admin`
2. Перейди в **Settings → Integrations**
3. Открой настройки KYCAID
4. Скопируй **Webhook URL**:
   ```
   https://your-domain/api/kyc/webhook?provider=kycaid
   ```
5. В [KYCAID Dashboard](https://dashboard.kycaid.com):
   - Settings → Webhooks
   - Add Webhook
   - Paste URL
   - Select events: `verification.completed`, `verification.pending`
   - Test webhook

### 5.3 Создание Admin пользователя

Если seed не отработал автоматически:

```bash
# Подключись к Supabase через psql или Dashboard SQL Editor
INSERT INTO "User" (id, email, password, role, "isActive")
VALUES (
  gen_random_uuid(),
  'admin@yourdomain.com',
  -- Хеш для пароля 'Admin123!' (замени на свой bcrypt хеш!)
  '$2a$10$...',
  'ADMIN',
  true
);
```

Или используй админ панель Supabase.

---

## Шаг 6: Мониторинг и Логи

### 6.1 Vercel Logs

- **Real-time logs:** Vercel Dashboard → Deployments → Latest → Logs
- **Function logs:** Каждая serverless function логируется отдельно

### 6.2 Supabase Monitoring

- **Database usage:** Supabase Dashboard → Database
- **Query performance:** SQL Editor → Query Performance
- **Connection pooling:** Settings → Database → Pooler

### 6.3 Sentry (опционально)

Для production рекомендуется настроить [Sentry](https://sentry.io):

```bash
npm install --save @sentry/nextjs
npx @sentry/wizard -i nextjs
```

---

## Шаг 7: Continuous Deployment

### 7.1 Автоматический Deploy

Vercel автоматически деплоит:
- **Production:** при push в `main` ветку
- **Preview:** при создании Pull Request

### 7.2 Rollback

Если что-то сломалось:

1. Vercel → Deployments
2. Найди последний рабочий deploy
3. Нажми **...** → **Promote to Production**

---

## Troubleshooting

### Build Fails

**Ошибка:** `Module not found`
**Решение:** Проверь, что все dependencies в `package.json`

**Ошибка:** `Prisma Client not generated`
**Решение:** Добавь в `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Database Connection Issues

**Ошибка:** `Cannot connect to database`
**Решение:** 
1. Проверь `DATABASE_URL` в Vercel Environment Variables
2. Убедись, что используешь **Transaction Pooler** URL, не Direct
3. Проверь, что Supabase project не в паузе (free tier засыпает)

### Auth Issues

**Ошибка:** `NEXTAUTH_URL mismatch`
**Решение:** Убедись, что `NEXTAUTH_URL` совпадает с реальным доменом

**Ошибка:** `Invalid NEXTAUTH_SECRET`
**Решение:** Сгенерируй новый secret и обнови в Vercel

### KYCAID Webhook Not Working

1. Проверь URL в KYCAID Dashboard
2. Проверь `KYCAID_WEBHOOK_SECRET` совпадает
3. Посмотри логи в Vercel: `/api/kyc/webhook` должен возвращать 200

---

## Best Practices

### Security

✅ Используй **разные секреты** для prod/dev
✅ Никогда не коммить `.env` файлы
✅ Регулярно ротируй API keys
✅ Включи **2FA** на Vercel и Supabase
✅ Настрой **IP whitelisting** для Supabase (если нужно)

### Performance

✅ Включи **Vercel Edge Caching** для статики
✅ Используй **CDN** для изображений
✅ Настрой **Database Indexes** в Supabase
✅ Мониторь **Cold Start** times функций

### Backups

✅ Supabase делает **daily backups** автоматически (paid plan)
✅ Для free tier настрой свой backup:
```bash
# Cron job для backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

---

## Стоимость (примерная)

| Сервис | Plan | Стоимость/месяц |
|--------|------|-----------------|
| Vercel | Hobby | $0 (до 100GB bandwidth) |
| Vercel | Pro | $20 (unlimited bandwidth) |
| Supabase | Free | $0 (до 500MB DB, 2GB bandwidth) |
| Supabase | Pro | $25 (8GB DB, 50GB bandwidth) |
| KYCAID | Starter | €50-200 (зависит от объема) |
| Resend | Free | $0 (до 100 emails/day) |

**Итого для старта:** $0-50/месяц

---

## Поддержка

**Проблемы с деплоем?**
- Vercel Community: https://github.com/vercel/next.js/discussions
- Supabase Discord: https://discord.supabase.com

**Вопросы по проекту:**
- GitHub Issues: https://github.com/apricode-cmd/vasp-crm/issues

---

**Готово!** 🎉 Твой CRM теперь живет в production!

