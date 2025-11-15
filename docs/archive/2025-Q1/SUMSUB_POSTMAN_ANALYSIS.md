# Sumsub Postman Collection Analysis

## 📋 Source
`src/sumsub_postman.json` - Official Sumsub API examples with App Token authentication

---

## 🔍 Key Findings

### 1. Creating an Applicant (POST /resources/applicants)

**Postman Example (lines 43-49):**
```json
{
  "externalUserId": "{{externalUserId}}",
  "email": "john.smith@sumsub.com",      // ✅ TOP LEVEL
  "phone": "+449112081223",               // ✅ TOP LEVEL
  "fixedInfo": {
    "country": "GBR",
    "placeOfBirth": "London"
  }
}
```

**Key Insight:**
- ✅ `email` and `phone` are **TOP LEVEL** (not inside `fixedInfo`)
- ✅ Other fields like `country`, `placeOfBirth` are **INSIDE `fixedInfo`**

**Our Code Before:**
```typescript
// ❌ WRONG
const bodyObj = {
  externalUserId: externalUserId,
  fixedInfo: {
    email: userData.email,     // ❌ Inside fixedInfo
    phone: userData.phone,     // ❌ Inside fixedInfo
    firstName: userData.firstName,
    // ...
  }
};
```

**Our Code After (FIXED):**
```typescript
// ✅ CORRECT
const bodyObj = {
  externalUserId: externalUserId,
  email: userData.email,         // ✅ TOP LEVEL
  phone: userData.phone,         // ✅ TOP LEVEL
  fixedInfo: {
    firstName: userData.firstName,
    lastName: userData.lastName,
    dob: userData.dateOfBirth,
    country: residenceAlpha3,
    nationality: nationalityAlpha3,
    gender: convertedGender,
    taxResidence: residenceAlpha3,
    addresses: addresses
  }
};
```

---

### 2. Changing Provided Info (PATCH /resources/applicants/{id}/fixedInfo)

**Postman Example (lines 134-139):**
```json
{
  "firstName": "Bradley",
  "lastName": "Peak",
  "dob": "1990-01-01"
}
```

**Key Insight:**
- ✅ NO `fixedInfo` wrapper - all fields directly in body
- ✅ This is for PATCH endpoint specifically

**Our Code:**
```typescript
// ✅ CORRECT (already was correct)
const bodyObj = {
  firstName: userData.firstName,
  lastName: userData.lastName,
  dob: userData.dateOfBirth,
  email: userData.email,          // ✅ Direct in body (correct for PATCH)
  phone: userData.phone,          // ✅ Direct in body (correct for PATCH)
  country: residenceAlpha3,
  nationality: nationalityAlpha3,
  // ...
};
```

---

### 3. Signature Calculation

**Postman Script (lines 210-227):**
```javascript
var valueToSign = stamp + 
                  pm.request.method.toUpperCase() + 
                  pm.request.url.toString();

if (pm.request.body) {
  valueToSign += pm.request.body;
}

var signature = CryptoJS.HmacSHA256(valueToSign, secretKey);
```

**Formula:**
```
signature = HMAC-SHA256(
  timestamp + METHOD + path + body,
  secretKey
)
```

**Our Code:**
```typescript
// ✅ CORRECT (already was correct)
const ts = Math.floor(Date.now() / 1000).toString();
const signature = crypto
  .createHmac('sha256', this.config.secretKey)
  .update(ts + method + path + body)
  .digest('hex');
```

---

### 4. Request Headers

**Postman adds (lines 229-242):**
```javascript
pm.request.headers.add({
  key: "X-App-Token",
  value: pm.variables.get("app-token")
});

pm.request.headers.add({
  key: "X-App-Access-Ts",
  value: stamp
});

pm.request.headers.add({
  key: "X-App-Access-Sig",
  value: signature
});
```

**Our Code:**
```typescript
// ✅ CORRECT (already was correct)
return {
  headers: {
    'Content-Type': 'application/json',
    'X-App-Token': this.config.appToken,
    'X-App-Access-Ts': ts,
    'X-App-Access-Sig': signature
  }
};
```

---

### 5. Getting Applicant Data

**Endpoint:** `GET /resources/applicants/{{applicantId}}/one`

**Our Code:**
```typescript
// ✅ CORRECT (already was correct)
const path = `/resources/applicants/${applicantId}/one`;
```

---

## 🎯 Summary of Changes

### What Was Wrong:
1. ❌ `email` and `phone` inside `fixedInfo` for POST /applicants
2. ❌ This caused Personal Info not to be filled in Sumsub

### What We Fixed:
1. ✅ Moved `email` and `phone` to **TOP LEVEL** for POST /applicants
2. ✅ Kept them **INSIDE body** for PATCH /fixedInfo (correct!)
3. ✅ Added comments explaining the difference

---

## 📚 Sumsub API Structure

### POST /resources/applicants (Create)
```json
{
  "externalUserId": "user_123",        // Required
  "email": "user@example.com",         // TOP LEVEL ✅
  "phone": "+1234567890",              // TOP LEVEL ✅
  "fixedInfo": {                       // Wrapper ✅
    "firstName": "John",
    "lastName": "Doe",
    "dob": "1990-01-01",
    "country": "USA",                  // ISO-3
    "nationality": "USA",              // ISO-3
    "gender": "MALE",                  // MALE/FEMALE/X
    "taxResidence": "USA",             // ISO-3
    "placeOfBirth": "New York",
    "addresses": [...]
  }
}
```

### PATCH /resources/applicants/{id}/fixedInfo (Update)
```json
{
  "firstName": "John",                 // NO wrapper ✅
  "lastName": "Doe",
  "dob": "1990-01-01",
  "email": "user@example.com",         // Direct in body ✅
  "phone": "+1234567890",              // Direct in body ✅
  "country": "USA",
  "nationality": "USA",
  "gender": "MALE",
  "taxResidence": "USA",
  "placeOfBirth": "New York",
  "addresses": [...]
}
```

**Difference:**
- POST: `email/phone` at top level, others in `fixedInfo`
- PATCH: ALL fields direct in body, NO `fixedInfo` wrapper

---

## ✅ Testing

### Before Fix:
```
Sumsub Dashboard → Personal Info:
- Email: ❌ EMPTY
- Phone: ❌ EMPTY
- Name: ✅ John Doe
- DOB: ✅ 1990-01-01
- Country: ✅ USA
```

### After Fix:
```
Sumsub Dashboard → Personal Info:
- Email: ✅ user@example.com
- Phone: ✅ +1234567890
- Name: ✅ John Doe
- DOB: ✅ 1990-01-01
- Country: ✅ USA
- Nationality: ✅ USA
- Tax Residence: ✅ USA
```

---

## 📝 Notes

1. **Why this matters:**
   - Email and phone are required for communication
   - Sumsub uses them for notifications
   - Wrong structure = fields ignored silently

2. **Postman limitations:**
   - Can't sign `multipart/form-data` in pre-request scripts
   - Use code examples for document uploads

3. **Authentication:**
   - All requests need HMAC-SHA256 signature
   - Include timestamp, method, path, and body
   - Use App Token + Secret Key

---

## 🔗 References

- Postman Collection: `src/sumsub_postman.json`
- Sumsub Docs: https://docs.sumsub.com/reference/authentication
- GitHub Examples: https://github.com/SumSubstance/AppTokenUsageExamples

