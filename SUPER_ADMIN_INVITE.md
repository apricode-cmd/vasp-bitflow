# 🔐 Super Admin Setup - PayPlanet

## ✅ Super Admin Created

**Date:** November 18, 2025  
**Database:** Eplanet (EU West 1)  
**Domain:** `app.payplanet.pl`

---

## 👤 Admin Details

| Field | Value |
|-------|-------|
| **Email** | hello@apricode.agency |
| **Name** | Super Admin |
| **Role** | SUPER_ADMIN |
| **Auth Method** | Passkey (passwordless) |
| **Status** | INVITED |
| **ID** | `636ff896-22e8-40e1-9603-83941fc130e0` |

---

## 🔗 Setup Link

**Important:** This link expires in **24 hours** (November 19, 2025 at 18:42 UTC)

```
https://app.payplanet.pl/admin/auth/setup?token=399955550b8771951c1ddb9d8d65775e6f6a6ce1d1983e8b4bf6c97b0300b3e0cf0ce393866682cb24774d890b8f02a2e008fa2a1a62b2fa71ddee0fb20fe254&email=hello%40apricode.agency
```

---

## 📋 Setup Instructions

1. **Open the link above** in a browser on your device (laptop/phone with biometric)
2. **Choose authentication method:**
   - ✅ **Passkey (Recommended)** - Use Face ID, Touch ID, or Windows Hello
   - 🔑 Password + TOTP - Use password and authenticator app
3. **Complete registration** - Follow on-screen instructions
4. **Login** - You're now a Super Admin on PayPlanet!

---

## 🔒 Security Notes

### Passkey Benefits (Recommended)
- ✅ **Passwordless** - No password to remember or leak
- ✅ **Phishing-resistant** - Works only on `app.payplanet.pl`
- ✅ **Biometric** - Face ID / Touch ID / Windows Hello
- ✅ **Sync across devices** - iCloud Keychain / Google Password Manager

### Why Old Admin Was Deleted
- ❌ Old passkey was bound to different domain
- ❌ Passkeys are domain-specific (security feature)
- ✅ New passkey will work only on `app.payplanet.pl`

---

## 🗄️ Database Status

### Eplanet Database (Clean State)
- ✅ **7 Admins** (including new Super Admin)
- ✅ **5 Currencies** (BTC, ETH, USDT, SOL, EUR)
- ✅ **6 Integrations** (KYC, Email, etc.)
- ✅ **0 Users** (clean slate)
- ✅ **0 Orders** (clean slate)
- ✅ **All system settings** preserved

---

## 🚀 Next Steps

### 1. Complete Super Admin Setup
Use the link above within 24 hours.

### 2. Update Environment Variables
If not done yet, update Vercel:

```bash
DATABASE_URL="postgresql://postgres.zjrroaymcsanrmotmars:6xcTBfcCr9whnJ1@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.zjrroaymcsanrmotmars:6xcTBfcCr9whnJ1@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
```

### 3. Deploy to Production
```bash
vercel --prod
```

### 4. Verify System
- ✅ Login as Super Admin
- ✅ Check system settings
- ✅ Invite other admins (if needed)
- ✅ Test order flow

---

## 🆘 Troubleshooting

### Link Expired?
Run the script again to generate a new invite:
```bash
node -e "const crypto = require('crypto'); /* ... script code ... */"
```

### Can't Login?
1. Check browser console for errors
2. Try incognito mode
3. Verify domain is `app.payplanet.pl`
4. Check database: `SELECT * FROM "Admin" WHERE email = 'hello@apricode.agency';`

### Need to Delete and Recreate?
```sql
DELETE FROM "Admin" WHERE id = '636ff896-22e8-40e1-9603-83941fc130e0';
-- Then run the invite script again
```

---

## 📊 Migration Summary

| Action | Status |
|--------|--------|
| Backup Bitflow database | ✅ Completed (2.4 MB) |
| Restore to Eplanet | ✅ Completed (76 tables) |
| Clean client data | ✅ Completed (0 users/orders) |
| Delete old Super Admin | ✅ Completed |
| Create new Super Admin | ✅ Completed |
| Generate setup link | ✅ Ready to use |

---

**Status:** 🎉 **READY TO USE**

Click the setup link above to complete Super Admin registration!

