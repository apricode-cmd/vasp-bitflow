# KYC Integration Guide

## 🎯 Overview

Apricode Exchange использует модульную систему KYC интеграций, которая позволяет легко подключать различных провайдеров (KYCAID, SumSub, Onfido и т.д.).

## 🏗️ Архитектура

```
Client → Start KYC → Create Applicant → Create Verification → Get Form URL → Liveness Check → Webhook/Polling → Approve/Reject
```

### Компоненты:

1. **IKycProvider** - Интерфейс для всех KYC провайдеров
2. **KycaidAdapter** - Полная реализация для KYCAID
3. **KYC Service** - Универсальный сервис (работает с любым активным провайдером)
4. **API Endpoints** - REST API для клиента
5. **Webhook Handler** - Обработка веб-хуков от провайдеров
6. **Polling** - Fallback механизм

## 🔧 Настройка KYCAID

### 1. Получите credentials

Зарегистрируйтесь на [KYCAID](https://kycaid.com) и получите:
- `KYCAID_API_TOKEN` - API ключ
- `KYCAID_FORM_ID` - ID формы с liveness check

### 2. Добавьте в .env.local

```bash
# KYCAID Configuration
KYCAID_API_TOKEN="your_api_token_here"
KYCAID_FORM_ID="form_basic_liveness"
KYCAID_WEBHOOK_SECRET="your_webhook_secret" # Optional
```

### 3. Активируйте в админке

1. Перейдите в `/admin/integrations`
2. Найдите **KYCAID**
3. Включите ползунок "Enabled"
4. Нажмите "Configure"
5. Введите:
   - **API Key**: Ваш KYCAID_API_TOKEN
   - **Form ID**: Ваш KYCAID_FORM_ID (например, `form_basic_liveness`)
   - **Webhook Secret** (optional): Для проверки подписи
6. Нажмите "Save Configuration"
7. Нажмите "Test Connection" для проверки

### 4. Настройте webhook (опционально)

В панели KYCAID:
1. Go to Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/kyc/webhook?provider=kycaid`
3. Enable events: `verification.completed`, `verification.approved`, `verification.rejected`
4. Copy webhook secret и добавьте в конфигурацию

## 📝 API Flow

### Client-Side Flow:

```typescript
// 1. Start KYC verification
const response = await fetch('/api/kyc/start', { method: 'POST' });
const { formUrl, verificationId } = await response.json();

// 2. Open form in new window
window.open(formUrl, '_blank');

// 3. Poll for status (optional, webhook will update automatically)
const status = await fetch('/api/kyc/status');
const { status, message } = await status.json();
```

### Backend Flow:

```typescript
// 1. Create applicant
const applicant = await provider.createApplicant(userData);

// 2. Create verification
const verification = await provider.createVerification(applicant.applicantId);

// 3. Get form URL
const formUrl = await provider.getFormUrl(applicant.applicantId);

// 4. Wait for webhook or poll status
const status = await provider.getVerificationStatus(verification.verificationId);
```

## 🔌 Webhook Payload (KYCAID)

```json
{
  "verification_id": "ver_123",
  "applicant_id": "appl_456",
  "status": "APPROVED",
  "reasons": null,
  "timestamp": "2025-10-27T12:34:56Z"
}
```

Headers:
```
X-Signature: hmac-sha256-signature
Content-Type: application/json
```

## 🔄 Status Mapping

| KYCAID Status | Our Status | Description |
|--------------|-----------|-------------|
| `PENDING` | `PENDING` | Under review |
| `APPROVED` | `APPROVED` | Verified ✅ |
| `REJECTED` | `REJECTED` | Declined ❌ |
| `DECLINED` | `REJECTED` | Declined ❌ |
| `EXPIRED` | `EXPIRED` | Expired ⏰ |

## 📋 Required User Data

```typescript
interface KycUserData {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  nationality: string; // ISO2 code (e.g. "PL", "US")
  residenceCountry: string; // ISO2 code
  phone: string; // International format +48500111222
  address?: string;
  city?: string;
  postalCode?: string;
  externalId?: string; // Our internal user ID
}
```

Эти данные берутся из таблицы `Profile`.

## 🧪 Testing

### Test with KYCAID Sandbox:

```bash
# 1. Use sandbox credentials
KYCAID_API_TOKEN="sandbox_token"
KYCAID_FORM_ID="sandbox_form_id"

# 2. Test API
curl -X POST http://localhost:3000/api/kyc/start \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"

# 3. Open returned formUrl in browser

# 4. Complete liveness check

# 5. Check status
curl http://localhost:3000/api/kyc/status \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

## 🆕 Adding New Provider (e.g., SumSub)

### 1. Create adapter

```typescript
// src/lib/integrations/providers/kyc/SumSubAdapter.ts

export class SumSubAdapter implements IKycProvider {
  public readonly providerId = 'sumsub';
  public readonly category = IntegrationCategory.KYC;
  
  async createApplicant(userData: KycUserData): Promise<KycApplicant> {
    // Implement SumSub API call
  }
  
  async createVerification(applicantId: string): Promise<KycVerificationSession> {
    // Implement
  }
  
  async getFormUrl(applicantId: string): Promise<KycFormUrl> {
    // Implement
  }
  
  async getVerificationStatus(verificationId: string): Promise<KycVerificationResult> {
    // Implement
  }
  
  // ... other methods
}
```

### 2. Register in registry

```typescript
// src/lib/integrations/IntegrationRegistry.ts

import { sumsubAdapter } from './providers/kyc/SumSubAdapter';

this.register({
  providerId: 'sumsub',
  category: IntegrationCategory.KYC,
  displayName: 'SumSub',
  description: 'AI-powered identity verification',
  icon: '🤖',
  instance: sumsubAdapter
});
```

### 3. Add to integrations page

Done! The system will automatically:
- Show in `/admin/integrations`
- Allow activation/configuration
- Use when active
- Handle webhooks at `/api/kyc/webhook?provider=sumsub`

## 🔐 Security

✅ **Implemented:**
- API key encryption (AES-256-GCM)
- Webhook signature verification
- Session management
- Audit logging
- User authorization checks

## 📊 Database Schema

```prisma
model KycSession {
  id                     String    @id @default(cuid())
  userId                 String
  kycProviderId          String    // 'kycaid', 'sumsub', etc.
  kycaidApplicantId      String?   // Provider's applicant ID
  kycaidVerificationId   String?   // Provider's verification ID
  status                 KycStatus @default(PENDING)
  submittedAt            DateTime?
  reviewedAt             DateTime?
  completedAt            DateTime?
  rejectionReason        String?
  webhookData            Json?
  metadata               Json?
  attempts               Int       @default(1)
  lastAttemptAt          DateTime  @default(now())
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum KycStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}
```

## 📈 Monitoring

Track KYC metrics in `/admin/kyc`:
- Total verifications
- Pending reviews
- Approval rate
- Average processing time
- Provider performance

## 🆘 Troubleshooting

### Issue: "KYC provider not configured"
**Solution:** Activate a KYC provider in `/admin/integrations`

### Issue: "Failed to create applicant"
**Solution:** 
1. Check API credentials
2. Verify user profile is complete
3. Check provider API status
4. Review server logs

### Issue: Webhook not received
**Solution:**
1. Verify webhook URL in provider settings
2. Check webhook secret matches
3. Ensure server is accessible from internet
4. Test with `ngrok` for local development

### Issue: Status stuck at PENDING
**Solution:**
1. Check webhook delivery in provider dashboard
2. Use polling: call `/api/kyc/status`
3. Review provider's verification dashboard
4. Contact provider support

## 📚 Resources

- [KYCAID Documentation](https://docs.kycaid.com)
- [KYCAID API Reference](https://docs.kycaid.com/api/)
- [Integration Security Guide](./INTEGRATION_SECURITY.md)
- [Admin Guide](./ADMIN_GUIDE.md)

---

**Questions?** Check logs or contact support.

