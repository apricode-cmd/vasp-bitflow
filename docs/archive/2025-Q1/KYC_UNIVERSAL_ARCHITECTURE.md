# KYC Universal Architecture - Multi-Provider Support

## 🎯 Цель

Обеспечить универсальную работу KYC системы с любым провайдером (KYCAID, Sumsub, и будущими) без изменения основного кода.

---

## 🏗️ Архитектура

### 1. Интерфейс `IKycProvider`

Все KYC провайдеры реализуют единый интерфейс:

```typescript
interface IKycProvider {
  // Идентификация
  providerId: string;
  category: IntegrationCategory;
  displayName: string;
  
  // Lifecycle
  initialize(config: BaseIntegrationConfig): Promise<void>;
  test(): Promise<IntegrationTestResult>;
  
  // Core KYC methods
  createApplicant(userData: KycUserData): Promise<KycApplicant>;
  createVerification(applicantId: string, formId?: string): Promise<KycVerificationSession>;
  getVerificationStatus(verificationId: string): Promise<KycVerificationResult>;
  getFormUrl(applicantId: string, formId?: string): Promise<KycFormUrl>;
  
  // Webhook
  verifyWebhookSignature(payload: string, signature: string): boolean;
  processWebhook(payload: any): KycWebhookEvent;
}
```

---

## 📊 Универсальные типы

### KycVerificationStatus
```typescript
type KycVerificationStatus = 'pending' | 'approved' | 'rejected';
```

Оба провайдера мапят свои статусы в эти 3:

**KYCAID:**
- `unused` → `pending`
- `pending` → `pending`
- `completed + verified=true` → `approved`
- `completed + verified=false` → `rejected`

**Sumsub:**
- `init` → `pending`
- `pending` → `pending`
- `completed + GREEN` → `approved`
- `completed + RED` → `rejected`

---

## 🔄 Универсальный flow синхронизации

### 1. Создание applicant (оба провайдера)

```typescript
// Universal code in kyc.service.ts
const provider = await integrationFactory.getKycProvider();
const applicant = await provider.createApplicant(userData);

// Save to DB (universal fields)
await prisma.kycSession.create({
  data: {
    userId: user.id,
    kycProviderId: provider.providerId,  // 'kycaid' or 'sumsub'
    applicantId: applicant.applicantId,
    verificationId: applicant.applicantId, // For Sumsub = applicantId
    status: 'PENDING'
  }
});
```

### 2. Проверка статуса (оба провайдера)

```typescript
// Universal code in kyc.service.ts
export async function checkKycStatus(userId: string) {
  const session = await prisma.kycSession.findUnique({ where: { userId } });
  const provider = await integrationFactory.getKycProvider();
  
  // Get verification status (works for both providers)
  const result = await provider.getVerificationStatus(session.verificationId);
  
  // Update DB if status changed
  if (result.status !== session.status.toLowerCase()) {
    await prisma.kycSession.update({
      where: { id: session.id },
      data: {
        status: result.status.toUpperCase(),
        completedAt: result.completedAt,
        rejectionReason: result.rejectionReason
      }
    });
  }
  
  return formatStatusResponse(session);
}
```

### 3. Webhook обработка (оба провайдера)

```typescript
// Universal code in webhook endpoints
const provider = await integrationFactory.getProviderByService(providerId);

// Verify signature (provider-specific implementation)
const isValid = provider.verifyWebhookSignature(rawBody, signature);

// Process webhook (provider-specific → universal format)
const event = provider.processWebhook(payload);

// Update DB (universal code)
await prisma.kycSession.update({
  where: { applicantId: event.applicantId },
  data: {
    status: event.status.toUpperCase(),
    completedAt: event.completedAt,
    rejectionReason: event.reason
  }
});
```

---

## ✅ Что универсально (не зависит от провайдера)

1. ✅ **Database schema** - одинаковые поля для всех провайдеров
2. ✅ **API endpoints** - `/api/kyc/status`, `/api/kyc/start` работают с любым провайдером
3. ✅ **Frontend UI** - одинаковый интерфейс для пользователя
4. ✅ **Status mapping** - все провайдеры мапятся в `pending/approved/rejected`
5. ✅ **Error handling** - одинаковая обработка ошибок
6. ✅ **Webhook processing** - универсальный flow обработки

---

## 🔧 Что специфично для провайдера

1. **KYCAID:**
   - Form URL для заполнения (QR код с формой)
   - `formId` обязателен
   - `verificationId` ≠ `applicantId`
   - Webhook signature: HMAC-SHA256

2. **Sumsub:**
   - WebSDK для заполнения (встроенный виджет)
   - `levelName` вместо `formId`
   - `verificationId` === `applicantId`
   - Webhook signature: HMAC-SHA256
   - Access token для WebSDK

---

## 🚀 Добавление нового провайдера

Чтобы добавить новый KYC провайдер (например, Onfido):

### 1. Создать адаптер

```typescript
// src/lib/integrations/providers/kyc/OnfidoAdapter.ts

export class OnfidoAdapter implements IKycProvider {
  public readonly providerId = 'onfido';
  public readonly category = IntegrationCategory.KYC;
  public readonly displayName = 'Onfido';
  
  async initialize(config: BaseIntegrationConfig): Promise<void> {
    // Onfido-specific initialization
  }
  
  async createApplicant(userData: KycUserData): Promise<KycApplicant> {
    // Onfido API call
    // Map Onfido response → universal KycApplicant
  }
  
  async getVerificationStatus(verificationId: string): Promise<KycVerificationResult> {
    // Onfido API call
    // Map Onfido status → 'pending' | 'approved' | 'rejected'
  }
  
  // ... implement other methods
}
```

### 2. Зарегистрировать в реестре

```typescript
// src/lib/integrations/IntegrationRegistry.ts

import { OnfidoAdapter } from './providers/kyc/OnfidoAdapter';

const onfidoAdapter = new OnfidoAdapter();
integrationRegistry.registerProvider(onfidoAdapter);
```

### 3. Все! 🎉

Никаких изменений в:
- `kyc.service.ts`
- API endpoints
- Frontend UI
- Database schema

---

## 📋 Текущие провайдеры

| Провайдер | Status | Features | Webhook |
|-----------|--------|----------|---------|
| KYCAID | ✅ Работает | Form URL, QR code | ✅ |
| Sumsub | ✅ Работает | WebSDK, Mobile link | ✅ |
| Onfido | ⏳ Planned | - | - |

---

## 🔒 Безопасность (универсальная)

1. ✅ Webhook signature verification (provider-specific)
2. ✅ HTTPS для всех API calls
3. ✅ Secrets в environment variables
4. ✅ Rate limiting на API endpoints
5. ✅ CSRF protection (NextAuth)

---

## 🎯 Ключевые принципы

1. **Один интерфейс** - `IKycProvider` для всех провайдеров
2. **Универсальные типы** - `KycVerificationStatus`, `KycApplicant`, etc.
3. **Provider-agnostic service** - `kyc.service.ts` не знает о деталях провайдеров
4. **Factory pattern** - `IntegrationFactory` выбирает активный провайдер
5. **Registry pattern** - `IntegrationRegistry` хранит все провайдеры

---

**Результат:** Можно легко добавлять новые KYC провайдеры без изменения основного кода! 🚀
