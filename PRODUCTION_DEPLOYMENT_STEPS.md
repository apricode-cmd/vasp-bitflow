# 🚀 Production Deployment Steps - KYC Sumsub Integration

## ✅ ЧТО ГОТОВО (commit `11df2bf`)

- ✅ Gender field в schema.prisma
- ✅ Gender передается в kyc.service.ts
- ✅ Gender передается в SumsubAdapter.createApplicant
- ✅ FINAL SQL миграция готова
- ✅ Все изменения в одном скрипте

---

## 📋 DEPLOYMENT CHECKLIST

### 1. SUPABASE SQL MIGRATION ⚠️ CRITICAL

**Файл:** `prisma/migrations-manual/FINAL-kyc-documents-setup.sql`

**Как применить:**

1. Открыть Supabase Dashboard
2. Project → SQL Editor
3. New query
4. Скопировать ВЕСЬ файл `FINAL-kyc-documents-setup.sql`
5. Запустить (Run)
6. Проверить вывод ✅

**Что делает скрипт:**
```
✅ STEP 1: Add dependsOn, showWhen fields
✅ STEP 2: Update id_issuing_country to 'country' type
✅ STEP 3: Add passport_number field
✅ STEP 4: Add id_scan_front field (conditional)
✅ STEP 5: Add id_scan_back field (conditional)
✅ STEP 6: Add proof_of_address field
✅ STEP 7: Make kycSessionId nullable, add userId
✅ STEP 8: Add gender field to Profile + KYC form ⭐ NEW!
```

**Бекап (OPTIONAL но рекомендуется):**
```sql
-- Перед запуском основного скрипта можно сделать бекап:
SELECT * FROM "KycFormField" INTO "KycFormField_backup_20250113";
SELECT * FROM "Profile" INTO "Profile_backup_20250113";
SELECT * FROM "KycDocument" INTO "KycDocument_backup_20250113";
```

---

### 2. VERCEL ENV VARIABLES ⚠️ CRITICAL

**Где:** Vercel Dashboard → Project Settings → Environment Variables

**Переменные для Sumsub:**

```bash
# ОБЯЗАТЕЛЬНЫЕ (Required)
SUMSUB_APP_TOKEN=prd:XXXXXXXXXXXXXXXX    # Production token (starts with prd:)
SUMSUB_SECRET_KEY=XXXXXXXXXXXXXXXX       # Secret key for HMAC signatures
SUMSUB_LEVEL_NAME=id-and-liveness        # Verification level name

# ОПЦИОНАЛЬНЫЕ (Optional)
SUMSUB_BASE_URL=https://api.sumsub.com   # Default, можно не указывать
```

**Как проверить что ENV переменные есть:**

1. Vercel Dashboard → Settings → Environment Variables
2. Убедиться что все 3 обязательные переменные есть
3. Нажать "Redeploy" чтобы применить

---

### 3. ADMIN PANEL SETUP (После деплоя)

**1. Зайти в админку:**
```
https://app.bitflow.biz/admin/integrations
```

**2. Настроить Sumsub:**
- Service: `sumsub`
- Status: Active ✅
- App Token: `prd:XXXXXXXX` (из ENV)
- Secret Key: `XXXXXXXX` (из ENV)
- Level Name: `id-and-liveness`

**3. Test Connection:**
- Нажать "Test" → должно быть ✅ Success

---

## 🔧 TESTING AFTER DEPLOYMENT

### 1. Create Test Applicant

**API Test:**
```bash
curl -X POST https://app.bitflow.biz/api/kyc/start \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "sessionId": "...",
  "applicantId": "..."
}
```

### 2. Check Applicant in Sumsub Dashboard

1. Login to Sumsub Dashboard
2. Applicants → найти по externalUserId
3. Проверить что `fixedInfo` содержит:
   - ✅ firstName, lastName
   - ✅ dob
   - ✅ nationality
   - ✅ country
   - ✅ taxResidence ⭐
   - ✅ gender ⭐ NEW!
   - ✅ addresses

### 3. Test Full KYC Flow

**User Journey:**
1. User fills profile (including gender)
2. User starts KYC → creates applicant with APPLICANT_DATA
3. User uploads documents (optional, stored locally)
4. User clicks "Submit" → sync documents to Sumsub
5. User scans Mobile SDK Link → completes IDENTITY + SELFIE
6. Submit for review → status = PENDING_REVIEW

---

## 🐛 TROUBLESHOOTING

### Error: "Gender field not found"

**Solution:**
```sql
-- Run in Supabase SQL Editor:
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "gender" TEXT;
```

### Error: "Request signature mismatch"

**Check:**
1. ENV переменные правильные
2. Secret Key без пробелов
3. App Token starts with `prd:` (not `sbx:`)

### Error: "APPLICANT_DATA not complete"

**Check in logs:**
```
📋 Applicant details: {...}
👤 Fixed Info: {...}
```

**Must include:**
- firstName, lastName, dob ✅
- nationality, country, taxResidence ✅
- gender ✅ (NEW)

### Error: "doc-type-not-in-req-docs"

**Reason:** Level `id-and-liveness` is SDK-only for IDENTITY

**Solution:**
- Use Mobile SDK Link for IDENTITY + SELFIE
- API upload only for UTILITY_BILL (proof of address)

---

## 📊 SUCCESS CRITERIA

- ✅ SQL migration applied without errors
- ✅ Gender field exists in Profile table
- ✅ Gender field appears in KYC form
- ✅ ENV variables set in Vercel
- ✅ Sumsub integration active in admin
- ✅ Test applicant created successfully
- ✅ Applicant in Sumsub has all fixedInfo fields
- ✅ Mobile SDK Link works
- ✅ Full KYC flow completes

---

## 🔄 ROLLBACK PLAN (if needed)

**1. Revert database changes:**
```sql
-- Drop gender column
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "gender";

-- Remove gender from KYC form
DELETE FROM "KycFormField" WHERE "fieldName" = 'gender';
```

**2. Revert code:**
```bash
git revert 11df2bf
git push bitflow HEAD:main
```

**3. Redeploy on Vercel**

---

## 📞 SUPPORT

**If issues persist:**

1. Check Vercel logs: `vercel logs --follow`
2. Check Supabase logs: Logs & Reports → Postgres Logs
3. Check Sumsub Dashboard: Activity → API Logs
4. Review `KYC_SUMSUB_INTEGRATION_PLAN.md` for architecture

---

## ✅ FINAL CHECKLIST

Before marking as DONE:

- [ ] SQL script executed in Supabase ✅
- [ ] Gender column exists in Profile
- [ ] Gender field in KYC form
- [ ] ENV variables set in Vercel
- [ ] Vercel redeployed
- [ ] Sumsub integration tested
- [ ] Test applicant created
- [ ] Full KYC flow tested
- [ ] Production ready 🚀

---

**Last Updated:** 2025-01-13  
**Commit:** `11df2bf`  
**Status:** Ready for Production Deployment 🚀

