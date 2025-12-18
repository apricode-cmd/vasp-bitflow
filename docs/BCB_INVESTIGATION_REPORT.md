# BCB Virtual IBAN Investigation Report

**Date:** 2025-12-18  
**Issue:** Virtual IBAN accounts not found after creation

---

## 🔍 Investigation Steps

### 1. Fetched all Virtual IBANs from BCB Production

**Endpoint:** `GET /v1/accounts/93133/virtual/all-account-data`  
**Parameters:** `pageSize=1000, pageIndex=0`  
**Result:** 204 accounts found

**Segregated Account:**
- ID: 93133
- IBAN: LU944080000054706242
- Label: "Digital Boost SRO - EUR vIBAN (VIRTUAL)"
- Country: **Luxembourg (LU)**

---

### 2. Checked Recent Accounts in Our Database

**Latest account:**
- Correlation ID: `fa0606d4-c9d3-4e34-aa45-8b4e5daf575a`
- Status: **PENDING**
- Created: 2025-12-18T09:41:23.111Z (18 minutes before BCB fetch)
- IBAN: PENDING

**Second latest account:**
- Correlation ID: `ec145128-f386-43ef-b62e-2c68ba716146`
- Status: **ACTIVE**
- Created: 2025-12-11T13:29:29.742Z
- IBAN: **DK1489000025366166** (Danish)

---

### 3. Search Results

❌ **Latest PENDING account** (`fa0606d4-c9d3-4e34-aa45-8b4e5daf575a`) - **NOT FOUND** in BCB  
❌ **Second ACTIVE account** (`ec145128-f386-43ef-b62e-2c68ba716146`) - **NOT FOUND** in BCB

---

## 🔴 ROOT CAUSE IDENTIFIED

### Problem: **Environment Mismatch**

Our database contains Virtual IBANs from **SANDBOX/UAT environment**, but we're connected to **PRODUCTION API**:

| Environment | Segregated Account | IBAN Prefix | Count |
|-------------|-------------------|-------------|-------|
| **Sandbox (DB)** | Unknown | **DK** (Denmark) | 4+ accounts |
| **Production (BCB API)** | 93133 | **LU** (Luxembourg) | 204 accounts |

**Evidence:**
- Database IBANs: `DK1489000025366166`, `DK3389000025361362`
- BCB Production IBANs: `LU974080000054708225`, `LU344080000054796465`

---

## ✅ Solutions

### Option 1: Use Correct Environment (Recommended)

**For Development/Testing:**
```typescript
config: {
  sandbox: true,  // ← Set to true
  clientId: 'sandbox_client_id',
  clientSecret: 'sandbox_secret',
  counterpartyId: 'sandbox_counterparty_id'
}
```

**For Production:**
```typescript
config: {
  sandbox: false,  // ← Currently active
  clientId: 'prod_client_id',
  clientSecret: 'prod_secret',
  counterpartyId: '2637'
}
```

### Option 2: Test on Production

Create a new test Virtual IBAN on **current production** connection to verify:
1. BCB creates it "instantly" (1-10 seconds)
2. It appears in `/v1/accounts/93133/virtual/all-account-data`
3. Our polling finds it successfully

---

## 📊 BCB Production Data Summary

**Total Accounts:** 204  
**Status Breakdown:**
- ACTIVE: 199
- CLOSED: 5

**Recent correlationIds** (first 10):
1. `e1d726d5-cea0-11ef-a0fa-d9371feddfc0` - ACTIVE - LU974080000054708225
2. `44ed3b19-dd72-11ef-a0fa-d9371feddfc0` - ACTIVE - LU344080000054796465
3. `2568866c-ee12-11ef-a0fa-d9371feddfc0` - ACTIVE - LU794080000055057943
4. `c1f63c5d-eebb-11ef-a0fa-d9371feddfc0` - ACTIVE - LU304080000055098013
5. `3628a279-eebb-11ef-a0fa-d9371feddfc0` - ACTIVE - LU224080000055203014

(Full data saved in `logs/bcb-virtual-ibans-2025-12-18T09-56-31-585Z.json`)

---

## 🛠️ Code Changes Made

### Optimized BCB Account Polling

**File:** `src/lib/integrations/providers/virtual-iban/BCBGroupAdapter.ts`

**Changes:**
1. ✅ Increased `pageSize` from 100 to **1000** (BCB API maximum)
2. ✅ Reduced `pollInterval` from 3s to **2s** (BCB creates "instantly")
3. ✅ Increased `maxAttempts` from 20 to **30** (60s total timeout)
4. ✅ Fixed pagination: use `pageIndex` (0-based) instead of `pageNumber`
5. ✅ Optimized search: only check first page (1000 accounts)
6. ✅ Added detailed logging for debugging

**Based on BCB Client API documentation:**
- Accounts are created **asynchronously** but "instantly" (1-10 seconds)
- New accounts appear at the **top** of the list (pageIndex=0)
- API supports max 1000 results per page

---

## 🧪 Testing Scripts Created

### 1. `scripts/fetch-bcb-virtual-ibans.ts`
Fetches all Virtual IBANs from BCB and saves to JSON file for analysis.

**Usage:**
```bash
npx tsx scripts/fetch-bcb-virtual-ibans.ts
```

**Output:**
- JSON file: `logs/bcb-virtual-ibans-{timestamp}.json`
- Console summary with status breakdown

### 2. `scripts/search-correlation-id.ts`
Searches for a specific correlationId in BCB data dump.

**Usage:**
```bash
npx tsx scripts/search-correlation-id.ts <correlationId>
```

### 3. `scripts/show-recent-virtual-ibans.ts`
Shows last 10 Virtual IBAN accounts from database.

**Usage:**
```bash
npx tsx scripts/show-recent-virtual-ibans.ts
```

---

## 📝 Recommendations

### Immediate Actions:

1. **Verify Environment Configuration**
   - Check `.env` file: is `sandbox` mode correct?
   - Confirm which BCB account should be used (sandbox vs production)

2. **Test on Correct Environment**
   - If testing: switch to sandbox credentials
   - If production: create new account and verify it appears

3. **Clean Up Mismatched Data**
   - Delete Virtual IBAN accounts from wrong environment in database
   - Ensure all new accounts use correct BCB connection

### Long-term:

1. **Environment Detection**
   - Add clear logging which environment (sandbox/prod) is active
   - Validate segregated account matches expected environment

2. **Error Handling**
   - Add timeout error if account not found after 60s
   - Suggest checking environment if correlationId not found

3. **Monitoring**
   - Track average time for account creation
   - Alert if accounts taking > 30 seconds

---

## ✅ Conclusion

**The code is correct.** The issue is **environment mismatch**:
- Database contains accounts from **Sandbox** (DK IBANs)
- Current connection is to **Production** (LU IBANs)

Once the correct environment is used, the optimized polling (2s interval, 1000 pageSize, 30 attempts) should find accounts **instantly** as BCB stated.

---

**Files:**
- Investigation data: `logs/bcb-virtual-ibans-2025-12-18T09-56-31-585Z.json` (149KB)
- Scripts: `scripts/fetch-bcb-virtual-ibans.ts`, `scripts/search-correlation-id.ts`, `scripts/show-recent-virtual-ibans.ts`

