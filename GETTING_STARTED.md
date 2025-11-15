# 🚀 Getting Started - Apricode Exchange

## Quick Start Guide для первой установки

---

## 📋 Prerequisites

Перед установкой убедитесь, что у вас установлено:

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **PostgreSQL** 15+ ([Download](https://www.postgresql.org/download/))
- **Git**
- **npm** или **yarn**

### Проверка версий:

```bash
node -v    # должно быть v20.x или выше
psql --version  # должно быть 15.x или выше
npm -v     # должно быть 9.x или выше
```

---

## 📦 Installation Steps

### Step 1: Clone Repository

```bash
git clone <your-repo-url>
cd "crm vasp"
```

### Step 2: Install Dependencies

```bash
npm install
```

Это может занять 2-3 минуты. Дождитесь completion.

---

### Step 3: Setup Database

#### Create PostgreSQL Database

```bash
# Подключитесь к PostgreSQL
psql -U postgres

# Создайте database
CREATE DATABASE apricode_exchange;

# Создайте user (опционально)
CREATE USER apricode WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE apricode_exchange TO apricode;

# Выход
\q
```

---

### Step 4: Configure Environment Variables

Создайте файл `.env` в корне проекта:

```bash
touch .env
```

Скопируйте и заполните следующие переменные:

```bash
# ====================
# DATABASE
# ====================
# Connection string для PostgreSQL
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://postgres:password@localhost:5432/apricode_exchange"

# Direct URL (то же самое для локальной разработки)
DIRECT_URL="postgresql://postgres:password@localhost:5432/apricode_exchange"

# ====================
# NEXT AUTH v5
# ====================
# Secret key для шифрования сессий
# IMPORTANT: Сгенерируйте уникальный ключ командой: openssl rand -base64 32
AUTH_SECRET="GENERATE_WITH_OPENSSL_RAND_BASE64_32"

# URL вашего приложения
NEXTAUTH_URL="http://localhost:3000"

# ====================
# APPLICATION
# ====================
# Public URL (для email links, webhooks, etc)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Название вашей платформы
NEXT_PUBLIC_APP_NAME="Apricode Exchange"

# Environment
NODE_ENV="development"

# ====================
# KYC PROVIDER (выберите один)
# ====================
# Какой KYC provider использовать: "KYCAID" или "SUMSUB"
KYC_PROVIDER="KYCAID"

# --- KYCAID ---
KYCAID_API_KEY="your_kycaid_api_key"
KYCAID_FORM_ID="your_kycaid_form_id"
KYCAID_WEBHOOK_SECRET="your_kycaid_webhook_secret"
KYCAID_BASE_URL="https://api.kycaid.com"

# --- OR SUMSUB ---
# SUMSUB_APP_TOKEN="your_sumsub_app_token"
# SUMSUB_SECRET_KEY="your_sumsub_secret_key"
# SUMSUB_BASE_URL="https://api.sumsub.com"
# SUMSUB_LEVEL_NAME="basic-kyc-level"

# ====================
# EXCHANGE RATE PROVIDERS
# ====================
# CoinGecko (Free tier, rate limited)
COINGECKO_API_KEY=""  # Optional, оставьте пустым для free tier
COINGECKO_API_URL="https://api.coingecko.com/api/v3"

# Kraken (Professional, requires API key)
KRAKEN_API_KEY="your_kraken_api_key"  # Optional
KRAKEN_API_SECRET="your_kraken_secret"  # Optional
KRAKEN_BASE_URL="https://api.kraken.com"

# ====================
# EMAIL SERVICE
# ====================
# Resend API (https://resend.com)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"
EMAIL_FROM="noreply@yourdomain.com"
EMAIL_FROM_NAME="Your Exchange"

# ====================
# FILE STORAGE (Vercel Blob)
# ====================
# Get from Vercel dashboard
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxx"

# ====================
# REDIS (Optional, для caching)
# ====================
# Оставьте пустым если не используете Redis
REDIS_URL=""
REDIS_TOKEN=""

# ====================
# SECURITY
# ====================
# Encryption key для sensitive data (32 hex characters)
# Generate: openssl rand -hex 16
ENCRYPTION_KEY="GENERATE_WITH_OPENSSL_RAND_HEX_16"

# ====================
# PLATFORM CONFIGURATION
# ====================
# Platform fee (1.5% = 0.015)
PLATFORM_FEE="0.015"

# Order limits
MIN_ORDER_VALUE_EUR="10"
MAX_ORDER_VALUE_EUR="100000"

# ====================
# SUPER ADMIN (for seed script)
# ====================
# Эти credentials будут созданы при первом seed
SUPER_ADMIN_EMAIL="admin@yourdomain.com"
SUPER_ADMIN_PASSWORD="ChangeThisSecurePassword123!"

# ====================
# MONITORING (Optional)
# ====================
SENTRY_DSN=""
LOGFLARE_API_KEY=""
LOGFLARE_SOURCE_TOKEN=""

# ====================
# DOCKER (for deployment)
# ====================
DOCKER_BUILD="false"  # Set to "true" when building Docker image
```

#### Обязательные vs Опциональные переменные

**🚨 ОБЯЗАТЕЛЬНЫЕ (без них система не запустится):**
- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`

**⚠️ ВАЖНЫЕ (нужны для production):**
- `RESEND_API_KEY` + `EMAIL_FROM` (для email уведомлений)
- `KYCAID_API_KEY` или `SUMSUB_APP_TOKEN` (для KYC)
- `KRAKEN_API_KEY` или используйте CoinGecko бесплатно

**✅ ОПЦИОНАЛЬНЫЕ:**
- `REDIS_URL` (улучшает производительность)
- `BLOB_READ_WRITE_TOKEN` (для file uploads)
- `SENTRY_DSN` (для error tracking)

---

### Step 5: Generate AUTH_SECRET

```bash
# Сгенерируйте секрет
openssl rand -base64 32

# Скопируйте результат в .env как AUTH_SECRET
```

### Step 6: Generate ENCRYPTION_KEY

```bash
# Сгенерируйте ключ
openssl rand -hex 16

# Скопируйте результат в .env как ENCRYPTION_KEY
```

---

### Step 7: Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed initial data
npm run db:seed
```

**Expected output:**
```
✅ Database seeding completed successfully!
👤 Super Admin created: admin@yourdomain.com
💰 4 currencies seeded (BTC, ETH, USDT, SOL)
💶 2 fiat currencies seeded (EUR, PLN)
⚙️  System settings initialized
```

---

### Step 8: Start Development Server

```bash
npm run dev
```

Server will start at: **http://localhost:3000**

---

## 🎉 Access Your Platform

### Option 1: Setup Wizard (Recommended)

Navigate to: **http://localhost:3000/setup**

Пошаговый wizard проведет вас через:
1. Создание admin account
2. Настройку company information
3. Базовую конфигурацию

**Используйте этот способ для свежей установки!**

---

### Option 2: Direct Login (если seed был выполнен)

Navigate to: **http://localhost:3000/admin/login**

**Default Credentials:**
- Email: `admin@yourdomain.com` (из .env: SUPER_ADMIN_EMAIL)
- Password: `ChangeThisSecurePassword123!` (из .env: SUPER_ADMIN_PASSWORD)

**⚠️ ВАЖНО: Смените эти credentials после первого входа!**

---

## ⚙️ Post-Setup Configuration

После первого входа в админ-панель:

### 1. System Settings
Navigate to: `/admin/settings`

- ✅ Company Information
- ✅ Branding (logo, colors)
- ✅ Contact Information

### 2. KYC Provider
Navigate to: `/admin/settings/integrations`

- Configure KYCAID or Sumsub
- Test connection
- Setup webhook URL

### 3. Email Service
Navigate to: `/admin/settings/email`

- Configure email templates
- Send test email
- Verify deliverability

### 4. Currencies
Navigate to: `/admin/config/currencies`

- Enable/disable currencies
- Set min/max limits
- Configure fees

### 5. Payment Methods
Navigate to: `/admin/config/payment-methods`

- Add bank accounts
- Add crypto wallet addresses
- Set payment instructions

---

## 🔍 Verify Installation

### Health Check

```bash
curl http://localhost:3000/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "version": "1.1.0",
  "uptime": 123,
  "checks": {
    "database": {
      "status": "ok",
      "latency": 5,
      "message": "Database responsive"
    }
  },
  "environment": "development"
}
```

### Detailed Health Check

```bash
curl http://localhost:3000/api/health?detailed=true
```

Покажет status всех интеграций (KYC, Email, Rate Providers).

---

## 🐳 Docker Installation (Alternative)

Если хотите использовать Docker:

```bash
# Build image
docker build -t apricode-exchange:1.0 .

# Run with docker-compose
docker-compose up -d

# Check logs
docker-compose logs -f app

# Access at http://localhost:3000
```

См. [DOCKER_GUIDE.md](./DOCKER_GUIDE.md) для деталей.

---

## 🛠️ Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
psql -U postgres

# Verify DATABASE_URL format
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

### "AUTH_SECRET is not set"

```bash
# Generate new secret
openssl rand -base64 32

# Add to .env
AUTH_SECRET="generated_secret_here"

# Restart server
npm run dev
```

### Prisma Migration Error

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Re-run migrations
npx prisma migrate deploy

# Re-seed data
npm run db:seed
```

### Port 3000 Already in Use

```bash
# Kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

---

## 📚 Next Steps

После успешной установки:

1. **Read Documentation**
   - [README.md](./README.md) - Full documentation
   - [COMMERCIALIZATION_STRATEGY.md](./COMMERCIALIZATION_STRATEGY.md) - Business strategy
   - [MISSING_FEATURES_ANALYSIS.md](./MISSING_FEATURES_ANALYSIS.md) - Feature checklist

2. **Configure Integrations**
   - KYC Provider (KYCAID or Sumsub)
   - Email Service (Resend)
   - Rate Providers (CoinGecko, Kraken)

3. **Customize Branding**
   - Upload logo
   - Set brand colors
   - Customize email templates

4. **Test the Flow**
   - Create test user account
   - Complete KYC verification
   - Place test order
   - Process order as admin

5. **Deploy to Production**
   - See [DEPLOYMENT.md](./docs/current/DEPLOYMENT.md)
   - Setup Vercel or Docker deployment
   - Configure production environment

---

## 🆘 Need Help?

- **Documentation**: Check [README.md](./README.md)
- **Issues**: Create an issue on GitHub
- **Email**: support@apricode.io

---

## 🎯 Quick Reference

### Useful Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production
npm run start              # Start production server

# Database
npm run db:studio          # Open Prisma Studio
npm run db:seed            # Seed database
npm run db:backup          # Backup database
npm run db:migrate         # Create migration

# Code Quality
npm run lint               # Run ESLint
npm run type-check         # TypeScript check

# Docker
docker-compose up -d       # Start containers
docker-compose logs -f     # View logs
docker-compose down        # Stop containers
```

### Important URLs

- Application: http://localhost:3000
- Admin Panel: http://localhost:3000/admin
- Health Check: http://localhost:3000/api/health
- Prisma Studio: http://localhost:5555 (after `npm run db:studio`)

---

**Setup Complete! 🎉 Your Apricode Exchange is ready!**

Continue to [README.md](./README.md) for full documentation.

