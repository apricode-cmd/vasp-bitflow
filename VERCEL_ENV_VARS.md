# Vercel Environment Variables - Complete List

## 🚨 CRITICAL - Add These First!

These variables are **REQUIRED** for the build to succeed:

### 1. Database (REQUIRED)

```bash
DATABASE_URL
```
**Value:**
```
postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**Important:** Use port **6543** (connection pooling)

---

```bash
DIRECT_URL
```
**Value:**
```
postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
```

**Important:** Use port **5432** (direct connection for migrations)

---

### 2. Encryption (REQUIRED)

```bash
ENCRYPTION_SECRET
```
**Value:**
```
4b4a42b82eba6bc3c5431f9082161758f6f102a9f7d2bcf7d12ba0950e2ec912
```

**Important:** Required for encrypting TOTP secrets and API keys. Must be at least 32 characters.

---

### 3. NextAuth (REQUIRED)

```bash
NEXTAUTH_URL
```
**Value:**
```
https://app.bitflow.biz
```

**Important:** Must match your production domain exactly!

---

```bash
NEXTAUTH_SECRET
```
**Value:**
```
3h6lch+1RRQYsHFpDmWNpXRv7E5ikcRHdHTDSWl9DT5X7JF1yG41z+F9GJdVw/Li3xhMHZm6AsjpeqyX0tcLXA==
```

**Security:** Consider generating a new secret for production:
```bash
openssl rand -base64 32
```

---

### 4. WebAuthn / Passkey (REQUIRED for Admin)

```bash
RP_NAME
```
**Value:**
```
BitFlow
```

**Note:** Relying Party name shown in passkey prompts

---

```bash
RP_ID
```
**Value:**
```
app.bitflow.biz
```

**Important:** Must match domain (without https://)

---

```bash
ORIGIN
```
**Value:**
```
https://app.bitflow.biz
```

**Important:** Must match NEXTAUTH_URL

---

### 4. Storage (REQUIRED)

```bash
STORAGE_PROVIDER
```
**Value:**
```
vercel-blob
```

---

```bash
BLOB_READ_WRITE_TOKEN
```
**Value:**
```
(Will be auto-added when you create Blob Storage)
```

**How to add:**
1. Vercel Dashboard → Storage
2. Create Database → Blob
3. Token will be automatically added to env vars

---

### 4. Admin (REQUIRED)

```bash
ADMIN_EMAIL
```
**Value:**
```
admin@bitflow.com
```

---

```bash
ADMIN_PASSWORD
```
**Value:**
```
BitFlow2024!Secure
```

**Security:** Use a strong password (min 12 characters)

---

### 5. Feature Flags (REQUIRED)

```bash
ENABLE_KYC
```
**Value:**
```
true
```

---

```bash
ENABLE_PUBLIC_API
```
**Value:**
```
true
```

---

### 6. Node Environment (REQUIRED)

```bash
NODE_ENV
```
**Value:**
```
production
```

---

## ⚙️ Optional (Can Add Later)

### KYC (KYCAID)

```bash
KYCAID_API_URL
```
**Value:**
```
https://api.kycaid.com
```

---

```bash
KYCAID_API_KEY
```
**Value:**
```
(Your KYCAID API key)
```

---

```bash
KYCAID_FORM_ID
```
**Value:**
```
(Your KYCAID form ID)
```

---

```bash
KYCAID_WEBHOOK_SECRET
```
**Value:**
```
(Your KYCAID webhook secret)
```

---

### Email (Resend)

```bash
RESEND_API_KEY
```
**Value:**
```
(Your Resend API key)
```

---

```bash
RESEND_FROM_EMAIL
```
**Value:**
```
noreply@bitflow.com
```

---

### CoinGecko

```bash
COINGECKO_API_KEY
```
**Value:**
```
(Your CoinGecko API key - optional for free tier)
```

---

## 📋 Quick Copy-Paste Format

For easy copy-paste into Vercel:

```
DATABASE_URL=postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

DIRECT_URL=postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:5432/postgres

NEXTAUTH_URL=https://your-project.vercel.app

NEXTAUTH_SECRET=3h6lch+1RRQYsHFpDmWNpXRv7E5ikcRHdHTDSWl9DT5X7JF1yG41z+F9GJdVw/Li3xhMHZm6AsjpeqyX0tcLXA==

STORAGE_PROVIDER=vercel-blob

ADMIN_EMAIL=admin@bitflow.com

ADMIN_PASSWORD=BitFlow2024!Secure

ENABLE_KYC=true

ENABLE_PUBLIC_API=true

NODE_ENV=production
```

---

## 🔧 How to Add in Vercel

### Method 1: One by One

1. Go to Vercel Dashboard
2. Select your project
3. **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter **Name** and **Value**
6. Select environments: **Production**, **Preview**, **Development**
7. Click **Save**
8. Repeat for each variable

### Method 2: Bulk Import (Faster)

1. Create a `.env.vercel` file locally:
   ```bash
   DATABASE_URL="postgres://..."
   DIRECT_URL="postgres://..."
   # ... etc
   ```

2. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

3. Login and link project:
   ```bash
   vercel login
   vercel link
   ```

4. Push environment variables:
   ```bash
   vercel env pull
   ```

---

## ✅ Verification Checklist

After adding all variables:

- [ ] `DATABASE_URL` added (port 6543)
- [ ] `DIRECT_URL` added (port 5432)
- [ ] `NEXTAUTH_URL` added (with your domain)
- [ ] `NEXTAUTH_SECRET` added
- [ ] `STORAGE_PROVIDER` = "vercel-blob"
- [ ] Blob Storage created (BLOB_READ_WRITE_TOKEN auto-added)
- [ ] `ADMIN_EMAIL` added
- [ ] `ADMIN_PASSWORD` added
- [ ] `ENABLE_KYC` = "true"
- [ ] `ENABLE_PUBLIC_API` = "true"
- [ ] `NODE_ENV` = "production"
- [ ] All variables set for: Production, Preview, Development

---

## 🚀 After Adding Variables

1. Go to **Deployments**
2. Click on latest failed deployment
3. Click **Redeploy**
4. Wait for build to complete
5. Check deployment logs for any errors

---

## 🔍 Troubleshooting

### Build still fails with "Environment variable not found"

**Solution:** 
1. Check variable name spelling (case-sensitive!)
2. Make sure variable is set for "Production" environment
3. Try redeploying (don't just redeploy, click "Redeploy" button)

### "Connection timeout" or "Can't reach database"

**Solution:**
1. Verify `DATABASE_URL` has port **6543**
2. Verify `DIRECT_URL` has port **5432**
3. Check Supabase project is active (not paused)
4. Check connection strings are correct

### "Invalid NEXTAUTH_SECRET"

**Solution:**
1. Generate new secret: `openssl rand -base64 32`
2. Must be at least 32 characters
3. No special characters that need escaping

---

## 📞 Support

If deployment still fails:

1. Check Vercel deployment logs
2. Look for specific error messages
3. Verify all REQUIRED variables are added
4. Check SUPABASE_SETUP.md for database issues
5. Contact: tech@apricode.com

---

**Last Updated:** 2025-01-12  
**For:** BitFlow Production Deployment

