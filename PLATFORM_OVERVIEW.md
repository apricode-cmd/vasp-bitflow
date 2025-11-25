# 🏢 Apricode Exchange - Enterprise Cryptocurrency Platform

<div align="center">

![Version](https://img.shields.io/badge/version-2.0-blue.svg)
![Status](https://img.shields.io/badge/status-Production-success.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)

**Enterprise-Grade Cryptocurrency Exchange Platform with Full Compliance & Advanced CRM**

🌐 [Live Demo](https://app.bitflow.biz) • 📚 [Documentation](#documentation) • 🔐 [Security](#security) • 🚀 [Features](#features)

</div>

---

## 📋 Содержание

- [О Платформе](#-о-платформе)
- [Ключевые Возможности](#-ключевые-возможности)
- [Архитектура](#-архитектура)
- [Технический Стек](#-технический-стек)
- [Безопасность](#-безопасность-и-комплаенс)
- [Реализованные Модули](#-реализованные-модули)
- [Интеграции](#-интеграции)
- [Дорожная Карта](#-дорожная-карта)
- [Deployment](#-deployment)

---

## 🎯 О Платформе

**Apricode Exchange** - это комплексная enterprise-платформа для покупки криптовалюты за фиатные деньги с обязательной KYC верификацией и профессиональной CRM-панелью для администраторов.

### 🌟 Почему Apricode Exchange?

| Характеристика | Описание |
|---------------|----------|
| ✅ **Production Ready** | Успешно работает в продакшене ([app.bitflow.biz](https://app.bitflow.biz), [app.payplanet.pl](https://app.payplanet.pl)) |
| 🔐 **Enterprise Security** | Multi-factor authentication, Passkeys (WebAuthn), Step-up MFA, RBAC |
| 📊 **Professional CRM** | Полнофункциональная админ-панель с 100+ функциями управления |
| 🎯 **Compliance First** | Mandatory KYC/AML, comprehensive audit logging, регуляторная отчетность |
| 🏗️ **Scalable Architecture** | Модульная архитектура, микросервисная готовность, horizontal scaling |
| 🔌 **Integration Ready** | Sumsub, KYCAID, CoinGecko, Tatum, Resend, 20+ готовых интеграций |
| 🎨 **White-Label Ready** | Полная кастомизация брендинга, мультиязычность, виджеты |
| 📈 **Advanced Analytics** | Real-time дашборды, детальная аналитика, бизнес-метрики |

---

## 🚀 Ключевые Возможности

### 👥 Для Клиентов

#### 🔐 Аутентификация и Безопасность
```
✓ Email/Password регистрация с автологином
✓ Two-Factor Authentication (TOTP, Google Authenticator)
✓ Passkey Support (WebAuthn/FIDO2) - биометрическая аутентификация
✓ Secure session management (JWT, 30 дней)
✓ Password recovery с email верификацией
✓ Device fingerprinting и fraud detection
```

#### 📋 KYC Верификация
```
✓ Обязательная KYC перед первой покупкой
✓ Multi-Provider Support: Sumsub, KYCAID
✓ Document Upload с camera capture на мобильных
✓ AI-powered verification (liveness detection, document OCR)
✓ Real-time status tracking в личном кабинете
✓ Webhook integration для мгновенных обновлений
✓ Resubmission flow для исправления ошибок (RETRY/FINAL)
✓ QR code для прохождения KYC на мобильном устройстве
```

#### 💰 Покупка Криптовалюты
```
Поддерживаемые Криптовалюты:
• Bitcoin (BTC)
• Ethereum (ETH) + ERC-20 токены
• Tether (USDT) - ERC-20, TRC-20, BEP-20
• Solana (SOL)
• Возможность добавления любых других монет и токенов

Фиатные Валюты:
• EUR (Euro)
• PLN (Polish Zloty)
• Расширяемо на любые валюты

Особенности:
✓ Real-time exchange rates (CoinGecko, Kraken, Binance)
✓ Transparent pricing с 1.5% platform fee
✓ Flexible limits по уровням KYC
✓ Manual rate overrides для спецпредложений
✓ Rate caching для стабильности
✓ Historical rate tracking
```

#### 📊 Личный Кабинет
```
✓ Order history с детальной информацией
✓ Transaction timeline (все изменения статусов)
✓ Wallet management (добавление, редактирование адресов)
✓ KYC status monitoring
✓ Profile management (personal info, security settings)
✓ Real-time notifications (email + in-app)
✓ Invoice generation для всех покупок
✓ Payment proof upload
```

---

### 👨‍💼 Для Администраторов

#### 📈 CRM Dashboard
```
Real-time Statistics:
• Total Orders (lifetime, today, week, month)
• Revenue metrics (EUR, PLN, BTC equivalent)
• Active Users (registered, verified, buyers)
• KYC Statistics (pending, approved, rejected, conversion rate)
• System health (integration status, uptime)

Interactive Features:
✓ Recent Activity Feed (последние 20 событий)
✓ Performance Indicators (conversion rates, avg processing time)
✓ Action Center (pending approvals, alerts)
✓ Interactive Charts (revenue trends, order volumes)
✓ Quick Navigation (8 fast-access cards)
✓ Auto-refresh каждые 30 секунд
```

#### 🛠️ Order Management
```
Kanban Board View:
✓ Drag-and-drop статусы (NEW → PENDING → CONFIRMED → PROCESSING → COMPLETED)
✓ Visual workflow с валидацией переходов
✓ Bulk operations (cancel, export)
✓ Search и фильтры по всем полям
✓ Color-coded статусы
✓ Transaction count per column

Table View:
✓ Advanced filters (status, date range, currency, amount)
✓ Multi-column sorting
✓ Pagination (10/25/50/100 per page)
✓ Export to CSV/Excel
✓ Bulk select и actions
✓ Custom column visibility

Order Details Page:
✓ Complete order information (amount, rates, fees, wallets)
✓ Transaction history timeline
✓ Payment proof viewer
✓ Status change history
✓ Admin notes (internal comments)
✓ TX hash management
✓ Manual status overrides с audit trail
```

#### 👥 User Management
```
✓ Complete user profiles (personal info, KYC status, order history)
✓ Block/Unblock users с причинами
✓ Activity tracking (login history, IP addresses)
✓ Order history per user
✓ KYC document review
✓ User segmentation (by KYC level, activity, volume)
✓ Bulk email notifications
```

#### 🔐 Admin Management (IAM)
```
Role-Based Access Control (RBAC):
• SUPER_ADMIN - full access
• ADMIN - standard administrator
• COMPLIANCE - compliance officer
• TREASURY_APPROVER - payment approvals
• FINANCE - financial operations
• SUPPORT - customer support
• READ_ONLY - view-only access

Permissions System:
✓ Granular permissions (resource.action)
✓ Dynamic permission checking
✓ Role-Permission mapping
✓ Separation of Duties (SoD)
  - Different admins for payout initiation/approval
  - 4-eyes principle для критических операций

Security Features:
✓ WebAuthn/Passkeys (FIDO2 authentication)
✓ TOTP (Google Authenticator)
✓ Backup codes для recovery
✓ Step-up MFA для критических действий
✓ Session management (view active sessions, revoke)
✓ IP whitelisting
✓ Emergency break-glass access
✓ Password rotation policies
```

#### 📋 KYC Management
```
✓ KYC queue (pending, reviewing)
✓ Document viewer (ID cards, passports, proof of address)
✓ Approve/Reject workflow с причинами
✓ Bulk operations
✓ Provider integration status
✓ Resubmission tracking (attempt counts)
✓ Manual override для special cases
✓ Export KYC data для compliance
✓ AML screening integration
```

#### 🎛️ System Configuration
```
Полный CRUD для всех справочников:
✓ Cryptocurrencies (название, symbol, logo, blockchain networks)
✓ Fiat Currencies (код, symbol, exchange rates)
✓ Trading Pairs (crypto + fiat, min/max limits, status)
✓ Rate Providers (CoinGecko, Kraken, Binance, priority)
✓ Fee Profiles (Standard, VIP, custom)
✓ KYC Levels (L0, L1, L2, limits matrix)
✓ Payment Methods (bank transfer, cards, crypto)
✓ Platform Wallets (BTC, ETH, USDT addresses)
✓ PSP Connectors (TPay, Stripe, Manual)
✓ Widgets (theme, logo, supported pairs)
✓ Legal Documents (T&C, Privacy Policy, AML Policy)
✓ Email Templates (welcome, KYC approved, order confirmed)

Integration Management:
✓ KYC Providers (KYCAID, Sumsub)
✓ Rate Providers (API key management, test connection)
✓ Email Service (Resend configuration)
✓ Blockchain Providers (Tatum, Infura)
✓ Payment Gateways
✓ Analytics & Monitoring

Manual Overrides:
✓ Manual rates (set custom exchange rates)
✓ Fee overrides per user/order
✓ Limit adjustments
✓ Status force-change с audit trail
```

#### 📊 Analytics & Reporting
```
✓ Revenue reports (daily, weekly, monthly, yearly)
✓ Order volume analytics
✓ Conversion funnel analysis
✓ KYC conversion rates
✓ Payment method statistics
✓ Currency popularity metrics
✓ User retention analytics
✓ Export to CSV/Excel/PDF
```

#### 🔍 Audit & Compliance
```
Comprehensive Audit Logging:
• AdminAuditLog - все действия администраторов
• UserAuditLog - действия клиентов
• KYC API Logs - все запросы к KYC провайдерам (request/response/timing)
• Webhook Logs - все входящие webhooks
• SystemLog - технические события

Что логируется:
✓ Who (actorType, actorId, actorEmail, actorRole)
✓ What (action, entityType, entityId)
✓ When (timestamp, timezone)
✓ Where (ipAddress, userAgent)
✓ Changes (diffBefore, diffAfter)
✓ Context (metadata, reason, MFA verification)
✓ Performance (API response times, slow queries)

Audit Features:
✓ Complete timeline visualization
✓ Search и фильтры по всем полям
✓ Export для регуляторов
✓ Immutable logs (freeze checksum, SHA-256)
✓ Long-term retention (GDPR compliant)
```

#### 🤖 Workflow Automation Engine
```
Visual No-Code Rule Engine:
✓ Drag-and-drop canvas (React Flow)
✓ Node types: Trigger, Condition, Action
✓ 7 trigger types (ORDER_CREATED, PAYIN_RECEIVED, KYC_APPROVED, etc.)
✓ 8 action types (FREEZE_ORDER, REJECT_TRANSACTION, SEND_EMAIL, etc.)
✓ JSON Logic compiler (graph → executable logic)
✓ Real-time validation
✓ Test panel для отладки

Execution Engine:
✓ Non-blocking execution
✓ Priority ordering
✓ Error handling & retry logic
✓ Execution history tracking
✓ Performance metrics
✓ Webhook triggers

Use Cases:
• Fraud detection (freeze suspicious orders)
• Auto-approval workflows (trusted users)
• Risk management (transaction limits)
• Compliance automation (AML checks)
• Customer notifications (custom triggers)
```

---

## 🏗️ Архитектура

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14 App Router (React Server Components)               │
│  • Client Portal (/app/(client))                               │
│  • Admin CRM (/app/(admin))                                    │
│  • Public API Documentation (/app/(public)/docs)               │
│  • Shared Components (/components)                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (100+ endpoints)                 │
├─────────────────────────────────────────────────────────────────┤
│  /api/auth/*          - Authentication (NextAuth v5)           │
│  /api/kyc/*           - KYC operations                         │
│  /api/orders/*        - Order management                       │
│  /api/admin/*         - Admin operations                       │
│  /api/webhooks/*      - External webhooks                      │
│  /api/v1/*            - Public API v1                          │
│  /api/workflows/*     - Automation engine                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Business Logic Layer                      │
├─────────────────────────────────────────────────────────────────┤
│  Services:                                                      │
│  • kyc.service.ts           - KYC orchestration                │
│  • order.service.ts         - Order processing                 │
│  • audit.service.ts         - Audit logging                    │
│  • integration.service.ts   - External integrations            │
│  • workflow.service.ts      - Automation engine                │
│  • rate.service.ts          - Exchange rates                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Prisma ORM → PostgreSQL 15                                    │
│  • 40+ models, 2000+ lines schema                              │
│  • 100+ indexes for optimization                               │
│  • Full referential integrity                                  │
│  • Row-level security ready                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    External Integrations                        │
├─────────────────────────────────────────────────────────────────┤
│  KYC:          Sumsub, KYCAID                                  │
│  Rates:        CoinGecko, Kraken, Binance                      │
│  Email:        Resend                                           │
│  Blockchain:   Tatum, Infura, QuickNode                        │
│  Storage:      Vercel Blob                                      │
│  Monitoring:   Sentry, LogTail                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema Overview

```sql
-- 40+ таблиц, организованные по модулям:

Core (Identity & Access):
• User, Profile, Admin
• RoleModel, Permission, RolePermission
• AdminSession, WebAuthnCredential
• AdminTwoFactorAuth, MfaChallenge

KYC (Verification):
• KycSession, KycProfile, KycDocument
• KycProvider, KycFormField, KycFormData
• KycLevel, UserKycLevel, LimitsMatrix

Financial (Orders & Payments):
• Order, OrderStatusHistory
• PayIn, PayOut, PaymentProof
• PaymentMethod, PaymentAccount
• PlatformWallet, UserWallet
• Transaction

Assets (Currencies & Rates):
• Currency, FiatCurrency, TradingPair
• RateProvider, RateSnapshot, RateHistory
• ManualRate, FeeProfile

Blockchain:
• BlockchainNetwork, CurrencyBlockchainNetwork

Audit & Logging:
• AdminAuditLog, UserAuditLog, AuditLog
• SystemLog, MfaEvent, EmailLog

Configuration:
• SystemSettings, IntegrationSetting
• PspConnector, BankDetails
• LegalDocument, DocumentTemplate
• WidgetConfig, OrderStatusConfig

Automation:
• Workflow, WorkflowExecution

Security:
• ApiKey, ApiKeyUsage
• IPBlacklist, SessionRevocation
• OneTimeAuthToken
```

---

## 💻 Технический Стек

### Frontend

| Технология | Версия | Применение |
|------------|--------|------------|
| **Next.js** | 14.2 | App Router, RSC, Server Actions |
| **React** | 18.3 | UI framework |
| **TypeScript** | 5.5 | Strict mode, полная типизация |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **shadcn/ui** | Latest | 50+ UI компонентов |
| **Radix UI** | Latest | Headless UI primitives |
| **React Hook Form** | 7.x | Form management |
| **Zod** | 3.x | Schema validation |
| **TanStack Table** | 8.x | Data tables |
| **Recharts** | 2.x | Charts и графики |
| **Lexical** | Latest | Rich text editor |
| **React Flow** | 11.x | Workflow canvas |
| **SimpleWebAuthn** | 9.x | Passkeys implementation |

### Backend

| Технология | Версия | Применение |
|------------|--------|------------|
| **Node.js** | 20+ | Runtime |
| **PostgreSQL** | 15 | Primary database |
| **Prisma** | 5.22 | ORM, migrations |
| **NextAuth.js** | 5.0-beta | Authentication |
| **bcryptjs** | 2.x | Password hashing |
| **jsonwebtoken** | 9.x | JWT tokens |
| **crypto** | Native | AES-256-GCM encryption |
| **json-logic-js** | 2.x | Rule engine |
| **zod** | 3.x | Runtime validation |

### Infrastructure

| Сервис | Применение | Status |
|--------|------------|--------|
| **Vercel** | Hosting, Edge Functions, CI/CD | ✅ Production |
| **Supabase** | PostgreSQL database, Auth helpers | ✅ Production |
| **Vercel Blob** | File storage (documents, images) | ✅ Production |
| **GitHub** | Version control, Actions | ✅ Production |

### Мониторинг и Аналитика

| Сервис | Применение | Status |
|--------|------------|--------|
| **Sentry** | Error tracking | 🔄 Ready |
| **LogTail** | Log aggregation | 🔄 Ready |
| **Vercel Analytics** | Performance monitoring | ✅ Active |
| **Vercel Speed Insights** | Web vitals | ✅ Active |

---

## 🔐 Безопасность и Комплаенс

### Authentication & Authorization

```typescript
// Dual Authentication System

// 1. Client Auth (auth-client.ts)
- NextAuth v5 Credentials Provider
- Email/Password
- JWT sessions (30 дней)
- 2FA support (TOTP)
- Session revocation
- Failed login tracking

// 2. Admin Auth (auth-admin.ts)
- Separate NextAuth instance
- Email/Password + SSO ready
- WebAuthn/Passkeys (FIDO2)
- TOTP (Google Authenticator)
- Backup codes (10 одноразовых кодов)
- Step-up MFA для критических действий
- Emergency break-glass access
- Session timeout (configurable)
```

### Encryption & Data Protection

```typescript
// Password Security
- bcrypt hashing (10 rounds)
- Password strength validation (min 8 chars, uppercase, lowercase, number)
- Password history tracking
- Secure password reset flow

// Data Encryption
- AES-256-GCM для API keys и sensitive data
- TLS 1.3 для всех соединений
- Encrypted database backups
- PII data encryption at rest

// API Security
- HMAC signatures для webhooks
- Rate limiting (100 req/hour для Public API)
- IP whitelisting для admin panel
- CORS configuration
- CSRF protection (NextAuth built-in)
```

### Compliance Features

```typescript
// GDPR Compliance
✓ Data retention policies
✓ Right to erasure (delete account)
✓ Data portability (export all data)
✓ Consent management
✓ Privacy policy enforcement
✓ Cookie consent

// AML/KYC Compliance
✓ Mandatory KYC for all users
✓ Document verification (AI-powered)
✓ PEP screening
✓ Sanctions lists check
✓ Source of funds verification
✓ Transaction monitoring
✓ Suspicious activity reporting

// Audit Trail
✓ Immutable logs (SHA-256 checksum)
✓ Who, What, When, Where, Why tracking
✓ Change history (before/after diff)
✓ MFA verification tracking
✓ API call logging (request/response/timing)
✓ Long-term retention (7 years)
```

### Security Testing

```bash
# Automated Security Checks
✓ Dependency vulnerability scanning (npm audit)
✓ Code quality analysis (ESLint, TypeScript strict)
✓ SQL injection prevention (Prisma parameterized queries)
✓ XSS protection (React automatic escaping)
✓ CSRF protection (NextAuth tokens)
✓ Input validation (Zod schemas everywhere)
```

---

## ✅ Реализованные Модули

### Core MVP ✅ (100%)

- [x] User registration & authentication
- [x] KYC verification (Sumsub + KYCAID)
- [x] Cryptocurrency purchase flow
- [x] Order management (Kanban + Table)
- [x] Admin CRM panel
- [x] Email notifications (Resend)
- [x] Real-time exchange rates (CoinGecko)
- [x] Payment proof upload
- [x] Transaction tracking

### Security ✅ (100%)

- [x] Password hashing (bcrypt, 10 rounds)
- [x] JWT sessions (30 days)
- [x] 2FA (TOTP via Google Authenticator)
- [x] WebAuthn/Passkeys (FIDO2)
- [x] Step-up MFA для критических операций
- [x] API key authentication
- [x] Rate limiting (100 req/hour)
- [x] CSRF protection (NextAuth)
- [x] XSS protection (React)
- [x] SQL injection protection (Prisma)
- [x] Input validation (Zod everywhere)

### CRM Features ✅ (100%)

- [x] Full CRUD для всех справочников (15+)
- [x] Resource management UI
- [x] Integration management (20+ providers)
- [x] User management (view, block, activity)
- [x] Admin management (IAM system)
- [x] Role & Permission system (RBAC)
- [x] Comprehensive audit logging
- [x] Statistics dashboard (real-time)
- [x] Advanced filters & search
- [x] Bulk operations
- [x] Export to CSV/Excel

### Advanced Features ✅ (100%)

- [x] Kanban board для заказов (drag-and-drop)
- [x] Document upload (Vercel Blob)
- [x] Public API v1 (REST)
- [x] Dynamic KYC forms (configurable)
- [x] Payment accounts management
- [x] Platform wallets (multi-currency)
- [x] Manual rate overrides
- [x] Legal documents editor (Lexical)
- [x] Session management (view, revoke)
- [x] IP blacklisting
- [x] Email templates (customizable)
- [x] Webhook processing (HMAC verified)

### Identity & Access Management ✅ (100%)

- [x] Separate Admin model (vs User)
- [x] RBAC system (7 predefined roles)
- [x] Granular permissions (resource.action)
- [x] WebAuthn/Passkeys (FIDO2)
- [x] Step-up MFA (для approval operations)
- [x] Separation of Duties (SoD)
- [x] Emergency break-glass access
- [x] Session revocation
- [x] Admin activity tracking (audit log)
- [x] MFA recovery codes

### KYC Integration ✅ (100%)

- [x] Multi-provider architecture (Sumsub, KYCAID)
- [x] WebSDK integration (iframe + modal)
- [x] Document upload с camera capture
- [x] Liveness detection (face matching)
- [x] Resubmission flow (RETRY/FINAL)
- [x] Webhook processing (real-time updates)
- [x] QR code для mobile verification
- [x] API call logging (full request/response)
- [x] Reject label mapping (40+ labels)
- [x] Problematic document detection
- [x] Admin review interface

### Workflow Automation ✅ (100%)

- [x] Visual no-code canvas (React Flow)
- [x] Node types: Trigger, Condition, Action
- [x] Graph-to-JSON-Logic compiler
- [x] Runtime execution engine
- [x] Test panel для отладки
- [x] Execution history tracking
- [x] Priority ordering
- [x] Error handling & retry
- [x] Database integration (Workflow, WorkflowExecution)
- [x] API endpoints (CRUD + test + execute)

---

## 🔌 Интеграции

### KYC Providers

| Провайдер | Статус | Функции | Документация |
|-----------|--------|---------|--------------|
| **Sumsub** | ✅ Production | Document verification, Liveness check, WebSDK, Webhooks | [Sumsub Docs](https://docs.sumsub.com) |
| **KYCAID** | ✅ Production | Document verification, Forms, Webhooks | [KYCAID Docs](https://docs.kycaid.com) |

**Capabilities:**
- Document upload (passport, ID card, driver license)
- Proof of address verification
- Liveness detection (selfie with face matching)
- AML/PEP screening
- Real-time status updates via webhooks
- Multi-language support
- Mobile-optimized (QR codes for SDK)

### Exchange Rate Providers

| Провайдер | Статус | Обновление | API Limit |
|-----------|--------|------------|-----------|
| **CoinGecko** | ✅ Production | Real-time | Free tier: 50 calls/min |
| **Kraken** | 🔄 Ready | Real-time | Public API: unlimited |
| **Binance** | 🔄 Ready | Real-time | Public API: 1200/min |

**Features:**
- Historical rate tracking
- Rate caching (5 minute TTL)
- Manual rate overrides
- Multi-source fallback
- Rate snapshots для отчетности

### Email Service

| Провайдер | Статус | Функции |
|-----------|--------|---------|
| **Resend** | ✅ Production | Transactional emails, Templates, Analytics |

**Email Types:**
- Welcome email (registration)
- KYC approved/rejected
- Order confirmation
- Payment received
- Crypto sent
- Password reset
- 2FA setup
- Admin notifications

### Blockchain Providers

| Провайдер | Статус | Networks | Use Case |
|-----------|--------|----------|----------|
| **Tatum** | 🔄 Ready | BTC, ETH, SOL, 40+ | Wallet generation, Transaction monitoring |
| **Infura** | 🔄 Ready | Ethereum, Polygon | RPC access |
| **QuickNode** | 🔄 Ready | Multi-chain | High-performance RPC |

### Storage

| Провайдер | Статус | Use Case |
|-----------|--------|----------|
| **Vercel Blob** | ✅ Production | Documents, Payment proofs, KYC docs, Images |

### Monitoring

| Провайдер | Статус | Функции |
|-----------|--------|---------|
| **Sentry** | 🔄 Ready | Error tracking, Performance monitoring |
| **LogTail** | 🔄 Ready | Log aggregation, Search |
| **Vercel Analytics** | ✅ Active | Traffic, Performance, Web Vitals |

---

## 🗺️ Дорожная Карта

### ✅ Phase 1: MVP (COMPLETED)

**Core Features:**
- [x] User authentication & registration
- [x] KYC verification (mandatory)
- [x] Crypto purchase flow (BTC, ETH, USDT, SOL)
- [x] Bank transfer payments (SEPA/SWIFT)
- [x] Admin order management
- [x] Email notifications
- [x] Basic CRM dashboard

**Timeline:** Q1 2025  
**Status:** ✅ **DEPLOYED TO PRODUCTION**

---

### ✅ Phase 1.5: Enterprise Features (COMPLETED)

**Advanced CRM:**
- [x] Full CRUD для всех справочников
- [x] Kanban board для заказов
- [x] Advanced filters & bulk operations
- [x] Resource management UI
- [x] Integration management

**Security & Compliance:**
- [x] Admin IAM system (separate auth)
- [x] RBAC & granular permissions
- [x] WebAuthn/Passkeys
- [x] Step-up MFA
- [x] Comprehensive audit logging

**Advanced Features:**
- [x] Public API v1
- [x] Dynamic KYC forms
- [x] Manual rate overrides
- [x] Legal document editor
- [x] Workflow automation engine

**Timeline:** Q2-Q3 2025  
**Status:** ✅ **DEPLOYED TO PRODUCTION**

---

### 🔄 Phase 2: Automation & Scale (Q4 2025)

**Payment Automation:**
- [ ] PSP Integration (Stripe, Revolut Business)
- [ ] Auto-confirm bank transfers (API banking)
- [ ] Auto-send crypto (Tatum integration)
- [ ] Payment reconciliation automation

**Crypto Selling:**
- [ ] Sell flow (client sends crypto → receives fiat)
- [ ] PayIn crypto monitoring
- [ ] Auto-detect incoming transactions
- [ ] PayOut fiat to bank accounts

**Advanced Features:**
- [ ] Multi-signature wallets
- [ ] Cold storage integration
- [ ] Advanced risk management
- [ ] Automated compliance reporting

**Timeline:** Q4 2025  
**Status:** 🚧 **IN PLANNING**

---

### 🎯 Phase 3: White-Label & Expansion (2026)

**White-Label Widget:**
- [ ] Embeddable iframe widget
- [ ] Partner API (create users, track orders)
- [ ] Custom branding per partner
- [ ] Revenue sharing model
- [ ] Referral program

**Geographic Expansion:**
- [ ] Additional fiat currencies (USD, GBP, CHF)
- [ ] More KYC providers (Onfido, Jumio)
- [ ] Local payment methods per region
- [ ] Multi-language support (10+ languages)

**Advanced Trading:**
- [ ] Recurring purchases (DCA)
- [ ] Price alerts
- [ ] Limit orders
- [ ] OTC desk для крупных объемов

**Timeline:** 2026  
**Status:** 🎯 **ROADMAP**

---

## 🚀 Deployment

### Production Instances

| Instance | URL | Database | Status |
|----------|-----|----------|--------|
| **Bitflow** | [app.bitflow.biz](https://app.bitflow.biz) | Supabase (EU) | ✅ Live |
| **PayPlanet** | [app.payplanet.pl](https://app.payplanet.pl) | Supabase (EU) | ✅ Live |

### Infrastructure

```yaml
Hosting: Vercel (Edge Network)
  - Region: EU (Frankfurt)
  - Edge Functions: 50ms cold start
  - SSL: Automatic (Let's Encrypt)
  - CDN: Global (300+ locations)
  - Auto-scaling: Horizontal

Database: Supabase (PostgreSQL 15)
  - Primary: EU Central (Frankfurt)
  - Connection pooling: PgBouncer
  - Backups: Daily (30 day retention)
  - Point-in-time recovery: Yes
  - SSL: Required
  - Max connections: 1000

Storage: Vercel Blob
  - CDN: Cloudflare
  - Max file size: 500MB
  - Retention: Unlimited
  - Access: Public with signed URLs

CI/CD: GitHub Actions
  - Auto-deploy on push to main
  - Preview deployments для PRs
  - TypeScript check
  - Linting (ESLint)
  - Unit tests
  - Build time: ~3 minutes
```

### Environment Variables

```bash
# Core
NEXT_PUBLIC_APP_URL=https://app.bitflow.biz
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://app.bitflow.biz

# KYC Providers
KYCAID_API_KEY=xxx
KYCAID_FORM_ID=xxx
SUMSUB_APP_TOKEN=xxx
SUMSUB_SECRET_KEY=xxx
SUMSUB_LEVEL_NAME=basic-kyc-level

# Exchange Rates
COINGECKO_API_KEY=xxx

# Email
RESEND_API_KEY=xxx
RESEND_FROM_EMAIL=noreply@bitflow.biz

# Storage
BLOB_READ_WRITE_TOKEN=xxx

# Security
ENCRYPTION_KEY=xxx (AES-256)
WEBHOOK_SECRET=xxx

# Monitoring (Optional)
SENTRY_DSN=xxx
LOGTAIL_SOURCE_TOKEN=xxx
```

### Performance Metrics

```
Lighthouse Score (Desktop):
- Performance: 98/100
- Accessibility: 100/100
- Best Practices: 100/100
- SEO: 100/100

Core Web Vitals:
- LCP (Largest Contentful Paint): 1.2s ✅
- FID (First Input Delay): 45ms ✅
- CLS (Cumulative Layout Shift): 0.02 ✅

API Response Times (P95):
- Database queries: 15ms
- KYC API calls: 250ms
- Rate API calls: 150ms
- Authentication: 80ms
```

---

## 📚 Documentation

### Technical Documentation

| Документ | Описание | Ссылка |
|----------|----------|--------|
| **API Reference** | REST API v1 documentation | [API Docs](./docs/current/API_DOCUMENTATION.md) |
| **Database Schema** | Prisma schema, ERD diagrams | [Schema](./prisma/schema.prisma) |
| **Deployment Guide** | Production deployment steps | [Deployment](./docs/current/DEPLOYMENT.md) |
| **Security Guide** | Security best practices | [Security](./docs/current/INTEGRATION_SECURITY.md) |
| **Testing Guide** | Testing strategies | [Testing](./docs/current/TESTING.md) |

### Architecture Documentation

| Документ | Описание |
|----------|----------|
| **Project Summary** | Comprehensive overview | [Summary](./docs/archive/2025-Q1/PROJECT_COMPREHENSIVE_SUMMARY.md) |
| **KYC Architecture** | Universal KYC integration | [KYC](./docs/archive/2025-Q1/KYC_UNIVERSAL_ARCHITECTURE.md) |
| **Audit Architecture** | Logging system design | [Audit](./docs/archive/2025-Q1/AUDIT_LOGGING_ARCHITECTURE.md) |
| **IAM Architecture** | Identity & Access Management | [IAM](./docs/archive/2025-Q1/ADMIN_IAM_ARCHITECTURE.md) |
| **Workflow Engine** | Automation system | [Workflow](./WORKFLOW_ENGINE_SUMMARY.md) |

### User Guides

| Документ | Аудитория | Описание |
|----------|-----------|----------|
| **User Guide** | Clients | How to buy crypto, KYC process | Coming Soon |
| **Admin Guide** | Admins | CRM usage, order management | Coming Soon |
| **API Guide** | Developers | Integration examples | Coming Soon |

---

## 📊 Statistics

### Code Metrics

```
Total Lines of Code:    ~150,000+
TypeScript Files:       800+
React Components:       200+
API Endpoints:          100+
Database Models:        40+
Prisma Schema:          2,000+ lines
Test Coverage:          85%+ (critical paths)
```

### Database

```
Tables:                 40+
Indexes:                100+
Enum Types:             15+
Total Relations:        80+
Migrations:             50+
```

### Features

```
User Features:          30+
Admin Features:         100+
Integrations:           20+
Email Templates:        15+
Document Types:         10+
Currencies:             4 crypto + 2 fiat (expandable)
Supported Languages:    2 (EN, PL)
```

---

## 🏆 Key Achievements

✅ **Production Ready** - Successfully deployed and running in production  
✅ **Enterprise Security** - Multi-factor auth, Passkeys, Step-up MFA, comprehensive audit  
✅ **Compliance First** - Mandatory KYC, AML screening, regulatory reporting ready  
✅ **Professional CRM** - 100+ admin features, full CRUD, advanced filters  
✅ **Scalable Architecture** - Modular design, clean code, 85%+ test coverage  
✅ **Integration Ecosystem** - 20+ providers ready, webhook processing, API monitoring  
✅ **Advanced Automation** - Visual workflow engine, JSON Logic execution  
✅ **Developer Experience** - TypeScript strict mode, comprehensive docs, clear structure  

---

## 🤝 Support & Contact

### Technical Support

- 📧 Email: [tech@apricode.agency](mailto:tech@apricode.agency)
- 💬 Telegram: [@apricode_support](https://t.me/apricode_support)
- 📚 Documentation: [docs.apricode.agency](https://docs.apricode.agency)

### Business Inquiries

- 📧 Email: [business@apricode.agency](mailto:business@apricode.agency)
- 🌐 Website: [apricode.agency](https://apricode.agency)

---

## 📄 License

**Proprietary License** - © 2025 Apricode Agency. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without express written permission from Apricode Agency.

---

<div align="center">

**Built with ❤️ by [Apricode Agency](https://apricode.agency)**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

</div>

