# Sumsub ID-AND-LIVENESS Level: Complete Flow Analysis

## 📋 Problem Statement

Мы используем Sumsub уровень `id-and-liveness`, который имеет специфические требования:

### Required Components (from Sumsub):
```json
{
  "docSets": [
    {
      "idDocSetType": "APPLICANT_DATA",
      "fields": ["firstName", "lastName", "dob", "email", "phone"]
    },
    {
      "idDocSetType": "IDENTITY",
      "types": ["PASSPORT", "ID_CARD", "RESIDENCE_PERMIT"],
      "videoRequired": "disabled"  // ✅ CAN upload via API
    },
    {
      "idDocSetType": "SELFIE",
      "types": ["SELFIE"],
      "videoRequired": "photoRequired"  // ❌ MUST use SDK (liveness detection)
    }
  ]
}
```

---

## 🎯 Current Issues

### Issue 1: Webhook Signature Mismatch
```
❌ Webhook signature mismatch:
   expected: '848199bb5ddfd63e3c5e...'
   received: '1120441ab99f8a5344eb...'
```

**Root Cause:**
- Неправильный `webhookSecret` в конфигурации
- Или используется `secretKey` вместо `webhookSecret`

### Issue 2: Submit Error (409)
```
❌ Not all required documents or data are submitted.
   Make sure to complete [APPLICANT_DATA, IDENTITY, SELFIE] beforehand.
```

**Root Cause:**
- Мы пытаемся вызвать `submitForReview()` API до того, как пользователь завершил SDK flow
- SDK-only документы (SELFIE) НЕ могут быть загружены через API

---

## ✅ Correct Flow for ID-AND-LIVENESS

### Flow Diagram:
```
┌─────────────────────────────────────────────────────────────────┐
│                    USER COMPLETES KYC FORM                      │
│                                                                 │
│  1. Fill Personal Info → POST /api/kyc/submit-form             │
│     ✅ Sends: firstName, lastName, dob, email, phone, address   │
│     ✅ Calls: updateApplicant() → PATCH /fixedInfo              │
│     ✅ Result: APPLICANT_DATA completed ✅                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   USER UPLOADS DOCUMENTS                        │
│                                                                 │
│  2. Upload Files → POST /api/kyc/upload-document (local)       │
│     Files: passport.jpg, utility_bill.pdf                      │
│     Storage: Vercel Blob or local /uploads/                    │
│     Database: KycDocument (userId, fileUrl, metadata)          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SYNC TO SUMSUB VIA API                       │
│                                                                 │
│  3. Sync Documents → POST /api/kyc/sync-documents              │
│     For each document:                                          │
│       - Read from Vercel Blob/local                             │
│       - POST /resources/applicants/{id}/info/idDoc              │
│       - Include metadata (country, idDocType, etc.)             │
│     ✅ Result: IDENTITY completed ✅                             │
│     ⚠️  DO NOT call submitForReview() yet!                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    USER CLICKS "MOBILE LINK"                    │
│                                                                 │
│  4. Generate SDK Token → GET /api/kyc/mobile-link              │
│     ✅ Calls: POST /resources/sdkIntegrations/levels/{levelName}/websdkLink │
│     ✅ Returns: Sumsub SDK URL                                  │
│     ✅ Wraps in: /kyc/verify/{token} (white-label)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 USER OPENS SDK IN BROWSER/MOBILE                │
│                                                                 │
│  5. SDK Flow (Automatic):                                       │
│     a) SDK loads with applicant data ✅                          │
│     b) SDK shows IDENTITY docs (already uploaded) ✅             │
│     c) SDK asks for SELFIE with liveness detection              │
│     d) User takes selfie → SDK uploads to Sumsub ✅              │
│     e) SDK completes → AUTO-SUBMITS for review ✅                │
│     ✅ Result: SELFIE completed ✅                                │
│     ✅ Result: Applicant submitted ✅                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  SUMSUB PROCESSES & SENDS WEBHOOK               │
│                                                                 │
│  6. Webhook → POST /api/kyc/webhook/sumsub                     │
│     Events:                                                     │
│       - applicantPending → reviewStatus: "pending"              │
│       - applicantReviewed → reviewStatus: "completed"           │
│         - reviewAnswer: "GREEN" (approved)                      │
│         - reviewAnswer: "RED" (rejected)                        │
│     ✅ Updates KycSession in DB                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Required Fixes

### Fix 1: Webhook Secret Configuration

**Problem:** Using wrong secret for webhook signature verification.

**Solution:**
1. Sumsub Dashboard → Settings → Webhooks
2. Copy **Webhook Secret** (NOT API Secret!)
3. Admin Panel → Integrations → Sumsub → Add field:
   - `webhookSecret`: `<paste_webhook_secret>`

**Code already supports this:**
```typescript
const secretKey = (this.config as any).webhookSecret || this.config.secretKey;
```

### Fix 2: Remove Auto-Submit After Document Sync

**Problem:** We call `submitForReview()` before SDK completion.

**Solution:** Only submit if SDK is NOT required.

**Code fix:**
```typescript
// In sync-documents/route.ts
if (results.synced > 0 && results.failed === 0 && !needsSdkForIdentity) {
  // ✅ Safe to submit (no SDK required)
  await kycProvider.submitForReview(applicantId);
} else if (needsSdkForIdentity) {
  // ℹ️ SDK will handle submission
  console.log('SDK verification required - skipping auto-submit');
}
```

### Fix 3: Add Better Logging for Debugging

**Enhanced logging in:**
- `verifyWebhookSignature()` - show which secret is used
- `sync-documents` - show SDK detection logic
- `submit-form` - show exact data sent to Sumsub

---

## 📊 Status Tracking

### KycSession Status Flow:
```
PENDING (initial)
   ↓
PENDING (after form submit + documents sync)
   ↓
PENDING (SDK opened - no status change)
   ↓
PENDING_REVIEW (SDK completed + auto-submitted)
   ↓ [webhook: applicantReviewed]
APPROVED / REJECTED
```

### What Triggers Each Status:
- `PENDING` → Initial state after `/api/kyc/start`
- `PENDING_REVIEW` → SDK completion (automatic) OR API submit (if no SDK)
- `APPROVED` → Webhook: `reviewAnswer: "GREEN"`
- `REJECTED` → Webhook: `reviewAnswer: "RED"`

---

## 🎯 User Experience

### What User Sees:

1. **KYC Form Page** (`/kyc`)
   - Fill form → Submit ✅
   - Upload documents → Sync ✅
   - See "Mobile Link" button ✅

2. **Mobile Link Page** (`/kyc` after sync)
   - Button: "Complete Verification on Mobile"
   - QR Code for mobile
   - Or direct link for desktop

3. **SDK Page** (`/kyc/verify/{token}`)
   - Full-screen Sumsub SDK
   - Takes selfie with liveness
   - Shows success/error
   - Redirects back to `/kyc` ✅

4. **Status Page** (`/kyc` after SDK)
   - Status: "Under Review" (PENDING_REVIEW)
   - Polling: every 5s checks status
   - Updates: Approved/Rejected via webhook

---

## 🚀 Implementation Checklist

- [x] `updateApplicant()` on form submit
- [x] Store documents locally before sync
- [x] Sync documents via API (IDENTITY only)
- [ ] Fix: Only submit if no SDK required
- [ ] Fix: Add webhook secret configuration
- [ ] Fix: Enhanced webhook logging
- [x] SDK integration (`/kyc/verify/{token}`)
- [x] Webhook processing
- [ ] Test: Full end-to-end flow

---

## 📝 Next Steps

1. **Fix webhook secret** (config in admin panel)
2. **Deploy updated code** (don't auto-submit if SDK required)
3. **Test full flow:**
   - Submit form ✅
   - Upload docs ✅
   - Sync docs ✅
   - Open SDK ✅
   - Complete selfie ✅
   - Receive webhook ✅

---

## 🔍 Debug Commands

### Check webhook secret:
```sql
SELECT credentials FROM "Integration" WHERE service = 'sumsub';
```

### Check KYC session:
```sql
SELECT id, status, applicantId, metadata 
FROM "KycSession" 
WHERE userId = 'USER_ID' 
ORDER BY createdAt DESC 
LIMIT 1;
```

### Check documents:
```sql
SELECT id, fileName, documentType, syncedAt, syncStatus
FROM "KycDocument"
WHERE kycSessionId = 'SESSION_ID';
```

---

## ⚠️ Common Mistakes

1. ❌ Calling `submitForReview()` before SDK completion
2. ❌ Using `secretKey` for webhook verification (use `webhookSecret`)
3. ❌ Trying to upload SELFIE via API (SDK-only!)
4. ❌ Not handling 409 "applicant already exists" error
5. ❌ Forgetting to update `KycSession` status after webhook

---

## ✅ Success Criteria

Flow is complete when:
1. Personal info filled in Sumsub ✅
2. Documents uploaded to Sumsub ✅
3. Selfie captured via SDK ✅
4. Applicant auto-submitted ✅
5. Webhook received and processed ✅
6. `KycSession` status updated ✅

