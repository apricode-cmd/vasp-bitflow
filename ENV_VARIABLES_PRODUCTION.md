# Environment Variables для Production

## Обязательные переменные

Скопируй эти переменные в Vercel Dashboard → Settings → Environment Variables

### Database (Supabase)
```bash
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

### NextAuth
```bash
NEXTAUTH_URL="https://your-domain.vercel.app"  # После первого деплоя
NEXTAUTH_SECRET="[generate-with: openssl rand -base64 32]"
```

### Encryption (для API keys)
```bash
ENCRYPTION_SECRET="[generate-with: openssl rand -hex 32]"
```

### KYCAID
```bash
KYCAID_API_KEY="your-production-api-key"
KYCAID_FORM_ID="form_basic_liveness"
KYCAID_WEBHOOK_SECRET="your-webhook-secret"
```

### CoinGecko
```bash
COINGECKO_API_URL="https://api.coingecko.com/api/v3"
```

### Email (Resend)
```bash
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="noreply@yourdomain.com"
```

### Admin (первый запуск)
```bash
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="SecurePassword123!"
```

## Опциональные переменные

### White Label
```bash
NEXT_PUBLIC_BRAND_NAME="Your Exchange"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

### Sentry (мониторинг)
```bash
SENTRY_DSN="https://xxx@sentry.io/xxx"
NEXT_PUBLIC_SENTRY_DSN="https://xxx@sentry.io/xxx"
```

## Генерация секретов

```bash
# NextAuth Secret
openssl rand -base64 32

# Encryption Secret
openssl rand -hex 32
```

## Важно!

- ⚠️ **НЕ используй production секреты** в development!
- ⚠️ **НЕ коммить** .env файлы в Git!
- ⚠️ **Регулярно ротируй** API keys (раз в 3 месяца)
- ⚠️ **Используй разные пароли** для каждого сервиса!

