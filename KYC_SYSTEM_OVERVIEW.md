# KYC System Overview - Как работает наша система

## 🎯 Общая схема

```
User → Frontend → API → SumsubAdapter → Sumsub API
                   ↓
               Database (KycSession, KycDocument, Profile)
```

---

## 📋 Основные компоненты

### 1. **Frontend** (`/kyc` страница)
- **KycFormWizard** - многошаговая форма (3 шага)
- **DocumentUploader** - загрузка файлов (локально)
- **localStorage** - сохранение данных формы

### 2. **Backend API Routes**
```
POST   /api/kyc/start           - Создать applicant в Sumsub
POST   /api/kyc/submit-form     - Сохранить форму + updateApplicant
POST   /api/kyc/upload-document - Загрузить файл локально (Vercel Blob)
POST   /api/kyc/sync-documents  - Отправить файлы в Sumsub
GET    /api/kyc/mobile-link     - Получить SDK ссылку
GET    /api/kyc/status          - Проверить статус
POST   /api/kyc/webhook/sumsub  - Получить обновления от Sumsub
```

### 3. **SumsubAdapter** (провайдер)
- `createApplicant()` - POST /applicants
- `updateApplicant()` - PATCH /fixedInfo
- `uploadDocument()` - POST /info/idDoc (multipart)
- `getApplicant()` - GET /applicants/{id}/one
- `verifyWebhookSignature()` - проверка HMAC
- `processWebhook()` - обработка событий

### 4. **Database Models**
- `KycSession` - сессия KYC (applicantId, status)
- `KycDocument` - загруженные документы (fileUrl, metadata)
- `Profile` - данные пользователя (firstName, dob, gender...)

---

## 🔄 User Flow (id-and-liveness level)

### Шаг 1: Заполнение формы
```
User fills form → Submit → POST /api/kyc/submit-form
                            ↓
                         Save to DB
                            ↓
                         updateApplicant() → PATCH /fixedInfo
                            ↓
                         ✅ APPLICANT_DATA completed
```

**Что отправляется в Sumsub:**
```json
POST /applicants:
{
  "email": "...",        // TOP LEVEL
  "phone": "...",        // TOP LEVEL
  "fixedInfo": {
    "firstName": "...",
    "lastName": "...",
    "dob": "YYYY-MM-DD",
    "gender": "M/F/X",
    "country": "POL",    // ISO-3
    "nationality": "UKR", // ISO-3
    "taxResidenceCountry": "POL",
    "addresses": [...]
  }
}
```

### Шаг 2: Загрузка документов
```
User uploads files → POST /api/kyc/upload-document
                      ↓
                   Store in Vercel Blob (or local /uploads/)
                      ↓
                   Save KycDocument in DB
                      ↓
User clicks "Sync" → POST /api/kyc/sync-documents
                      ↓
                   Read files from storage
                      ↓
                   uploadDocument() → POST /info/idDoc (multipart)
                      ↓
                   ✅ IDENTITY completed (if not SDK-only)
```

**Multipart request к Sumsub:**
```
POST /resources/applicants/{id}/info/idDoc
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="metadata"

{"idDocType":"PASSPORT","country":"UKR"}
--boundary
Content-Disposition: form-data; name="content"; filename="passport.jpg"
Content-Type: image/jpeg

<binary data>
--boundary--
```

### Шаг 3: SDK для селфи (SELFIE)
```
User clicks "Mobile Link" → GET /api/kyc/mobile-link
                             ↓
                          Sumsub generates SDK token
                             ↓
                          Wrap in /kyc/verify/{token}
                             ↓
User opens SDK page → Sumsub WebSDK loads
                             ↓
                          Takes selfie with liveness
                             ↓
                          SDK uploads to Sumsub automatically
                             ↓
                          SDK auto-submits for review
                             ↓
                          ✅ SELFIE completed
                             ↓
                          ✅ Applicant submitted for review
```

### Шаг 4: Webhook обработка
```
Sumsub reviews → Sends webhook → POST /api/kyc/webhook/sumsub
                                   ↓
                                Verify HMAC signature
                                   ↓
                                processWebhook()
                                   ↓
                                Update KycSession status
                                   ↓
                                ✅ APPROVED / REJECTED
```

---

## 🔑 Ключевые особенности

### 1. **Двухэтапная загрузка документов**
- **Этап 1:** Локальное хранение (Vercel Blob/filesystem)
- **Этап 2:** Синхронизация с Sumsub по кнопке

**Почему?** Пользователь может загрузить файлы до создания applicant.

### 2. **SDK для liveness detection**
- SELFIE **НЕЛЬЗЯ** загрузить через API
- **ТОЛЬКО** через SDK (Mobile/Web)
- SDK автоматически делает submit

### 3. **HMAC Authentication**
```typescript
signature = HMAC-SHA256(
  timestamp + METHOD + path + body,
  secretKey
)
```

**Headers:**
- `X-App-Token` - App Token
- `X-App-Access-Ts` - Unix timestamp
- `X-App-Access-Sig` - HMAC signature

### 4. **Webhook безопасность**
- Проверка HMAC signature
- Использование `webhookSecret` (отдельный от `secretKey`)
- Обработка событий: `applicantPending`, `applicantReviewed`, etc.

---

## 📊 Статусы KycSession

```
PENDING          → Initial / Documents uploaded
PENDING_REVIEW   → Submitted for Sumsub review
APPROVED         → Review passed (GREEN)
REJECTED         → Review failed (RED)
```

---

## 🗃️ Структура данных

### KycSession
```typescript
{
  id: string
  userId: string
  kycProviderId: "sumsub"
  applicantId: string         // Sumsub applicant ID
  verificationId: string       // Sumsub review ID
  status: "PENDING" | "PENDING_REVIEW" | "APPROVED" | "REJECTED"
  submittedAt: Date
  completedAt: Date
  metadata: JSON              // Additional data
}
```

### KycDocument
```typescript
{
  id: string
  userId: string
  kycSessionId: string        // Linked after form submit
  fileName: string
  fileUrl: string             // Vercel Blob URL or /uploads/...
  documentType: "PASSPORT" | "ID_CARD" | "UTILITY_BILL" | ...
  verificationData: JSON      // metadata for Sumsub
  syncedAt: Date
  syncStatus: "PENDING" | "SYNCED" | "FAILED"
}
```

---

## 🔧 Конфигурация Sumsub

### Admin Panel → Integrations → Sumsub
```json
{
  "appToken": "sbx:...",           // App Token
  "secretKey": "...",              // Secret Key (для API запросов)
  "webhookSecret": "...",          // Webhook Secret (для вебхуков)
  "levelName": "id-and-liveness"   // Level в Sumsub Dashboard
}
```

### Level requirements (id-and-liveness)
```
APPLICANT_DATA ✅ - Personal info (через API)
IDENTITY       ✅ - Document (через API)
SELFIE         ❌ - Selfie (ТОЛЬКО через SDK!)
```

---

## 🚨 Важные моменты

### 1. **Email/Phone location**
- POST /applicants: **TOP LEVEL** (не в fixedInfo)
- PATCH /fixedInfo: **Direct in body**

### 2. **Gender format**
- **Правильно:** "M", "F", "X"
- **Неправильно:** "MALE", "FEMALE"

### 3. **Country codes**
- Sumsub требует **ISO-3** (alpha-3)
- UKR, POL, DEU, GBR, USA...

### 4. **taxResidenceCountry**
- **Правильно:** `taxResidenceCountry`
- **Неправильно:** `taxResidence`

### 5. **Double-sided documents**
- ID_CARD требует **два запроса**:
  - `idDocSubType: "FRONT_SIDE"`
  - `idDocSubType: "BACK_SIDE"`

### 6. **Don't auto-submit if SDK required**
```typescript
// ❌ WRONG
if (allDocsSynced) submitForReview();

// ✅ CORRECT
if (allDocsSynced && !needsSdkForIdentity) {
  submitForReview();
} else {
  // SDK will handle submit
}
```

---

## 📝 Пример полного потока

```
1. User fills form (name, dob, address, etc.)
   → POST /api/kyc/submit-form
   → updateApplicant() to Sumsub
   → Personal Info filled ✅

2. User uploads passport.jpg + utility_bill.pdf
   → POST /api/kyc/upload-document (x2)
   → Files stored in Vercel Blob
   → KycDocument records created

3. User clicks "Sync Documents"
   → POST /api/kyc/sync-documents
   → uploadDocument() to Sumsub (x2)
   → IDENTITY completed ✅
   → ⚠️ Don't submit yet (SDK required)

4. User clicks "Mobile Link"
   → GET /api/kyc/mobile-link
   → Opens /kyc/verify/{token}
   → Sumsub SDK loads
   → Takes selfie with liveness
   → SELFIE completed ✅
   → SDK auto-submits ✅

5. Sumsub reviews (automatic)
   → POST /api/kyc/webhook/sumsub
   → applicantReviewed event
   → KycSession status → APPROVED ✅
```

---

## 🔗 Документация

- **Официальная:** https://docs.sumsub.com/reference
- **Наша:** `SUMSUB_ID_AND_LIVENESS_FLOW.md`
- **Postman:** `src/sumsub_postman.json`
- **Анализ:** `SUMSUB_POSTMAN_ANALYSIS.md`

