# 🚀 Apricode Exchange - Enterprise Cryptocurrency Exchange Platform

<div align="center">

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

**Secure, Compliant, Enterprise-Ready Cryptocurrency Purchase Platform**

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Documentation](#-documentation) • [API](#-api-reference)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Security & Compliance](#-security--compliance)
- [Deployment](#-deployment)
- [Operations](#-operations)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## 🎯 Overview

**Apricode Exchange** is an enterprise-grade cryptocurrency exchange platform that enables users to purchase digital assets (BTC, ETH, USDT, SOL) using fiat currency (EUR, PLN) through secure bank transfers, with mandatory KYC verification for regulatory compliance.

### 🌟 Why Apricode Exchange?

- ✅ **Fully Compliant** - Mandatory KYC/AML verification before trading
- ✅ **Enterprise Security** - Multi-factor authentication, passkeys, role-based access
- ✅ **Professional Admin CRM** - Complete order management, audit logs, reporting
- ✅ **Scalable Architecture** - Built on Next.js 14 with PostgreSQL and Redis
- ✅ **White-Label Ready** - Customizable branding, multi-currency support
- ✅ **Production Proven** - Live at [app.bitflow.biz](https://app.bitflow.biz)

---

## 🚀 Key Features

### 👥 User Features

#### 🔐 Authentication & Security
- **Email/Password Authentication** with NextAuth v5
- **Two-Factor Authentication** (TOTP) for enhanced security
- **Passkey Support** (WebAuthn/FIDO2) for passwordless login
- **Session Management** with automatic timeout and renewal
- **Password Recovery** with email verification

#### 📋 KYC Verification
- **Mandatory KYC** before first purchase
- **Multi-Provider Support**: KYCAID, Sumsub integration
- **Document Upload** with AI verification
- **Real-time Status** tracking in dashboard
- **Webhook Integration** for instant status updates

#### 💰 Cryptocurrency Purchase
- **Supported Cryptocurrencies**: Bitcoin (BTC), Ethereum (ETH), Tether (USDT), Solana (SOL)
- **Fiat Currencies**: EUR, PLN (expandable)
- **Real-time Exchange Rates** from CoinGecko and Kraken
- **Transparent Pricing** with 1.5% platform fee
- **Flexible Limits** per currency and user tier
- **Multiple Payment Methods**: Bank transfers (SEPA/SWIFT)

#### 📊 User Dashboard
- **Order History** with detailed status tracking
- **Wallet Management** with address verification
- **Transaction Timeline** with all status changes
- **Real-time Notifications** for order updates
- **Invoice Generation** for completed orders
- **KYC Status** monitoring

### 👨‍💼 Admin Features

#### 📈 CRM Dashboard
- **Real-time Statistics** - orders, users, revenue, KYC
- **Recent Activity Feed** with clickable orders
- **Performance Indicators** - conversion rates, processing times
- **System Health Monitoring** - integrations, wallets, payment methods
- **Action Center** - pending approvals and tasks
- **Interactive Charts** - revenue trends, order volumes

#### 🛠️ Order Management
- **Kanban Board View** - drag-and-drop status updates
- **Table View** with advanced filters and sorting
- **Smart Status Transitions** with validation
- **Bulk Operations** - cancel, export multiple orders
- **Order Details Page** with complete information:
  - Customer info with KYC status
  - Financial breakdown
  - Payment and wallet details
  - PayIn/PayOut status tracking
  - Full timeline with admin actions
  - Internal notes and customer notes
  - **PDF Report Export** - branded, professional reports

#### 👤 User Management
- **User List** with search and filters
- **User Details** page with:
  - Profile information
  - KYC session details
  - Order history
  - Wallet management
  - Activity logs
  - **PDF User Report** for compliance

#### 🔍 KYC Reviews
- **KYC Queue** management
- **Document Verification** interface
- **Approve/Reject** with notes
- **Re-verification** workflow
- **Audit Trail** for compliance

#### 💼 Financial Management
- **PayIn Tracking** - incoming fiat payments
- **PayOut Management** - crypto disbursements
- **Payment Account Management** - bank accounts, crypto wallets
- **Payment Method Configuration** - fees, limits, availability
- **Transaction Reconciliation** tools

#### ⚙️ System Configuration
- **Trading Pairs** management
- **Currencies** configuration with limits
- **Blockchain Networks** setup
- **Exchange Rate** providers (CoinGecko, Kraken)
- **Email Templates** editor with live preview
- **Branding Settings** - logo, colors, company info
- **Legal Documents** management
- **System Settings** - KYC providers, payment gateways

#### 📊 Advanced Features
- **Audit Logs** - complete admin activity tracking
- **Security Monitoring** - MFA events, suspicious activity
- **API Keys Management** - for programmatic access
- **Webhook Management** - event notifications
- **Export Tools** - CSV, Excel, PDF reports
- **Notification System** - in-app and email notifications

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.2+ | React framework with App Router |
| **React** | 18.3+ | UI library with Server Components |
| **TypeScript** | 5.5+ | Type-safe development |
| **Tailwind CSS** | 3.4+ | Utility-first styling |
| **shadcn/ui** | Latest | High-quality UI components |
| **Radix UI** | Latest | Accessible primitives |
| **React Hook Form** | 7.53+ | Form management |
| **Zod** | 3.23+ | Schema validation |
| **Recharts** | 2.12+ | Data visualization |
| **Lucide React** | 0.400+ | Icon library |
| **Lexical** | 0.38+ | Rich text editor |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20+ | Runtime environment |
| **Next.js API Routes** | 14.2+ | RESTful API endpoints |
| **PostgreSQL** | 15+ | Primary database |
| **Prisma** | 5.22+ | ORM and migrations |
| **Redis** | 7+ | Caching and sessions |
| **NextAuth.js** | 5.0-beta | Authentication |
| **bcryptjs** | 2.4+ | Password hashing |
| **jose** | 5.9+ | JWT handling |
| **@simplewebauthn** | 12.0+ | WebAuthn/Passkeys |

### External Services

| Service | Purpose | Integration |
|---------|---------|-------------|
| **KYCAID** | KYC verification | REST API + Webhooks |
| **Sumsub** | Alternative KYC | SDK + REST API |
| **CoinGecko** | Crypto rates (free) | REST API |
| **Kraken** | Crypto rates (pro) | REST API |
| **Resend** | Email delivery | SMTP + API |
| **Vercel** | Hosting & deployment | Git-based |
| **Supabase** | PostgreSQL database | Connection pooling |
| **Vercel Blob** | File storage | SDK |

### Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **TypeScript** | Type checking |
| **Prisma Studio** | Database GUI |
| **Git** | Version control |

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  Next.js 14 (App Router + Server Components)               │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Client    │  │    Admin    │  │  Public     │       │
│  │  Dashboard  │  │     CRM     │  │   Pages     │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE                              │
│  • Authentication (NextAuth v5)                             │
│  • Authorization (Role-based)                               │
│  • Rate Limiting                                            │
│  • Security Headers                                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                       API LAYER                              │
│  Next.js API Routes (RESTful)                               │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │  Auth    │ │  Orders  │ │   KYC    │ │  Admin   │    │
│  │   API    │ │   API    │ │   API    │ │   API    │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC                            │
│  Services & Controllers                                     │
│                                                              │
│  • Order Service        • Email Service                     │
│  • KYC Service         • Payment Service                    │
│  • Audit Service       • Notification Service               │
│  • Cache Service       • Integration Service                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                        DATA LAYER                            │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐                     │
│  │  PostgreSQL  │    │    Redis     │                     │
│  │   (Prisma)   │    │   (Cache)    │                     │
│  └──────────────┘    └──────────────┘                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL INTEGRATIONS                       │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐   │
│  │ KYCAID  │  │Sumsub   │  │CoinGecko │  │ Resend   │   │
│  │ (KYC)   │  │ (KYC)   │  │ (Rates)  │  │ (Email)  │   │
│  └─────────┘  └─────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema Overview

**Core Entities:**
- `User` - Customer accounts
- `Profile` - User personal information
- `KycSession` - KYC verification sessions
- `Order` - Purchase orders
- `PayIn` - Incoming fiat payments
- `PayOut` - Outgoing crypto payments
- `Admin` - Admin user accounts
- `AdminAuditLog` - Admin activity tracking

**Configuration:**
- `Currency` - Supported cryptocurrencies
- `FiatCurrency` - Supported fiat currencies
- `TradingPair` - Exchange pairs
- `PaymentMethod` - Payment options
- `PaymentAccount` - Bank accounts & crypto wallets
- `BlockchainNetwork` - Supported networks

**See `prisma/schema.prisma` for complete schema.**

---

## 📦 Installation

### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **PostgreSQL** 15+ ([Download](https://www.postgresql.org/download/))
- **Redis** 7+ (Optional, for caching)
- **npm** or **yarn**
- **Git**

### 1. Clone Repository

```bash
git clone https://github.com/apricode-cmd/vasp-bitflow.git
cd "crm vasp"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create `.env` file in the root directory:

```bash
# ====================
# DATABASE
# ====================
DATABASE_URL="postgresql://user:password@localhost:5432/apricode"
DIRECT_URL="postgresql://user:password@localhost:5432/apricode"

# ====================
# NEXTAUTH v5
# ====================
# Generate with: openssl rand -base64 32
AUTH_SECRET="your-super-secret-key-here-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# ====================
# APPLICATION
# ====================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Apricode Exchange"
NODE_ENV="development"

# ====================
# KYC PROVIDERS
# ====================
# KYCAID
KYCAID_API_KEY="your-kycaid-api-key"
KYCAID_FORM_ID="your-form-id"
KYCAID_WEBHOOK_SECRET="your-webhook-secret"
KYCAID_BASE_URL="https://api.kycaid.com"

# Sumsub (Alternative)
SUMSUB_APP_TOKEN="your-sumsub-app-token"
SUMSUB_SECRET_KEY="your-sumsub-secret"
SUMSUB_BASE_URL="https://api.sumsub.com"
SUMSUB_LEVEL_NAME="basic-kyc-level"

# ====================
# EXCHANGE RATE PROVIDERS
# ====================
# CoinGecko (Free tier)
COINGECKO_API_KEY=""
COINGECKO_API_URL="https://api.coingecko.com/api/v3"

# Kraken (Professional)
KRAKEN_API_KEY="your-kraken-api-key"
KRAKEN_API_SECRET="your-kraken-secret"
KRAKEN_BASE_URL="https://api.kraken.com"

# ====================
# EMAIL SERVICE
# ====================
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"
EMAIL_FROM="noreply@apricode.io"
EMAIL_FROM_NAME="Apricode Exchange"

# ====================
# FILE STORAGE
# ====================
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxx"

# ====================
# REDIS (Optional)
# ====================
REDIS_URL="redis://localhost:6379"
REDIS_TOKEN=""

# ====================
# SECURITY
# ====================
# Encryption key for sensitive data
ENCRYPTION_KEY="32-char-hex-key-here"

# ====================
# PLATFORM CONFIGURATION
# ====================
PLATFORM_FEE="0.015"
MIN_ORDER_VALUE_EUR="10"
MAX_ORDER_VALUE_EUR="100000"

# ====================
# ADMIN ACCESS
# ====================
ADMIN_EMAIL="admin@apricode.io"
ADMIN_PASSWORD="SecureAdmin123!"
SUPER_ADMIN_EMAIL="super@apricode.io"

# ====================
# MONITORING (Optional)
# ====================
SENTRY_DSN=""
LOGFLARE_API_KEY=""
LOGFLARE_SOURCE_TOKEN=""
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed initial data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Access Admin Panel

Navigate to [http://localhost:3000/admin](http://localhost:3000/admin)

**Default Admin Credentials:**
- Email: `admin@apricode.io`
- Password: `SecureAdmin123!`

**⚠️ Change these immediately in production!**

---

## ⚙️ Configuration

### System Settings

Configure through Admin Panel → Settings:

#### 1. Branding
- Company name and logo
- Primary brand color
- Email footer customization

#### 2. Legal Information
- Company legal name
- Registration number
- Tax/VAT number
- License numbers
- Contact information

#### 3. KYC Provider
- Choose between KYCAID or Sumsub
- Configure API credentials
- Set verification levels
- Customize required documents

#### 4. Exchange Rate Provider
- CoinGecko (free, rate-limited)
- Kraken (professional, authenticated)
- Automatic fallback configuration

#### 5. Trading Pairs
- Enable/disable currency pairs
- Set minimum/maximum limits
- Configure fees per pair
- Spread configuration

#### 6. Payment Methods
- Bank account details
- Crypto wallet addresses
- Payment instructions
- Processing times

#### 7. Email Templates
- Customize all email templates
- Visual editor with preview
- Variable interpolation
- Multi-language support

---

## 📘 Usage

### User Journey

#### 1. Registration
```
User navigates to /register
→ Fills email, password, profile info
→ Receives verification email
→ Confirms email address
→ Auto-login to dashboard
```

#### 2. KYC Verification
```
User goes to /kyc
→ Fills personal information form
→ Uploads identity documents
→ Submits for review
→ KYC provider verifies
→ Status updated via webhook
→ User notified of approval/rejection
```

#### 3. Place Order
```
User goes to /buy
→ Selects cryptocurrency
→ Enters amount
→ Provides wallet address
→ Reviews exchange rate & fees
→ Creates order
→ Receives payment instructions
```

#### 4. Payment
```
User transfers fiat to provided bank account
→ Uploads payment proof (optional)
→ Admin receives notification
→ Admin verifies payment
→ Order status: PAYMENT_RECEIVED
```

#### 5. Fulfillment
```
Admin processes order
→ Sends cryptocurrency
→ Updates order with tx hash
→ Order status: COMPLETED
→ User receives email notification
→ User can download invoice
```

### Admin Operations

#### Daily Tasks
1. Review new KYC submissions
2. Check pending orders
3. Verify incoming payments
4. Process approved orders
5. Monitor system health

#### Weekly Tasks
1. Review audit logs
2. Check failed transactions
3. Update exchange rates (if manual)
4. Export financial reports
5. Review user feedback

#### Monthly Tasks
1. Financial reconciliation
2. Generate compliance reports
3. Review security logs
4. Update legal documents
5. Platform maintenance

---

## 🔌 API Reference

### Authentication Endpoints

#### POST `/api/auth/register`
Register new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "acceptedTerms": true
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "cuid",
    "email": "user@example.com"
  }
}
```

#### POST `/api/auth/callback/credentials`
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "totpToken": "123456"
}
```

### KYC Endpoints

#### POST `/api/kyc/start`
Initialize KYC verification session.

**Response:**
```json
{
  "success": true,
  "sessionId": "session_id",
  "redirectUrl": "https://kycaid.com/verify/..."
}
```

#### GET `/api/kyc/status`
Get current KYC status.

**Response:**
```json
{
  "status": "APPROVED",
  "submittedAt": "2024-01-01T00:00:00Z",
  "reviewedAt": "2024-01-02T00:00:00Z"
}
```

### Order Endpoints

#### POST `/api/orders`
Create new order.

**Request:**
```json
{
  "currencyCode": "BTC",
  "fiatCurrencyCode": "EUR",
  "cryptoAmount": 0.1,
  "walletAddress": "bc1q...",
  "paymentMethodCode": "SEPA",
  "blockchainCode": "BTC"
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_id",
    "paymentReference": "ORD-2024-001",
    "totalFiat": 4500.00,
    "status": "PENDING"
  }
}
```

#### GET `/api/orders`
List user's orders.

**Query Parameters:**
- `status`: Filter by status
- `page`: Page number
- `limit`: Items per page

#### GET `/api/orders/[id]`
Get order details.

#### GET `/api/orders/[id]/invoice`
Download order invoice (PDF).

### Admin Endpoints

#### GET `/api/admin/orders`
List all orders (admin only).

**Query Parameters:**
- `status`: Filter by status
- `userId`: Filter by user
- `from`: Date range start
- `to`: Date range end
- `page`: Page number
- `limit`: Items per page

#### PATCH `/api/admin/orders/[id]`
Update order status.

**Request:**
```json
{
  "status": "PAYMENT_RECEIVED",
  "adminNotes": "Payment verified",
  "payInData": {
    "amount": 4500.00,
    "reference": "BANK-TXN-123"
  }
}
```

#### GET `/api/admin/orders/[id]/report`
Generate order PDF report.

#### GET `/api/admin/stats`
Get dashboard statistics.

**Response:**
```json
{
  "orders": {
    "total": 1250,
    "pending": 45,
    "completed": 1100
  },
  "users": {
    "total": 850,
    "active": 420
  },
  "kyc": {
    "pending": 12,
    "approved": 780
  },
  "volume": {
    "totalFiat": 5250000.00
  }
}
```

#### GET `/api/admin/users`
List all users.

#### GET `/api/admin/users/[id]`
Get user details.

#### GET `/api/admin/users/[id]/report`
Generate user compliance report (PDF).

### Rate Endpoints

#### GET `/api/rates`
Get current exchange rates.

**Response:**
```json
{
  "rates": [
    {
      "currencyCode": "BTC",
      "fiatCurrencyCode": "EUR",
      "rate": 45000.00,
      "provider": "KRAKEN",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

## 🔐 Security & Compliance

### Security Measures

#### Authentication
- ✅ **NextAuth v5** with JWT sessions
- ✅ **Password Hashing** (bcrypt, 10 rounds)
- ✅ **Two-Factor Authentication** (TOTP)
- ✅ **Passkey Support** (WebAuthn/FIDO2)
- ✅ **Session Timeout** (30 minutes idle)
- ✅ **Concurrent Session Control**

#### Authorization
- ✅ **Role-Based Access Control** (RBAC)
- ✅ **Route Protection** (middleware)
- ✅ **API Authentication** (API keys)
- ✅ **Step-Up MFA** for sensitive operations

#### Data Protection
- ✅ **Input Validation** (Zod schemas)
- ✅ **SQL Injection Protection** (Prisma ORM)
- ✅ **XSS Protection** (React auto-escaping)
- ✅ **CSRF Protection** (NextAuth built-in)
- ✅ **Encryption** for sensitive data (AES-256)
- ✅ **Secure Headers** (HSTS, CSP, X-Frame-Options)

#### Audit & Monitoring
- ✅ **Admin Audit Logs** - all admin actions tracked
- ✅ **User Activity Logs** - login, orders, profile changes
- ✅ **Security Events** - failed logins, MFA attempts
- ✅ **Webhook Signature Verification**

### Compliance

#### KYC/AML
- ✅ **Mandatory KYC** before first purchase
- ✅ **Document Verification** (ID, proof of address)
- ✅ **PEP/Sanctions Screening** (via KYCAID/Sumsub)
- ✅ **Continuous Monitoring**
- ✅ **Audit Trail** for all verifications

#### Data Privacy (GDPR)
- ✅ **Data Minimization** - collect only necessary data
- ✅ **Right to Access** - users can export their data
- ✅ **Right to Erasure** - account deletion functionality
- ✅ **Data Portability** - export in machine-readable format
- ✅ **Privacy Policy** and Terms of Service

#### Financial Compliance
- ✅ **Transaction Monitoring**
- ✅ **Suspicious Activity Reporting**
- ✅ **Record Keeping** (5+ years)
- ✅ **Reporting Tools** for regulators

---

## 🚀 Deployment

### Vercel Deployment (Recommended)

#### Prerequisites
- Vercel account
- GitHub repository
- Supabase PostgreSQL database
- Redis instance (optional)

#### Step 1: Database Setup

**Supabase:**
1. Create project at [supabase.com](https://supabase.com)
2. Get connection strings:
   - `DATABASE_URL` (pooled)
   - `DIRECT_URL` (direct)
3. Save for later

#### Step 2: Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import Git repository
3. Configure project:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

#### Step 3: Environment Variables

Add all variables from `.env.example` in Vercel dashboard:

```bash
# Critical variables:
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
AUTH_SECRET="..."
NEXTAUTH_URL="https://your-domain.com"
# ... (all other env vars)
```

#### Step 4: Deploy

```bash
git push origin main
```

Vercel will automatically deploy.

#### Step 5: Post-Deploy

```bash
# Run migrations on production database
npx prisma migrate deploy --schema=./prisma/schema.prisma

# (Optional) Seed production data
npx prisma db seed
```

### Custom Server Deployment

#### Using Docker

```bash
# Build image
docker build -t apricode-exchange .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e AUTH_SECRET="..." \
  apricode-exchange
```

#### Using PM2

```bash
# Build application
npm run build

# Start with PM2
pm2 start npm --name "apricode" -- start

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

---

## 🔧 Operations

### Database Management

#### Backup Database

```bash
# Automatic backup (recommended before migrations)
npm run db:backup

# Manual PostgreSQL backup
pg_dump -U postgres -d apricode > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Restore Database

```bash
# Using npm script
npm run db:restore

# Manual restore
psql -U postgres -d apricode < backup_file.sql
```

#### Migrations

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations to production
npx prisma migrate deploy

# Reset database (⚠️ DELETES ALL DATA)
npx prisma migrate reset
```

#### Prisma Studio

```bash
# Open database GUI
npx prisma studio
```

### Monitoring

#### Application Logs

```bash
# View application logs (Vercel)
vercel logs

# View application logs (PM2)
pm2 logs apricode

# View error logs only
pm2 logs apricode --err
```

#### Database Monitoring

```bash
# PostgreSQL connections
SELECT count(*) FROM pg_stat_activity;

# Long-running queries
SELECT pid, query, query_start 
FROM pg_stat_activity 
WHERE state = 'active' 
  AND query_start < NOW() - INTERVAL '1 minute';
```

#### Redis Monitoring

```bash
# Connect to Redis
redis-cli

# Check memory usage
INFO memory

# Monitor commands in real-time
MONITOR
```

### Performance Optimization

#### Enable Redis Caching

```bash
# Install Redis
npm install ioredis

# Set REDIS_URL in .env
REDIS_URL="redis://localhost:6379"
```

#### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_orders_user_status ON "Order"(userId, status);
CREATE INDEX idx_orders_created ON "Order"(createdAt DESC);

-- Analyze tables
ANALYZE "Order";
ANALYZE "User";
```

#### Image Optimization

- Use Next.js `<Image>` component
- Enable Vercel Image Optimization
- Compress uploaded files

---

## 🐛 Troubleshooting

### Common Issues

#### Build Errors

**Error:** `Prisma Client not generated`

```bash
npx prisma generate
npm run build
```

**Error:** `Module not found`

```bash
rm -rf node_modules package-lock.json
npm install
```

#### Database Issues

**Error:** `Can't reach database server`

```bash
# Check PostgreSQL is running
psql -U postgres

# Test connection
psql $DATABASE_URL
```

**Error:** `Migration failed`

```bash
# Reset migration state
npx prisma migrate resolve --rolled-back migration_name

# Or reset database (⚠️ loses data)
npx prisma migrate reset
```

#### Authentication Issues

**Error:** `[next-auth][error][JWT_SESSION_ERROR]`

- Check `AUTH_SECRET` is set correctly
- Regenerate with: `openssl rand -base64 32`
- Clear browser cookies

**Error:** `Callback URL mismatch`

- Check `NEXTAUTH_URL` matches your domain
- Include protocol (`https://`)

#### Deployment Issues

**Vercel Error:** "Commit author is required"

```bash
# Set Git author (use GitHub email)
git config --global user.name "Your Name"
git config --global user.email "github@email.com"

# Trigger deploy
git commit --allow-empty -m "chore: trigger deploy"
git push origin main
```

**Vercel Error:** "Build timeout"

- Increase timeout in Vercel settings
- Optimize build process
- Check for circular dependencies

#### KYC Integration Issues

**KYCAID:** "Invalid signature"

- Verify `KYCAID_WEBHOOK_SECRET`
- Check webhook URL is publicly accessible
- Review webhook logs in KYCAID dashboard

**Sumsub:** "Token expired"

- Check system time is synchronized
- Regenerate token
- Verify API credentials

#### Email Delivery Issues

**Resend:** "Email not sending"

```bash
# Test email configuration
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"onboarding@resend.dev","to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
```

### Debug Mode

Enable detailed logging:

```bash
# .env
NODE_ENV="development"
DEBUG="next-auth:*,prisma:*"
LOG_LEVEL="debug"
```

### Getting Help

1. Check [Documentation](#-documentation)
2. Review [API Reference](#-api-reference)
3. Search existing issues
4. Contact support: support@apricode.io

---

## 📚 Documentation

### Additional Documentation

- **API Documentation**: [docs/current/API_DOCUMENTATION.md](docs/current/API_DOCUMENTATION.md)
- **Deployment Guide**: [docs/current/VERCEL_DEPLOYMENT_GUIDE.md](docs/current/VERCEL_DEPLOYMENT_GUIDE.md)
- **Database Backup**: [docs/current/DATABASE_BACKUP_GUIDE.md](docs/current/DATABASE_BACKUP_GUIDE.md)
- **Testing Guide**: [docs/current/TESTING.md](docs/current/TESTING.md)
- **Performance**: [docs/current/README_PERFORMANCE.md](docs/current/README_PERFORMANCE.md)
- **Security**: [docs/current/INTEGRATION_SECURITY.md](docs/current/INTEGRATION_SECURITY.md)
- **Prisma Schema**: [PRISMA_ORDER_STRUCTURE.md](PRISMA_ORDER_STRUCTURE.md)

### Project Rules

- **API Standards**: [.cursor/rules/api.mdc](.cursor/rules/api.mdc)
- **Database Standards**: [.cursor/rules/database.mdc](.cursor/rules/database.mdc)
- **Frontend Standards**: [.cursor/rules/frontend.mdc](.cursor/rules/frontend.mdc)
- **Testing Standards**: [.cursor/rules/testing.mdc](.cursor/rules/testing.mdc)

---

## 🤝 Contributing

### Development Workflow

1. Create feature branch from `main`
2. Make changes following project standards
3. Test locally (`npm run dev`)
4. Run linter (`npm run lint`)
5. Type check (`npm run type-check`)
6. Commit with conventional commits
7. Push and create Pull Request

### Commit Convention

```
type(scope): description

feat: add user export feature
fix: resolve KYC webhook issue
docs: update README
chore: update dependencies
```

### Code Standards

- **TypeScript** strict mode enabled
- **ESLint** for code quality
- **Prettier** for formatting
- **Zod** for validation
- **JSDoc** for public APIs

---

## 📄 License

**Proprietary License** - Apricode Exchange

All rights reserved. This software and associated documentation files (the "Software") are the proprietary property of Apricode Exchange. Unauthorized copying, modification, distribution, or use of this Software is strictly prohibited.

---

## 👥 Team & Support

### Development Team

- **Project Lead**: Bohdan Kononenko
- **Organization**: Apricode Studio
- **Email**: apricode.studio@gmail.com

### Support

- **Email**: support@apricode.io
- **Documentation**: This README
- **Status Page**: status.apricode.io

### Production Instances

- **BitFlow**: [app.bitflow.biz](https://app.bitflow.biz)

---

## 📊 Project Status

![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

**Current Version**: 1.1.0  
**Last Updated**: November 2024  
**Status**: ✅ Production Ready

### Recent Updates

- ✅ Order PDF Reports with branding
- ✅ Clickable Recent Orders in dashboard
- ✅ Order notes update without status change
- ✅ Complete Prisma schema documentation
- ✅ Toast notification improvements
- ✅ Admin authentication fixes

---

<div align="center">

**Built with ❤️ by Apricode Studio**

**Powered by Next.js 14, TypeScript, and Prisma**

[⬆ Back to Top](#-apricode-exchange---enterprise-cryptocurrency-exchange-platform)

</div>
