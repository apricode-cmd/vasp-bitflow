# KYC Sumsub Integration - Complete Architecture & Implementation Plan

## 📋 Current Architecture Analysis

### 1. Data Flow

```
User Profile (DB)
    ↓
kyc.service.ts → startKycVerification()
    ↓
Collect userData from user.profile
    ↓
SumsubAdapter.createApplicant()
    ↓
POST /resources/applicants?levelName=id-and-liveness
```

### 2. Currently Sent Fields (fixedInfo)

```typescript
// src/lib/services/kyc.service.ts (lines 235-248)
const userData: KycUserData = {
  email: user.email,
  firstName: user.profile.firstName,
  lastName: user.profile.lastName,
  dateOfBirth: formatDateForKyc(user.profile.dateOfBirth),
  nationality: alpha3ToIso2(user.profile.nationality),  // ISO2
  residenceCountry: alpha3ToIso2(user.profile.country), // ISO2
  phone: user.profile.phoneNumber,
  city: user.profile.city || undefined,
  postalCode: user.profile.postalCode || undefined,
  address: user.profile.address || undefined,
  placeOfBirth: user.profile.placeOfBirth || undefined,
  externalId: userId
};
```

### 3. SumsubAdapter Mapping

```typescript
// src/lib/integrations/providers/kyc/SumsubAdapter.ts (lines 310-320)
fixedInfo: {
  firstName: userData.firstName,
  lastName: userData.lastName,
  dob: userData.dateOfBirth,
  placeOfBirth: userData.placeOfBirth,
  country: countryAlpha3,        // Residence country (ISO3)
  nationality: countryAlpha3,     // Nationality (ISO3)
  gender: userData.gender,        // M/F if available
  taxResidence: countryAlpha3,    // ✅ Already added!
  addresses: [{...}]              // Address array
}
```

## 🎯 Sumsub Requirements for Level "id-and-liveness"

### Required Steps to Complete:

1. **APPLICANT_DATA** ✅ (Almost complete)
   - firstName ✅
   - lastName ✅
   - dob ✅
   - nationality ✅
   - country (residence) ✅
   - taxResidence ✅ (Added in commit 502f931)
   - addresses ✅
   - placeOfBirth ✅
   - gender ⚠️ (Optional but recommended)

2. **IDENTITY** ❌ (Need to implement)
   - Document upload via API or SDK
   - Types: PASSPORT, ID_CARD, DRIVERS
   - For double-sided: FRONT_SIDE + BACK_SIDE

3. **SELFIE** ❌ (SDK only)
   - Mobile SDK Link (Already implemented!)
   - WebSDK integration

## 🔧 Missing Fields in User Profile

### Gender Field

```sql
-- Check if gender field exists in UserProfile
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'UserProfile' 
AND column_name = 'gender';
```

**Action:** Add gender field to UserProfile if missing

```sql
ALTER TABLE "UserProfile" 
ADD COLUMN "gender" TEXT CHECK ("gender" IN ('M', 'F', 'O'));
```

## 📝 Implementation Plan

### Phase 1: Complete APPLICANT_DATA ✅

**Status:** Almost complete, need to add gender

**Files to modify:**
1. `prisma/schema.prisma` - Add gender field
2. `src/lib/services/kyc.service.ts` - Include gender in userData
3. `src/lib/integrations/providers/kyc/SumsubAdapter.ts` - Already includes gender

**SQL Migration:**
```sql
-- Add gender to UserProfile
ALTER TABLE "UserProfile" 
ADD COLUMN IF NOT EXISTS "gender" TEXT CHECK ("gender" IN ('M', 'F', 'O'));

-- Add gender to KYC form
INSERT INTO "KycFormField" (
  "id",
  "kycProviderId",
  "stepId",
  "category",
  "fieldName",
  "fieldLabel",
  "fieldType",
  "required",
  "order",
  "validationRules"
) VALUES (
  gen_random_uuid(),
  'sumsub',
  (SELECT id FROM "KycFormStep" WHERE "kycProviderId" = 'sumsub' AND step = 1 LIMIT 1),
  'Personal Information',
  'gender',
  'Gender',
  'select',
  false,
  85,
  '{"options": [{"value": "M", "label": "Male"}, {"value": "F", "label": "Female"}, {"value": "O", "label": "Other"}]}'
) ON CONFLICT DO NOTHING;
```

### Phase 2: Implement IDENTITY Document Upload 📄

**Current Status:** 
- Upload endpoint exists: `/api/kyc/upload-document`
- Sync endpoint exists: `/api/kyc/sync-documents`
- Problem: Level "id-and-liveness" may be SDK-only

**Two Approaches:**

#### Approach A: Hybrid (Form + SDK)
1. User fills form with profile data → `APPLICANT_DATA` ✅
2. User uploads ID document via form → `IDENTITY` ✅
3. User scans QR code for liveness → `SELFIE` ✅

**Files:**
- ✅ `src/app/api/kyc/upload-document/route.ts` (exists)
- ✅ `src/app/api/kyc/sync-documents/route.ts` (exists)
- ✅ `src/components/kyc/DocumentUploader.tsx` (exists)

#### Approach B: Full SDK (Recommended for id-and-liveness)
1. User fills form with profile data → `APPLICANT_DATA` ✅
2. User scans QR code → WebSDK handles IDENTITY + SELFIE ✅

**Files:**
- ✅ `src/app/api/kyc/mobile-link/route.ts` (exists)
- Need: Update UI to show Mobile Link after form submission

### Phase 3: SELFIE via SDK 📱

**Status:** Already implemented!

**Existing Implementation:**
- ✅ `/api/kyc/mobile-link` - Generates branded WebSDK URL
- ✅ QR code generation
- ✅ White-label URL wrapper

**What's Missing:**
- UI to show Mobile Link after form submission
- Instructions for user to complete SDK verification

### Phase 4: Submit for Review ✅

**Status:** Implemented but failing due to missing steps

**Existing Implementation:**
- ✅ `/api/kyc/sync-documents` - Already calls `submitForReview()`
- ✅ Updates session status to `PENDING_REVIEW`

**Problem:**
- Sumsub returns 409 if not all steps complete:
  - APPLICANT_DATA ✅ (after adding gender)
  - IDENTITY ❌ (need SDK or API upload)
  - SELFIE ❌ (need SDK)

## 🚀 Recommended Implementation Strategy

### Option 1: Quick Fix - SDK Only ⭐ (Recommended)

**Why:** Level "id-and-liveness" is designed for SDK verification

**Steps:**
1. ✅ Add gender field to profile
2. ✅ Complete APPLICANT_DATA
3. ❌ Remove document upload fields from form
4. ✅ Show Mobile SDK Link after form submission
5. ✅ User completes IDENTITY + SELFIE in SDK
6. ✅ Auto-submit when SDK complete (webhook)

**Changes needed:**
- Update `KycFormWizard` to show Mobile Link on final step
- Hide document upload fields for Sumsub
- Add webhook handler for Sumsub callbacks

### Option 2: Hybrid Approach

**Why:** Keep document upload for flexibility

**Steps:**
1. ✅ Add gender field
2. ✅ Complete APPLICANT_DATA  
3. ✅ Allow PASSPORT upload via API
4. ✅ Show Mobile Link for SELFIE
5. ✅ Submit when all complete

**Changes needed:**
- Keep document upload fields
- Validate that PASSPORT uploaded before submit
- Show Mobile Link for SELFIE step
- Check all steps complete before submit

## 📊 Current State Summary

### ✅ Working:
- User profile data collection
- Sumsub applicant creation
- taxResidence field added
- Mobile SDK Link generation
- Document upload API endpoints
- Sync documents to Sumsub

### ⚠️ Issues:
- Gender field missing in profile
- Level "id-and-liveness" may reject API document upload
- SELFIE not integrated into UI flow
- Submit fails due to incomplete steps

### ❌ Not Implemented:
- Gender field in database
- Mobile Link UI after form submission
- Webhook handler for SDK completion
- Auto-submit after SDK verification

## 🎯 Next Steps (Prioritized)

1. **Add gender field** to UserProfile and KYC form
2. **Test current applicant creation** - check if APPLICANT_DATA accepted
3. **Determine SDK vs API** for IDENTITY:
   - Check Sumsub logs for requiredIdDocs.docSets
   - If docSets exist → SDK only
   - If not → can use API upload
4. **Implement Mobile Link UI** after form submission
5. **Add webhook handler** for Sumsub verification complete
6. **Test full flow** with real user

## 📁 Key Files Reference

### Data Collection:
- `src/lib/services/kyc.service.ts` (lines 132-255)
- `src/lib/integrations/categories/IKycProvider.ts`

### Sumsub Integration:
- `src/lib/integrations/providers/kyc/SumsubAdapter.ts`
- `src/app/api/kyc/start/route.ts`
- `src/app/api/kyc/sync-documents/route.ts`

### UI Components:
- `src/components/kyc/KycFormWizard.tsx`
- `src/components/kyc/DocumentUploader.tsx`
- `src/app/(client)/kyc/page.tsx`

### Admin:
- `src/app/(admin)/admin/kyc-fields/page.tsx`
- `src/app/api/admin/kyc/form-fields/route.ts`

## 🔄 Testing Checklist

- [ ] Gender field added to database
- [ ] Gender field appears in KYC form
- [ ] Create new applicant with all fields
- [ ] Check Sumsub logs for APPLICANT_DATA acceptance
- [ ] Test IDENTITY upload (if API supported)
- [ ] Test Mobile SDK Link generation
- [ ] Complete SDK verification
- [ ] Verify webhook received
- [ ] Check final status = APPROVED

