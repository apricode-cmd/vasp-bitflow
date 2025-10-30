# Apricode Exchange - Cryptocurrency Purchase Platform

A secure platform for buying cryptocurrency (BTC, ETH, USDT, SOL) with fiat currency (EUR, PLN) after mandatory KYC verification.

## 🎯 Features

- **Secure Authentication**: Email/password authentication with NextAuth v5
- **Mandatory KYC**: KYCAID integration for identity verification
- **Crypto Purchase**: Buy BTC, ETH, USDT, SOL with EUR or PLN
- **Bank Transfer Payment**: SEPA/SWIFT bank transfer payment method
- **Real-time Rates**: Live exchange rates from CoinGecko API
- **Admin Panel**: Manual order processing and management
- **Email Notifications**: Automated notifications for orders and KYC status

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router, React Server Components)
- **TypeScript 5.5+** (Strict mode)
- **Tailwind CSS 3.4**
- **shadcn/ui** + Radix UI
- **React Hook Form** + Zod validation

### Backend
- **Next.js API Routes**
- **PostgreSQL 15** (Database)
- **Prisma 5.20** (ORM)
- **NextAuth.js v5** (Authentication)
- **bcryptjs** (Password hashing)

### External Services
- **KYCAID** - KYC verification
- **CoinGecko** - Cryptocurrency rates
- **Resend** - Email notifications

## 📦 Installation

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd "crm vasp"
npm install
\`\`\`

### 2. Environment Variables

Create a \`.env\` file based on \`.env.example\`:

\`\`\`bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/apricode"

# NextAuth (Generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# KYCAID
KYCAID_API_KEY="your-kycaid-api-key"
KYCAID_FORM_ID="your-form-id"
KYCAID_WEBHOOK_SECRET="your-webhook-secret"
KYCAID_BASE_URL="https://api.kycaid.com"

# CoinGecko
COINGECKO_API_URL="https://api.coingecko.com/api/v3"

# Resend
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="noreply@apricode.io"

# Admin Account
ADMIN_EMAIL="admin@apricode.io"
ADMIN_PASSWORD="SecureAdmin123!"

# Platform
PLATFORM_FEE="0.015"
NODE_ENV="development"
\`\`\`

### 3. Database Setup

\`\`\`bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database
npm run db:seed
\`\`\`

### 4. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Default Accounts

After seeding, you can use these test accounts:

**Admin:**
- Email: admin@apricode.io
- Password: SecureAdmin123!

**Test Client (KYC Approved):**
- Email: client@test.com
- Password: TestClient123!

## 🗂️ Project Structure

\`\`\`
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (client)/          # Client dashboard
│   ├── (admin)/           # Admin panel
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── layouts/          # Layout components
│   ├── forms/            # Form components
│   └── features/         # Feature components
├── lib/                   # Utilities and services
│   ├── services/         # External service integrations
│   ├── validations/      # Zod schemas
│   └── utils/            # Helper functions
├── types/                 # TypeScript types
└── middleware.ts          # Route protection

prisma/
├── schema.prisma          # Database schema
└── seed.ts               # Database seeding
\`\`\`

## 🔑 Key Features

### User Flow

1. **Register**: Create account with email and password
2. **KYC Verification**: Complete identity verification (mandatory)
3. **Place Order**: Select crypto, amount, and wallet address
4. **Payment**: Transfer fiat to provided bank account
5. **Receive Crypto**: Admin processes and sends crypto to wallet

### Admin Flow

1. **Dashboard**: View statistics and pending orders
2. **Orders Management**: Review payments and process orders
3. **KYC Reviews**: Monitor KYC verification statuses
4. **Settings**: Configure bank details and currency limits

## 🔐 Security

- **Password Hashing**: bcrypt with 10 rounds
- **Input Validation**: Zod schemas on all endpoints
- **Authentication**: NextAuth v5 with JWT sessions
- **Authorization**: Role-based access control
- **Security Headers**: HSTS, XSS protection, etc.
- **Webhook Verification**: HMAC signature validation

## 📚 API Endpoints

### Authentication
- \`POST /api/auth/register\` - User registration
- \`POST /api/auth/signin\` - User login
- \`POST /api/auth/signout\` - User logout

### KYC
- \`POST /api/kyc/start\` - Start KYC verification
- \`GET /api/kyc/status\` - Get KYC status
- \`POST /api/kyc/webhook\` - KYCAID webhook

### Orders
- \`POST /api/orders\` - Create order
- \`GET /api/orders\` - List orders
- \`GET /api/orders/[id]\` - Get order details

### Exchange Rates
- \`GET /api/rates\` - Get current rates

### Admin
- \`GET /api/admin/orders\` - List all orders
- \`PATCH /api/admin/orders/[id]/status\` - Update order status
- \`GET /api/admin/kyc\` - List KYC sessions
- \`GET /api/admin/stats\` - Dashboard statistics

## 🧪 Development

### Available Scripts

\`\`\`bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push schema to database
npm run db:migrate   # Create migration
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
\`\`\`

### Database Management

\`\`\`bash
# View database with Prisma Studio
npx prisma studio

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
\`\`\`

## 🚀 Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

### Database (Supabase)

1. Create Supabase project
2. Get PostgreSQL connection string
3. Add to \`DATABASE_URL\` in Vercel
4. Run migrations

## 📊 Platform Configuration

- **Platform Fee**: 1.5%
- **Supported Cryptocurrencies**: BTC, ETH, USDT, SOL
- **Supported Fiat**: EUR, PLN
- **Payment Method**: Bank transfer (SEPA/SWIFT)
- **Min Order Value**: €10
- **Max Order Value**: €100,000

## 🔧 Configuration

### Currency Limits

Limits are configured in the database \`currencies\` table:
- BTC: 0.001 - 10
- ETH: 0.01 - 100
- USDT: 10 - 100,000
- SOL: 0.1 - 1,000

### Bank Details

Bank details are managed through the admin settings panel and stored in the \`bank_details\` table.

## ⚙️ Operations

### 1. Commit Author (для правильного деплою в Vercel)

Налаштуй один раз:

\`\`\`bash
git config --global user.name  "Bohdan Kononenko"
git config --global user.email "apricode.studio@gmail.com"
\`\`\`

Тригер деплою:

\`\`\`bash
git commit --allow-empty -m "chore: trigger Vercel build"
git push origin main
\`\`\`

Або використовуй скрипт для автоматичної перевірки:

\`\`\`bash
npm run prepush
\`\`\`

### 2. Database Management

\`\`\`bash
# View database with Prisma Studio
npx prisma studio

# Create new migration
npx prisma migrate dev --name migration_name

# Backup before changes
npm run db:backup

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
\`\`\`

## 🐛 Troubleshooting

### Database Connection Issues

\`\`\`bash
# Check PostgreSQL is running
psql -U postgres

# Verify DATABASE_URL in .env
echo $DATABASE_URL
\`\`\`

### Migration Issues

\`\`\`bash
# Reset and recreate database
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
\`\`\`

### Vercel "Commit Author Required" Error

Якщо бачиш помилку "A commit author is required" при деплої:

\`\`\`bash
# Налаштуй Git автора (використовуй email з GitHub!)
git config --global user.name  "Bohdan Kononenko"
git config --global user.email "apricode.studio@gmail.com"

# Створи порожній коміт для тригеру деплою
git commit --allow-empty -m "chore: trigger Vercel build"
git push origin main
\`\`\`

## 📄 License

Proprietary - Apricode Exchange

## 👥 Support

For support, email support@apricode.io

---

**Built with ❤️ using Next.js 14, TypeScript, and Prisma**

