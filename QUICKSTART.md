# Apricode Exchange - Quick Start Guide

Get the project up and running in 10 minutes.

## Prerequisites

Ensure you have installed:
- **Node.js 20+** (check: `node -v`)
- **PostgreSQL 15+** (check: `psql --version`)
- **npm** or **yarn** (check: `npm -v`)

## Step 1: Install Dependencies

```bash
cd "/Users/bogdankononenko/Работа/Development/Project/crm vasp"
npm install
```

## Step 2: Setup Database

### Create PostgreSQL Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE apricode_dev;

# Exit PostgreSQL
\q
```

## Step 3: Configure Environment Variables

The project already has `.env.local` file. Update it with your settings:

```bash
# Edit .env.local
# Update these required fields:

# Database (update with your PostgreSQL credentials)
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/apricode_dev"

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-generated-secret-here"

# For MVP testing, you can leave KYCAID and Resend with placeholder values
# They will be needed when testing KYC and email features
```

### Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Copy the output to `NEXTAUTH_SECRET` in `.env.local`

## Step 4: Setup Prisma & Database

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database with test data
npm run db:seed
```

**Expected Output:**
```
🌱 Starting database seeding...
👤 Creating admin user...
✅ Admin created: admin@apricode.io
👤 Creating test client user...
✅ Test client created: client@test.com
...
✅ Database seeding completed successfully!
```

## Step 5: Start Development Server

```bash
npm run dev
```

Server will start at: **http://localhost:3000**

## Step 6: Access the Application

### Landing Page
http://localhost:3000

### Test Accounts

**Admin Account:**
- Email: `admin@apricode.io`
- Password: `SecureAdmin123!`
- Access: http://localhost:3000/login

**Client Account (KYC Approved):**
- Email: `client@test.com`
- Password: `TestClient123!`
- Access: http://localhost:3000/login

## Step 7: Explore Features

### As Client:
1. **Dashboard** → http://localhost:3000/dashboard
2. **Buy Crypto** → http://localhost:3000/buy
3. **My Orders** → http://localhost:3000/orders
4. **KYC Verification** → http://localhost:3000/kyc
5. **Profile** → http://localhost:3000/profile

### As Admin:
1. **Admin Dashboard** → http://localhost:3000/admin
2. **Manage Orders** → http://localhost:3000/admin/orders
3. **KYC Reviews** → http://localhost:3000/admin/kyc
4. **Settings** → http://localhost:3000/admin/settings

## Troubleshooting

### Database Connection Error

**Error:** `Can't reach database server`

**Solution:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify credentials in `.env.local`
3. Test connection: `psql "postgresql://postgres:password@localhost:5432/apricode_dev"`

### Prisma Generate Error

**Error:** `@prisma/client did not initialize yet`

**Solution:**
```bash
npx prisma generate
npm run dev
```

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Migration Errors

**Error:** Migration issues

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Run seed again
npm run db:seed
```

## Next Steps

### For Development:
1. Review the code structure in `src/`
2. Check `TESTING.md` for comprehensive testing guide
3. Read `DEPLOYMENT.md` before deploying to production

### For Production:
1. Follow `DEPLOYMENT.md` step-by-step
2. Configure production services (KYCAID, Resend)
3. Deploy to Vercel
4. Setup Supabase for database

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:push          # Push schema changes
npm run db:migrate       # Create migration
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio (DB GUI)

# Prisma
npx prisma generate      # Generate Prisma Client
npx prisma migrate dev   # Run migrations
npx prisma studio        # Visual DB editor
npx prisma db pull       # Pull schema from database
```

## Project Structure Overview

```
src/
├── app/                 # Next.js App Router
│   ├── (auth)/         # Auth pages (login, register)
│   ├── (client)/       # Client pages (dashboard, buy, orders)
│   ├── (admin)/        # Admin pages (management)
│   └── api/            # API routes
├── components/         # React components
│   ├── ui/            # UI primitives (button, card, etc.)
│   ├── layouts/       # Layouts (header, footer)
│   ├── features/      # Feature components (badges, etc.)
│   └── forms/         # Form components
├── lib/               # Utilities and services
│   ├── services/      # External APIs (KYCAID, CoinGecko, Email)
│   ├── validations/   # Zod schemas
│   └── utils/         # Helper functions
└── types/             # TypeScript types

prisma/
├── schema.prisma      # Database schema
└── seed.ts           # Database seeding script
```

## Support

- **Documentation:** See README.md, TESTING.md, DEPLOYMENT.md
- **Issues:** Check existing code or create GitHub issue
- **Database GUI:** Run `npx prisma studio`

---

## Quick Testing Flow

1. **Register new user** → http://localhost:3000/register
2. **Login as test client** → client@test.com / TestClient123!
3. **Create an order** → Dashboard → Buy Crypto
4. **Login as admin** → admin@apricode.io / SecureAdmin123!
5. **Process order** → Admin → Orders → Mark Processing

---

**You're all set! Start developing! 🚀**

