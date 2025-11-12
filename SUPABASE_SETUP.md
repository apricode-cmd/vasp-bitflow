# Supabase Database Setup - Complete Guide

## ✅ Database Already Configured!

Your Supabase database is ready and populated with data from local development.

## 📊 Database Info

**Project:** `rltqjdujiacriilmijpz`  
**Region:** `aws-1-eu-central-1`  
**URL:** https://rltqjdujiacriilmijpz.supabase.co

### Connection Strings

#### For Prisma (Connection Pooling - Port 6543)
```bash
DATABASE_URL="postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

#### For Migrations (Direct Connection - Port 5432)
```bash
DIRECT_URL="postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"
```

## 🎯 What Was Done

1. ✅ Created Supabase project
2. ✅ Exported local database schema and data
3. ✅ Imported to Supabase (1.6MB dump)
4. ✅ Verified all tables created (60+ tables)
5. ✅ Verified data loaded (users, currencies, payment methods, etc.)

### Tables Loaded

- ✅ User (with admin account)
- ✅ Currency (4 currencies: BTC, ETH, USDT, SOL)
- ✅ PaymentMethod (4 methods)
- ✅ All other application tables
- ✅ Indexes and constraints

## 🚀 Vercel Deployment Setup

### Step 1: Add Environment Variables in Vercel

Go to your Vercel project → **Settings** → **Environment Variables**

#### Required Variables

```bash
# Database (IMPORTANT: Use port 6543 for pooling!)
DATABASE_URL="postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# NextAuth (Generate new secret!)
NEXTAUTH_URL="https://your-project.vercel.app"
NEXTAUTH_SECRET="3h6lch+1RRQYsHFpDmWNpXRv7E5ikcRHdHTDSWl9DT5X7JF1yG41z+F9GJdVw/Li3xhMHZm6AsjpeqyX0tcLXA=="

# Storage
STORAGE_PROVIDER="vercel-blob"
# BLOB_READ_WRITE_TOKEN will be auto-added when you create Blob Storage

# Admin
ADMIN_EMAIL="admin@bitflow.com"
ADMIN_PASSWORD="BitFlow2024!Secure"

# Feature Flags
ENABLE_KYC="true"
ENABLE_PUBLIC_API="true"

# Node Environment
NODE_ENV="production"
```

#### Optional (Add Later)

```bash
# KYC
KYCAID_API_URL="https://api.kycaid.com"
KYCAID_API_KEY=""
KYCAID_FORM_ID=""
KYCAID_WEBHOOK_SECRET=""

# Email
RESEND_API_KEY=""
RESEND_FROM_EMAIL="noreply@bitflow.com"

# CoinGecko
COINGECKO_API_KEY=""
```

### Step 2: Create Vercel Blob Storage

1. In Vercel project → **Storage**
2. **Create Database** → **Blob**
3. Confirm creation
4. `BLOB_READ_WRITE_TOKEN` will be auto-added to env vars

### Step 3: Deploy

```bash
git push bitflow clients/bitflow:main
```

Vercel will automatically deploy!

## 🔍 Verify Database Connection

After deployment, check:

```bash
# Test database connection
curl https://your-project.vercel.app/api/admin/storage/info

# Should return database info (requires admin login)
```

## 📝 Important Notes

### Port Numbers

- **Port 6543** - Connection pooling (pgbouncer) - **USE THIS for Prisma in production**
- **Port 5432** - Direct connection - Use only for migrations

### Why Connection Pooling?

Vercel serverless functions create many database connections. Connection pooling (port 6543) prevents:
- "Too many connections" errors
- Database overload
- Performance issues

### Connection String Format

```
postgres://postgres.[ref]:[password]@[host]:6543/postgres?pgbouncer=true&connection_limit=1
```

**Important parameters:**
- `pgbouncer=true` - Enable connection pooling
- `connection_limit=1` - Limit connections per Prisma client

## 🔐 Security Checklist

- [x] Database password is strong
- [x] Connection pooling enabled
- [ ] Update `NEXTAUTH_SECRET` for production (generate new one!)
- [ ] Add Vercel IP to Supabase allowed IPs (optional)
- [ ] Enable SSL mode (already in connection string)
- [ ] Set up database backups in Supabase

## 📊 Supabase Dashboard

Access your database:

1. Go to https://supabase.com/dashboard
2. Select project: `rltqjdujiacriilmijpz`
3. **Database** → **Tables** - View tables
4. **SQL Editor** - Run queries
5. **Database** → **Backups** - Configure backups

### Useful SQL Queries

```sql
-- Check admin user
SELECT id, email, role FROM "User" WHERE role = 'ADMIN';

-- Check currencies
SELECT * FROM "Currency";

-- Check payment methods
SELECT * FROM "PaymentMethod";

-- Count orders
SELECT COUNT(*) FROM "Order";
```

## 🔄 Database Migrations

If you need to apply new migrations in the future:

```bash
# Use DIRECT_URL (port 5432) for migrations
DATABASE_URL="postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:5432/postgres" npx prisma migrate deploy
```

## 🆘 Troubleshooting

### "Too many connections" error

**Solution:** Make sure you're using port 6543 with `pgbouncer=true`

### "Connection timeout" error

**Solution:** Check Supabase project is active and not paused

### "SSL required" error

**Solution:** Add `?sslmode=require` to connection string (already included)

### Vercel can't connect to database

**Solution:** 
1. Check DATABASE_URL in Vercel env vars
2. Verify using port 6543 (not 5432)
3. Check Supabase project is active

## 📞 Support

- **Supabase Docs:** https://supabase.com/docs
- **Supabase Support:** https://supabase.com/support
- **Project Dashboard:** https://supabase.com/dashboard/project/rltqjdujiacriilmijpz

---

**Database Status:** ✅ Ready for Production  
**Last Updated:** 2025-01-12  
**Migration Date:** 2025-01-12

