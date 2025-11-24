# KYC Data Flow Logging - Detailed Plan

**Date:** 2025-11-22  
**Goal:** Track complete data flow between User → System → KYC Provider → System → Admin

---

## 🔄 Complete Data Flow

```
User Actions:
  1. Start KYC
     ├─► System creates KYC session
     ├─► System → Sumsub: POST /resources/applicants
     │   └─► Log: Request payload, Response (applicantId)
     └─► User sees form URL

  2. User uploads documents
     ├─► User → System: POST /api/kyc/documents
     ├─► System → Sumsub: POST /resources/applicants/{id}/info/idDoc
     │   └─► Log: Document metadata, file size, response
     └─► Document saved in DB

  3. User submits for review
     ├─► User → System: POST /api/kyc/submit-review
     ├─► System → Sumsub: POST /resources/applicants/{id}/status/pending
     │   └─► Log: Request, Response, timestamp
     └─► Status: PENDING

Webhook Events:
  4. Sumsub reviews → sends webhook
     ├─► Sumsub → System: POST /api/webhooks/sumsub
     │   └─► Log: Full webhook payload, signature verification
     ├─► System updates KYC status
     └─► User notified

  5. User resubmits documents (if rejected)
     ├─► User → System: POST /api/kyc/resubmit-documents
     ├─► System → Sumsub: POST /resources/applicants/{id}/info/idDoc
     │   └─► Log: Which document, attempt number
     ├─► System → Sumsub: POST /resources/applicants/{id}/status/pending
     │   └─► Log: New review request
     └─► Back to PENDING

Admin Actions:
  6. Admin views KYC
     ├─► Admin → System: GET /api/admin/kyc/{id}
     └─► Log: Who viewed, when

  7. Admin manually approves/rejects
     ├─► Admin → System: PUT /api/admin/kyc/{id}
     │   └─► Log: Decision, reason, IP
     └─► Status changed
```

---

## 📊 What to Log for Each Event

### **1. User Starts KYC** (`KYC_CREATED`)

**Trigger:** `/api/kyc/start`

**User Action Log:**
```json
{
  "action": "KYC_CREATED",
  "userId": "cmid91xpb000c5pk5w5uu59p9",
  "entityType": "KYC_SESSION",
  "entityId": "ks_abc123",
  "metadata": {
    "provider": "sumsub",
    "userEmail": "demo@apricode.agency",
    "userCountry": "PL"
  }
}
```

**API Call Log (to Provider):**
```json
{
  "action": "KYC_API_REQUEST",
  "entityId": "ks_abc123",
  "metadata": {
    "provider": "sumsub",
    "endpoint": "POST /resources/applicants",
    "requestPayload": {
      "externalUserId": "cmid91xpb000c5pk5w5uu59p9",
      "info": {
        "firstName": "John",
        "lastName": "Doe",
        "country": "POL"
      }
    },
    "responsePayload": {
      "id": "692476053ae2f64a4a445392",
      "createdAt": "2025-11-22T10:00:00Z"
    },
    "responseTime": "245ms",
    "statusCode": 200
  }
}
```

---

### **2. User Uploads Document** (`KYC_DOCUMENT_UPLOADED`)

**Trigger:** `/api/kyc/resubmit-documents` or initial upload

**User Action Log:**
```json
{
  "action": "KYC_DOCUMENT_UPLOADED",
  "userId": "cmid91xpb000c5pk5w5uu59p9",
  "entityType": "KYC_SESSION",
  "entityId": "ks_abc123",
  "metadata": {
    "documentType": "PASSPORT",
    "fileName": "passport-front.jpg",
    "fileSize": 2458132,
    "mimeType": "image/jpeg",
    "isResubmission": false,
    "attempt": 1
  }
}
```

**API Call Log (to Provider):**
```json
{
  "action": "KYC_API_REQUEST",
  "entityId": "ks_abc123",
  "metadata": {
    "provider": "sumsub",
    "endpoint": "POST /resources/applicants/{id}/info/idDoc",
    "requestPayload": {
      "applicantId": "692476053ae2f64a4a445392",
      "idDocType": "PASSPORT",
      "country": "POL"
    },
    "responsePayload": {
      "imageId": "doc_xyz789",
      "reviewStatus": "PENDING"
    },
    "responseTime": "1250ms",
    "statusCode": 200
  }
}
```

---

### **3. User Submits for Review** (`KYC_SUBMITTED`)

**Trigger:** `/api/kyc/submit-review`

**User Action Log:**
```json
{
  "action": "KYC_SUBMITTED",
  "userId": "cmid91xpb000c5pk5w5uu59p9",
  "entityType": "KYC_SESSION",
  "entityId": "ks_abc123",
  "metadata": {
    "provider": "sumsub",
    "documentsCount": 3,
    "documentTypes": ["PASSPORT", "SELFIE", "UTILITY_BILL"],
    "attempt": 1
  }
}
```

**API Call Log (to Provider):**
```json
{
  "action": "KYC_API_REQUEST",
  "entityId": "ks_abc123",
  "metadata": {
    "provider": "sumsub",
    "endpoint": "POST /resources/applicants/{id}/status/pending",
    "requestPayload": {
      "applicantId": "692476053ae2f64a4a445392"
    },
    "responsePayload": {
      "reviewStatus": "pending",
      "reviewId": "rev_12345"
    },
    "responseTime": "180ms",
    "statusCode": 200
  }
}
```

---

### **4. Webhook Received** (`KYC_WEBHOOK_RECEIVED`)

**Trigger:** `/api/webhooks/sumsub` or `/api/webhooks/kycaid`

**System Log (as Admin with actor='system'):**
```json
{
  "action": "KYC_WEBHOOK_RECEIVED",
  "adminId": "system",
  "entityType": "KYC_SESSION",
  "entityId": "ks_abc123",
  "diffBefore": {
    "status": "PENDING"
  },
  "diffAfter": {
    "status": "REJECTED"
  },
  "metadata": {
    "provider": "sumsub",
    "webhookType": "applicantReviewed",
    "webhookPayload": {
      "applicantId": "692476053ae2f64a4a445392",
      "reviewResult": {
        "reviewAnswer": "RED",
        "reviewRejectType": "RETRY",
        "rejectLabels": ["BAD_SELFIE", "DOCUMENT_PAGE_MISSING"],
        "moderationComment": "Selfie quality is poor, document is incomplete"
      },
      "createdAt": "2025-11-22T14:00:00Z"
    },
    "signatureVerified": true
  }
}
```

---

### **5. User Resubmits Documents** (`KYC_RESUBMITTED`)

**Trigger:** `/api/kyc/resubmit-documents` (last document)

**User Action Log:**
```json
{
  "action": "KYC_RESUBMITTED",
  "userId": "cmid91xpb000c5pk5w5uu59p9",
  "entityType": "KYC_SESSION",
  "entityId": "ks_abc123",
  "diffBefore": {
    "status": "REJECTED"
  },
  "diffAfter": {
    "status": "PENDING"
  },
  "metadata": {
    "documentsUploaded": 2,
    "documentTypes": ["PASSPORT", "SELFIE"],
    "previousRejectLabels": ["BAD_SELFIE", "DOCUMENT_PAGE_MISSING"],
    "attempt": 2
  }
}
```

**API Call Log (to Provider):**
```json
{
  "action": "KYC_API_REQUEST",
  "entityId": "ks_abc123",
  "metadata": {
    "provider": "sumsub",
    "endpoint": "POST /resources/applicants/{id}/status/pending",
    "requestPayload": {
      "applicantId": "692476053ae2f64a4a445392"
    },
    "responsePayload": {
      "reviewStatus": "pending"
    },
    "responseTime": "160ms",
    "statusCode": 200,
    "note": "Review requested after resubmission"
  }
}
```

---

### **6. Admin Approves/Rejects** (`KYC_APPROVED` / `KYC_REJECTED`)

**Trigger:** `/api/admin/kyc/{id}` (PUT)

**Admin Action Log:**
```json
{
  "action": "KYC_REJECTED",
  "adminId": "admin_xyz",
  "adminEmail": "john@bitflow.biz",
  "adminRole": "SUPER_ADMIN",
  "entityType": "KYC_SESSION",
  "entityId": "ks_abc123",
  "diffBefore": {
    "status": "PENDING"
  },
  "diffAfter": {
    "status": "REJECTED",
    "rejectionReason": "Documents are not clear enough"
  },
  "metadata": {
    "userId": "cmid91xpb000c5pk5w5uu59p9",
    "userEmail": "demo@apricode.agency",
    "provider": "sumsub",
    "attempt": 2,
    "reviewTime": "5 minutes"
  },
  "severity": "INFO",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

---

## 🏗️ Implementation Structure

### **New Log Action Constants**

Add to `src/lib/services/audit.service.ts`:

```typescript
export const AUDIT_ACTIONS = {
  // ... existing ...
  
  // KYC User Actions
  KYC_CREATED: 'KYC_CREATED',
  KYC_SUBMITTED: 'KYC_SUBMITTED',
  KYC_DOCUMENT_UPLOADED: 'KYC_DOCUMENT_UPLOADED',
  KYC_RESUBMITTED: 'KYC_RESUBMITTED',
  
  // KYC Admin Actions
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
  KYC_DELETED: 'KYC_DELETED',
  KYC_VIEWED: 'KYC_VIEWED',
  
  // KYC System Actions
  KYC_WEBHOOK_RECEIVED: 'KYC_WEBHOOK_RECEIVED',
  KYC_STATUS_CHANGED: 'KYC_STATUS_CHANGED',
  
  // KYC API Calls (NEW!)
  KYC_API_REQUEST: 'KYC_API_REQUEST',
  KYC_API_ERROR: 'KYC_API_ERROR',
} as const;
```

---

### **Helper Function for API Call Logging**

Create: `src/lib/services/kyc-api-logger.service.ts` (NEW)

```typescript
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from './audit.service';

interface KycApiCallLog {
  kycSessionId: string;
  provider: 'sumsub' | 'kycaid';
  endpoint: string;
  method: string;
  requestPayload?: any;
  responsePayload?: any;
  responseTime?: string;
  statusCode?: number;
  error?: string;
  note?: string;
}

export class KycApiLoggerService {
  /**
   * Log API call to KYC provider
   */
  static async logApiRequest(params: KycApiCallLog): Promise<void> {
    try {
      const action = params.error ? AUDIT_ACTIONS.KYC_API_ERROR : AUDIT_ACTIONS.KYC_API_REQUEST;
      
      await auditService.logAdminAction(
        'system', // System actor
        action,
        AUDIT_ENTITIES.KYC_SESSION,
        params.kycSessionId,
        {}, // No diff for API calls
        {},
        {
          provider: params.provider,
          endpoint: `${params.method} ${params.endpoint}`,
          requestPayload: params.requestPayload,
          responsePayload: params.responsePayload,
          responseTime: params.responseTime,
          statusCode: params.statusCode,
          error: params.error,
          note: params.note,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to log KYC API call:', error);
      // Don't throw - logging should not break main flow
    }
  }

  /**
   * Measure and log API call with timing
   */
  static async measureApiCall<T>(
    kycSessionId: string,
    provider: 'sumsub' | 'kycaid',
    endpoint: string,
    method: string,
    requestPayload: any,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      const responseTime = `${Date.now() - startTime}ms`;
      
      // Log successful call
      await this.logApiRequest({
        kycSessionId,
        provider,
        endpoint,
        method,
        requestPayload,
        responsePayload: result,
        responseTime,
        statusCode: 200
      });
      
      return result;
      
    } catch (error: any) {
      const responseTime = `${Date.now() - startTime}ms`;
      
      // Log failed call
      await this.logApiRequest({
        kycSessionId,
        provider,
        endpoint,
        method,
        requestPayload,
        error: error.message,
        responseTime,
        statusCode: error.statusCode || 500
      });
      
      throw error;
    }
  }
}

export const kycApiLogger = KycApiLoggerService;
```

---

### **Usage Example in SumsubAdapter**

Update `src/lib/integrations/providers/kyc/SumsubAdapter.ts`:

```typescript
import { kycApiLogger } from '@/lib/services/kyc-api-logger.service';

export class SumsubAdapter implements IKycProvider {
  
  // Example: createApplicant with logging
  async createApplicant(userData: KycUserData): Promise<KycApplicant> {
    const kycSessionId = userData.kycSessionId; // Need to pass this
    
    const result = await kycApiLogger.measureApiCall(
      kycSessionId,
      'sumsub',
      '/resources/applicants',
      'POST',
      {
        externalUserId: userData.userId,
        info: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          country: normalizeCountryCodeForProvider(userData.nationality, 'sumsub')
        }
      },
      async () => {
        // Actual API call
        const response = await fetch(`${this.baseUrl}/resources/applicants`, {
          method: 'POST',
          headers: this.buildHeaders('POST', '/resources/applicants'),
          body: JSON.stringify({
            externalUserId: userData.userId,
            // ... rest of payload
          })
        });
        
        return await response.json();
      }
    );
    
    return {
      applicantId: result.id,
      status: 'pending',
      formUrl: result.formUrl
    };
  }
  
  // Example: uploadDocumentForResubmission with logging
  async uploadDocumentForResubmission(
    applicantId: string,
    file: File,
    documentType: string,
    kycSessionId: string // NEW parameter
  ): Promise<void> {
    const endpoint = `/resources/applicants/${applicantId}/info/idDoc`;
    
    await kycApiLogger.measureApiCall(
      kycSessionId,
      'sumsub',
      endpoint,
      'POST',
      {
        applicantId,
        idDocType: documentType,
        fileName: file.name,
        fileSize: file.size
      },
      async () => {
        // Actual upload
        const formData = new FormData();
        formData.append('content', file);
        // ... metadata
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: this.buildHeaders('POST', endpoint),
          body: formData
        });
        
        return await response.json();
      }
    );
  }
  
  // Example: requestApplicantCheck with logging
  async requestApplicantCheck(
    applicantId: string,
    kycSessionId: string // NEW parameter
  ): Promise<void> {
    const endpoint = `/resources/applicants/${applicantId}/status/pending`;
    
    await kycApiLogger.measureApiCall(
      kycSessionId,
      'sumsub',
      endpoint,
      'POST',
      { applicantId },
      async () => {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: this.buildHeaders('POST', endpoint)
        });
        
        return await response.json();
      }
    );
  }
}
```

---

## 📋 Complete Timeline Example

**For User:** `demo@apricode.agency`  
**KYC Session:** `ks_abc123`  
**Applicant ID:** `692476053ae2f64a4a445392`

```
📅 2025-11-22 10:00:00 | USER | KYC Created
   └─► Metadata: Provider: Sumsub, Country: PL

📡 2025-11-22 10:00:01 | SYSTEM | API Request
   └─► POST /resources/applicants (200, 245ms)
   └─► Request: { externalUserId, firstName, lastName, country: POL }
   └─► Response: { id: 692476053ae2f64a4a445392, createdAt }

📤 2025-11-22 10:05:30 | USER | Document Uploaded
   └─► Document: PASSPORT (passport-front.jpg, 2.4 MB)

📡 2025-11-22 10:05:31 | SYSTEM | API Request
   └─► POST /resources/applicants/{id}/info/idDoc (200, 1250ms)
   └─► Request: { idDocType: PASSPORT, country: POL }
   └─► Response: { imageId: doc_xyz789 }

📤 2025-11-22 10:07:15 | USER | Document Uploaded
   └─► Document: SELFIE (selfie.jpg, 1.8 MB)

📡 2025-11-22 10:07:16 | SYSTEM | API Request
   └─► POST /resources/applicants/{id}/info/idDoc (200, 980ms)

📤 2025-11-22 10:08:45 | USER | Document Uploaded
   └─► Document: UTILITY_BILL (utility.pdf, 3.1 MB)

📡 2025-11-22 10:08:46 | SYSTEM | API Request
   └─► POST /resources/applicants/{id}/info/idDoc (200, 1450ms)

✅ 2025-11-22 10:10:00 | USER | KYC Submitted
   └─► Documents: 3 (PASSPORT, SELFIE, UTILITY_BILL)
   └─► Attempt: 1

📡 2025-11-22 10:10:01 | SYSTEM | API Request
   └─► POST /resources/applicants/{id}/status/pending (200, 180ms)
   └─► Response: { reviewStatus: pending, reviewId: rev_12345 }

📨 2025-11-22 14:00:00 | SYSTEM | Webhook Received
   └─► Provider: Sumsub, Type: applicantReviewed
   └─► Result: RED (RETRY)
   └─► Reject Labels: BAD_SELFIE, DOCUMENT_PAGE_MISSING
   └─► Comment: "Selfie quality is poor, document is incomplete"
   └─► Status: PENDING → REJECTED

📤 2025-11-22 15:15:00 | USER | Document Uploaded (Resubmission)
   └─► Document: PASSPORT (passport-new.jpg, 2.6 MB)
   └─► Attempt: 2

📡 2025-11-22 15:15:01 | SYSTEM | API Request
   └─► POST /resources/applicants/{id}/info/idDoc (200, 1100ms)

📤 2025-11-22 15:16:00 | USER | Document Uploaded (Resubmission)
   └─► Document: SELFIE (selfie-new.jpg, 2.0 MB)
   └─► Attempt: 2

📡 2025-11-22 15:16:01 | SYSTEM | API Request
   └─► POST /resources/applicants/{id}/info/idDoc (200, 950ms)

🔄 2025-11-22 15:16:30 | USER | KYC Resubmitted
   └─► Documents: 2 (PASSPORT, SELFIE)
   └─► Status: REJECTED → PENDING
   └─► Attempt: 2

📡 2025-11-22 15:16:31 | SYSTEM | API Request
   └─► POST /resources/applicants/{id}/status/pending (200, 160ms)
   └─► Note: "Review requested after resubmission"

📨 2025-11-22 15:30:00 | SYSTEM | Webhook Received
   └─► Provider: Sumsub, Type: applicantReviewed
   └─► Result: GREEN
   └─► Status: PENDING → APPROVED

👨‍💼 2025-11-22 15:35:00 | ADMIN | KYC Viewed
   └─► Admin: john@bitflow.biz (SUPER_ADMIN)
   └─► IP: 192.168.1.100

✅ 2025-11-22 15:36:00 | ADMIN | KYC Approved (Manual Confirmation)
   └─► Admin: john@bitflow.biz
   └─► Status: APPROVED → APPROVED (confirmed)
   └─► Review Time: 6 minutes
```

---

## ✅ Benefits of This Approach

1. **Complete Traceability**
   - ✅ See every request to KYC provider
   - ✅ See every response with timing
   - ✅ See what user uploaded and when
   - ✅ See webhook events as they arrive

2. **Performance Monitoring**
   - ✅ Track API response times
   - ✅ Identify slow endpoints
   - ✅ Detect timeouts/errors

3. **Debugging**
   - ✅ Reproduce issues with exact payloads
   - ✅ See what went wrong in API calls
   - ✅ Verify webhook signatures

4. **Compliance**
   - ✅ Full audit trail for regulators
   - ✅ Know who approved/rejected and why
   - ✅ Track resubmissions and attempts

5. **Business Intelligence**
   - ✅ Average KYC completion time
   - ✅ Most common rejection reasons
   - ✅ Document resubmission rates

---

## 🚀 Implementation Order

1. **Create `kycApiLogger` service** (1 hour)
2. **Add logging to SumsubAdapter** (2 hours)
3. **Add logging to KYCAID adapter** (1 hour)
4. **Add logging to all KYC endpoints** (2 hours)
5. **Update frontend timeline** (1 hour)
6. **Testing** (2 hours)

**Total:** ~9 hours

---

**Ready to implement?** 🎯


