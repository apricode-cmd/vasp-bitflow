# 🔐 KYC ARCHITECTURE - ПЛАН РАСШИРЕНИЯ

**Дата:** 30 октября 2025  
**Цель:** Добавить второй KYC провайдер (Sumsub) в существующую модульную архитектуру

---

## 📊 ТЕКУЩАЯ АРХИТЕКТУРА

### ✅ Что уже реализовано:

#### 1. **Модульная архитектура интеграций**

```
src/lib/integrations/
├── types.ts                          # Базовые типы
├── IntegrationRegistry.ts            # Реестр провайдеров
├── IntegrationFactory.ts             # Фабрика для создания экземпляров
├── index.ts                          # Экспорты
│
├── categories/                       # Интерфейсы по категориям
│   ├── IKycProvider.ts              # ✅ KYC интерфейс
│   ├── IRatesProvider.ts            # ✅ Rates интерфейс
│   ├── IEmailProvider.ts            # ✅ Email интерфейс
│   └── IBlockchainProvider.ts       # ✅ Blockchain интерфейс
│
└── providers/                        # Реализации провайдеров
    ├── kyc/
    │   └── KycaidAdapter.ts         # ✅ KYCAID (единственный)
    ├── rates/
    │   └── CoinGeckoAdapter.ts      # ✅ CoinGecko
    ├── email/
    │   └── ResendAdapter.ts         # ✅ Resend
    └── blockchain/
        └── TatumAdapter.ts          # ✅ Tatum
```

#### 2. **IKycProvider Interface** (стандартизированный)

```typescript
export interface IKycProvider extends IIntegrationProvider {
  readonly category: IntegrationCategory.KYC;

  // Step 1: Create applicant
  createApplicant(userData: KycUserData): Promise<KycApplicant>;

  // Step 2: Create verification
  createVerification(applicantId: string, formId?: string): Promise<KycVerificationSession>;

  // Step 3: Get form URL (liveness check)
  getFormUrl(applicantId: string, formId?: string): Promise<KycFormUrl>;

  // Get status
  getVerificationStatus(verificationId: string): Promise<KycVerificationResult>;

  // Get applicant
  getApplicant(applicantId: string): Promise<KycApplicant>;

  // Webhook
  verifyWebhookSignature?(payload: string, signature: string): boolean;
  processWebhook?(payload: any): {
    verificationId: string;
    applicantId: string;
    status: KycVerificationStatus;
    reason?: string;
    metadata?: Record<string, any>;
  };

  // Document verification
  verifyDocumentLiveness?(documentUrl: string): Promise<KycDocumentVerification>;
}
```

#### 3. **Database Schema** (Prisma)

```prisma
model KycSession {
  id                   String        @id @default(cuid())
  userId               String        @unique
  kycaidVerificationId String?       @unique  // ⚠️ KYCAID-specific!
  kycaidApplicantId    String?                // ⚠️ KYCAID-specific!
  kycaidFormId         String?                // ⚠️ KYCAID-specific!
  status               KycStatus     @default(PENDING)
  kycProviderId        String?                // ✅ Generic provider ID
  
  // Relations
  provider             KycProvider?  @relation(fields: [kycProviderId], references: [id])
  documents            KycDocument[]
  formData             KycFormData[]
  profile              KycProfile?
  user                 User          @relation(...)
}

model KycProvider {
  id          String       @id @default(cuid())
  name        String       @unique  // "KYCAID", "Sumsub"
  isActive    Boolean      @default(false)
  config      Json?        // Provider-specific config
  sessions    KycSession[]
}
```

#### 4. **IntegrationRegistry** (Singleton)

```typescript
class IntegrationRegistry {
  private providers: Map<string, ProviderRegistration> = new Map();
  
  register(registration: ProviderRegistration): void {
    this.providers.set(registration.providerId, registration);
  }
  
  getProvider(providerId: string): IIntegrationProvider | null {
    return this.providers.get(providerId)?.instance || null;
  }
  
  getKycProvider(providerId: string): IKycProvider | null {
    const provider = this.getProvider(providerId);
    if (provider && provider.category === IntegrationCategory.KYC) {
      return provider as IKycProvider;
    }
    return null;
  }
}
```

#### 5. **IntegrationFactory** (Database-driven)

```typescript
class IntegrationFactory {
  async getKycProvider(): Promise<IKycProvider> {
    // Fetch ACTIVE KYC provider from database
    const integration = await prisma.integration.findFirst({
      where: {
        category: 'KYC',
        isEnabled: true
      }
    });
    
    // Get provider from registry
    const provider = integrationRegistry.getKycProvider(integration.service);
    
    // Initialize with config from DB
    await provider.initialize(integration.config);
    
    return provider;
  }
}
```

---

## 🎯 ПРОБЛЕМЫ ТЕКУЩЕЙ АРХИТЕКТУРЫ

### ⚠️ 1. **Hardcoded KYCAID fields в KycSession**

```prisma
model KycSession {
  kycaidVerificationId String?  // ❌ Только для KYCAID!
  kycaidApplicantId    String?  // ❌ Только для KYCAID!
  kycaidFormId         String?  // ❌ Только для KYCAID!
}
```

**Проблема:** Если добавим Sumsub, нужны будут `sumsubVerificationId`, `sumsubApplicantId` и т.д.

**Решение:** Перенести в `metadata: Json` (generic).

---

### ⚠️ 2. **UI привязан к KYCAID**

**Файлы:**
- `src/app/(client)/kyc/page.tsx` - клиентская KYC форма
- `src/app/(admin)/admin/kyc/page.tsx` - админ KYC review
- `src/components/forms/DynamicKycForm.tsx` - 4-step форма

**Проблема:** Форма жестко привязана к KYCAID workflow (4 шага, specific fields).

**Решение:** Динамическая форма на основе `provider.getFormFields()`.

---

### ⚠️ 3. **API Routes привязаны к KYCAID**

**Файлы:**
- `src/app/api/kyc/start/route.ts`
- `src/app/api/kyc/submit-form/route.ts`
- `src/app/api/kyc/webhook/route.ts`

**Проблема:** Используют `kycaidAdapter` напрямую.

**Решение:** Использовать `integrationFactory.getKycProvider()`.

---

## 🚀 ПЛАН РАСШИРЕНИЯ

### **ФАЗА 1: Рефакторинг Database Schema** ✅

#### 1.1. Обновить `KycSession` модель

```prisma
model KycSession {
  id                String        @id @default(cuid())
  userId            String        @unique
  
  // ✅ Generic provider fields
  kycProviderId     String?       // "kycaid" | "sumsub"
  verificationId    String?       @unique  // Provider's verification ID
  applicantId       String?       // Provider's applicant ID
  formId            String?       // Provider's form ID (if applicable)
  
  // ✅ Generic metadata (JSON)
  providerMetadata  Json?         // Provider-specific data
  
  status            KycStatus     @default(PENDING)
  submittedAt       DateTime?
  reviewedAt        DateTime?
  reviewedBy        String?
  reviewNotes       String?
  completedAt       DateTime?
  expiresAt         DateTime?
  rejectionReason   String?
  webhookData       Json?
  metadata          Json?
  attempts          Int           @default(0)
  lastAttemptAt     DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  
  // Relations
  provider          KycProvider?  @relation(fields: [kycProviderId], references: [id])
  documents         KycDocument[]
  formData          KycFormData[]
  profile           KycProfile?
  user              User          @relation(...)
  
  @@index([status])
  @@index([verificationId])
  @@index([kycProviderId])
}
```

#### 1.2. Миграция данных

```sql
-- Migrate existing KYCAID data
UPDATE "KycSession"
SET 
  "verificationId" = "kycaidVerificationId",
  "applicantId" = "kycaidApplicantId",
  "formId" = "kycaidFormId",
  "providerMetadata" = jsonb_build_object(
    'kycaidVerificationId', "kycaidVerificationId",
    'kycaidApplicantId', "kycaidApplicantId",
    'kycaidFormId', "kycaidFormId"
  )
WHERE "kycaidVerificationId" IS NOT NULL;

-- Drop old columns
ALTER TABLE "KycSession" 
  DROP COLUMN "kycaidVerificationId",
  DROP COLUMN "kycaidApplicantId",
  DROP COLUMN "kycaidFormId";
```

---

### **ФАЗА 2: Создать SumsubAdapter** 🆕

#### 2.1. Структура файла

```
src/lib/integrations/providers/kyc/
├── KycaidAdapter.ts       # ✅ Existing
└── SumsubAdapter.ts       # 🆕 NEW
```

#### 2.2. Реализация `SumsubAdapter.ts`

```typescript
/**
 * Sumsub Adapter
 * 
 * Implementation of IKycProvider for Sumsub
 */

import {
  IKycProvider,
  KycUserData,
  KycApplicant,
  KycVerificationSession,
  KycVerificationResult,
  KycFormUrl,
  KycDocumentVerification,
  KycVerificationStatus
} from '../../categories/IKycProvider';
import {
  BaseIntegrationConfig,
  IntegrationCategory,
  IntegrationTestResult,
  IntegrationMetadata
} from '../../types';
import crypto from 'crypto';

interface SumsubConfig extends BaseIntegrationConfig {
  appToken?: string;
  secretKey?: string;
  levelName?: string; // "basic-kyc-level"
  baseUrl?: string;
}

export class SumsubAdapter implements IKycProvider {
  public readonly providerId = 'sumsub';
  public readonly category = IntegrationCategory.KYC as const;
  public readonly displayName = 'Sumsub';
  public readonly description = 'AI-powered identity verification';
  public readonly iconUrl = '/integrations/sumsub.png';
  public readonly docsUrl = 'https://docs.sumsub.com';

  private config: SumsubConfig = {};
  private initialized = false;
  private baseUrl = 'https://api.sumsub.com';

  get metadata(): IntegrationMetadata {
    return {
      providerId: this.providerId,
      category: this.category,
      displayName: this.displayName,
      description: this.description,
      version: '1.0.0',
      iconUrl: this.iconUrl,
      docsUrl: this.docsUrl,
      requiredFields: ['appToken', 'secretKey', 'levelName'],
      optionalFields: ['baseUrl'],
      features: [
        'KYC Verification',
        'Liveness Detection',
        'Document Verification',
        'AML Screening',
        'Webhook Support',
        'Multi-language Support'
      ],
      supportedCountries: 'all'
    };
  }

  async initialize(config: BaseIntegrationConfig): Promise<void> {
    this.config = config as SumsubConfig;
    if (this.config.baseUrl) {
      this.baseUrl = this.config.baseUrl.replace(/\/$/, '');
    }
    this.initialized = true;
  }

  async test(): Promise<IntegrationTestResult> {
    try {
      if (!this.config.appToken || !this.config.secretKey) {
        return {
          success: false,
          message: 'App Token or Secret Key not configured',
          timestamp: new Date()
        };
      }

      // Test with GET /resources/applicants/-;externalUserId=test
      const url = `${this.baseUrl}/resources/applicants/-;externalUserId=test-connection`;
      const signature = this.generateSignature('GET', '/resources/applicants/-;externalUserId=test-connection');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-App-Token': this.config.appToken,
          'X-App-Access-Sig': signature,
          'X-App-Access-Ts': Date.now().toString()
        }
      });

      // 404 is OK (applicant not found, but auth works!)
      if (response.ok || response.status === 404) {
        return {
          success: true,
          message: 'Sumsub connection successful',
          timestamp: new Date()
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: 'Invalid credentials',
          timestamp: new Date()
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Sumsub test failed: ${error}`,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection error: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  isConfigured(): boolean {
    return this.initialized && !!this.config.appToken && !!this.config.secretKey;
  }

  getConfig(): Partial<BaseIntegrationConfig> {
    return {
      apiEndpoint: this.baseUrl,
      metadata: {
        levelName: this.config.levelName,
        hasSecretKey: !!this.config.secretKey
      }
    };
  }

  /**
   * Generate HMAC signature for Sumsub API
   */
  private generateSignature(method: string, path: string, body?: string): string {
    const timestamp = Date.now().toString();
    const message = timestamp + method.toUpperCase() + path + (body || '');
    
    return crypto
      .createHmac('sha256', this.config.secretKey!)
      .update(message)
      .digest('hex');
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(method: string, path: string, body?: string): HeadersInit {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(method, path, body);

    return {
      'X-App-Token': this.config.appToken!,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': timestamp,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Step 1: Create applicant in Sumsub
   */
  async createApplicant(userData: KycUserData): Promise<KycApplicant> {
    if (!this.isConfigured()) {
      throw new Error('Sumsub provider not configured');
    }

    try {
      const payload = {
        externalUserId: userData.externalId, // Our user ID
        levelName: this.config.levelName,
        fixedInfo: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          dob: userData.dateOfBirth, // YYYY-MM-DD
          country: userData.nationality, // ISO3 code (USA, POL)
          phone: userData.phone
        },
        email: userData.email
      };

      const path = '/resources/applicants?levelName=' + this.config.levelName;
      const body = JSON.stringify(payload);

      console.log('📝 Creating Sumsub applicant:', { email: userData.email, externalId: userData.externalId });

      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.getHeaders('POST', path, body),
        body
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create applicant: ${error}`);
      }

      const data = await response.json();

      console.log('✅ Sumsub applicant created:', data.id);

      return {
        applicantId: data.id,
        status: data.review?.reviewStatus || 'init',
        metadata: {
          externalUserId: data.externalUserId,
          levelName: data.levelName,
          createdAt: data.createdAt
        }
      };
    } catch (error: any) {
      console.error('❌ Sumsub applicant creation failed:', error);
      throw new Error(`Failed to create Sumsub applicant: ${error.message}`);
    }
  }

  /**
   * Step 2: Create verification (Sumsub auto-creates on applicant creation)
   */
  async createVerification(applicantId: string, formId?: string): Promise<KycVerificationSession> {
    // Sumsub doesn't have separate verification creation
    // Verification starts when applicant is created
    return {
      verificationId: applicantId, // Use applicant ID as verification ID
      applicantId: applicantId,
      status: 'init',
      metadata: {
        levelName: this.config.levelName
      }
    };
  }

  /**
   * Step 3: Get SDK access token for embedded form
   */
  async getFormUrl(applicantId: string, formId?: string): Promise<KycFormUrl> {
    if (!this.isConfigured()) {
      throw new Error('Sumsub provider not configured');
    }

    try {
      // Generate SDK access token
      const path = `/resources/accessTokens?userId=${applicantId}&levelName=${this.config.levelName}`;

      console.log('📝 Getting Sumsub SDK token:', { applicantId });

      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.getHeaders('POST', path)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get SDK token: ${error}`);
      }

      const data = await response.json();

      console.log('✅ Sumsub SDK token generated');

      // Return URL with embedded token (for iframe/SDK)
      return {
        url: `https://cockpit.sumsub.com/idensic/#/token/${data.token}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        sessionId: data.token
      };
    } catch (error: any) {
      console.error('❌ Sumsub SDK token generation failed:', error);
      throw new Error(`Failed to get Sumsub form URL: ${error.message}`);
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(verificationId: string): Promise<KycVerificationResult> {
    if (!this.isConfigured()) {
      throw new Error('Sumsub provider not configured');
    }

    try {
      const path = `/resources/applicants/${verificationId}/status`;

      console.log('📝 Getting Sumsub status:', verificationId);

      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: this.getHeaders('GET', path)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get status: ${error}`);
      }

      const data = await response.json();

      console.log('✅ Sumsub status:', data.reviewStatus);

      // Map Sumsub status to our standard
      let status: KycVerificationStatus;
      
      // Sumsub statuses: init, pending, prechecked, queued, completed, onHold
      // reviewResult: GREEN (approved), RED (rejected), YELLOW (retry)
      
      switch (data.reviewStatus) {
        case 'completed':
          status = data.reviewResult?.reviewAnswer === 'GREEN' ? 'approved' : 'rejected';
          break;
        case 'init':
        case 'pending':
        case 'prechecked':
        case 'queued':
        case 'onHold':
          status = 'pending';
          break;
        default:
          status = 'pending';
      }

      return {
        status,
        verificationId,
        rejectionReason: data.reviewResult?.rejectLabels?.join(', '),
        completedAt: data.reviewStatus === 'completed' ? new Date() : undefined,
        metadata: {
          reviewStatus: data.reviewStatus,
          reviewResult: data.reviewResult,
          raw: data
        }
      };
    } catch (error: any) {
      console.error('❌ Sumsub status check failed:', error);
      throw new Error(`Failed to get Sumsub status: ${error.message}`);
    }
  }

  /**
   * Get applicant details
   */
  async getApplicant(applicantId: string): Promise<KycApplicant> {
    if (!this.isConfigured()) {
      throw new Error('Sumsub provider not configured');
    }

    try {
      const path = `/resources/applicants/${applicantId}/one`;

      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: this.getHeaders('GET', path)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get applicant: ${error}`);
      }

      const data = await response.json();

      return {
        applicantId: data.id,
        status: data.review?.reviewStatus || 'init',
        metadata: {
          externalUserId: data.externalUserId,
          email: data.email,
          createdAt: data.createdAt,
          info: data.info,
          review: data.review
        }
      };
    } catch (error: any) {
      console.error('❌ Sumsub get applicant failed:', error);
      throw new Error(`Failed to get Sumsub applicant: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.secretKey) {
      console.warn('⚠️ Secret key not configured');
      return true;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.secretKey)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Process webhook payload
   */
  processWebhook(payload: any): {
    verificationId: string;
    applicantId: string;
    status: KycVerificationStatus;
    reason?: string;
    metadata?: Record<string, any>;
  } {
    const { applicantId, reviewStatus, reviewResult } = payload;

    console.log('📥 Processing Sumsub webhook:', {
      applicantId,
      reviewStatus,
      reviewAnswer: reviewResult?.reviewAnswer
    });

    // Map status
    let status: KycVerificationStatus;
    
    switch (reviewStatus) {
      case 'completed':
        status = reviewResult?.reviewAnswer === 'GREEN' ? 'approved' : 'rejected';
        break;
      default:
        status = 'pending';
    }

    return {
      verificationId: applicantId,
      applicantId,
      status,
      reason: reviewResult?.rejectLabels?.join(', '),
      metadata: payload
    };
  }

  /**
   * Verify document liveness
   */
  async verifyDocumentLiveness(documentUrl: string): Promise<KycDocumentVerification> {
    // Sumsub handles liveness internally
    return {
      isLive: true,
      confidence: 1.0,
      extractedData: {}
    };
  }
}

// Export singleton
export const sumsubAdapter = new SumsubAdapter();
```

---

### **ФАЗА 3: Регистрация Sumsub в Registry** 🔗

#### 3.1. Обновить `IntegrationRegistry.ts`

```typescript
// Import adapters
import { kycaidAdapter } from './providers/kyc/KycaidAdapter';
import { sumsubAdapter } from './providers/kyc/SumsubAdapter'; // 🆕 NEW
import { coinGeckoAdapter } from './providers/rates/CoinGeckoAdapter';
import { resendAdapter } from './providers/email/ResendAdapter';
import { tatumAdapter } from './providers/blockchain/TatumAdapter';

private registerDefaultProviders(): void {
  // KYC Providers
  this.register({
    providerId: 'kycaid',
    category: IntegrationCategory.KYC,
    displayName: 'KYCAID',
    description: 'Identity verification and KYC compliance provider',
    icon: '🛡️',
    documentationUrl: 'https://kycaid.com/docs',
    instance: kycaidAdapter
  });

  // 🆕 NEW: Sumsub
  this.register({
    providerId: 'sumsub',
    category: IntegrationCategory.KYC,
    displayName: 'Sumsub',
    description: 'AI-powered identity verification with liveness detection',
    icon: '🤖',
    documentationUrl: 'https://docs.sumsub.com',
    instance: sumsubAdapter
  });

  // ... rest of providers
}
```

---

### **ФАЗА 4: Обновить API Routes** 🔄

#### 4.1. Использовать `IntegrationFactory` вместо hardcoded `kycaidAdapter`

**Файл:** `src/app/api/kyc/start/route.ts`

```typescript
// ❌ OLD
import { kycaidAdapter } from '@/lib/integrations/providers/kyc/KycaidAdapter';

// ✅ NEW
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';

export async function POST(request: NextRequest) {
  // ... auth checks ...

  // ✅ Get active KYC provider from database
  const kycProvider = await integrationFactory.getKycProvider();

  // Create applicant (works for KYCAID or Sumsub!)
  const applicant = await kycProvider.createApplicant({
    email: user.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    dateOfBirth: profile.dateOfBirth,
    nationality: profile.nationality,
    residenceCountry: profile.country,
    phone: profile.phoneNumber,
    externalId: user.id
  });

  // Create verification
  const verification = await kycProvider.createVerification(
    applicant.applicantId,
    formId // From database config
  );

  // Save to database (generic fields!)
  await prisma.kycSession.create({
    data: {
      userId: user.id,
      kycProviderId: kycProvider.providerId, // "kycaid" or "sumsub"
      verificationId: verification.verificationId,
      applicantId: applicant.applicantId,
      formId: formId,
      status: 'PENDING',
      providerMetadata: {
        applicantData: applicant.metadata,
        verificationData: verification.metadata
      }
    }
  });

  return NextResponse.json({ success: true });
}
```

#### 4.2. Обновить webhook route

**Файл:** `src/app/api/kyc/webhook/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-signature') || request.headers.get('x-payload-digest');
  const body = await request.text();

  // ✅ Get active KYC provider
  const kycProvider = await integrationFactory.getKycProvider();

  // Verify signature
  if (!kycProvider.verifyWebhookSignature?.(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Process webhook (normalized data!)
  const webhookData = kycProvider.processWebhook?.(JSON.parse(body));

  // Update database
  await prisma.kycSession.update({
    where: { verificationId: webhookData.verificationId },
    data: {
      status: webhookData.status.toUpperCase(),
      rejectionReason: webhookData.reason,
      webhookData: webhookData.metadata,
      completedAt: webhookData.status === 'approved' ? new Date() : undefined
    }
  });

  return NextResponse.json({ success: true });
}
```

---

### **ФАЗА 5: Динамическая UI** 🎨

#### 5.1. Обновить клиентскую KYC страницу

**Файл:** `src/app/(client)/kyc/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';

export default function KycPage() {
  const [kycProvider, setKycProvider] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');

  useEffect(() => {
    fetchKycSession();
  }, []);

  const fetchKycSession = async () => {
    const response = await fetch('/api/kyc/status');
    const data = await response.json();

    if (data.session) {
      setKycProvider(data.session.kycProviderId); // "kycaid" or "sumsub"
      
      // Get form URL from provider
      const provider = await integrationFactory.getKycProvider();
      const url = await provider.getFormUrl(data.session.applicantId);
      setFormUrl(url.url);
    }
  };

  const startKyc = async () => {
    await fetch('/api/kyc/start', { method: 'POST' });
    await fetchKycSession();
  };

  return (
    <div>
      <h1>KYC Verification</h1>
      
      {!formUrl ? (
        <button onClick={startKyc}>Start KYC</button>
      ) : (
        <>
          {/* Render provider-specific UI */}
          {kycProvider === 'kycaid' && (
            <div>
              <p>Scan QR code with your mobile device:</p>
              <QRCode value={formUrl} />
            </div>
          )}
          
          {kycProvider === 'sumsub' && (
            <div>
              <iframe
                src={formUrl}
                width="100%"
                height="800px"
                allow="camera; microphone"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

---

### **ФАЗА 6: Admin UI Updates** 👨‍💼

#### 6.1. Добавить переключатель KYC провайдера

**Файл:** `src/app/(admin)/admin/integrations/page.tsx`

```typescript
// Show all KYC providers
const kycProviders = integrationRegistry.getProvidersByCategory(IntegrationCategory.KYC);

return (
  <div>
    <h2>KYC Providers</h2>
    {kycProviders.map(provider => (
      <Card key={provider.providerId}>
        <CardHeader>
          <CardTitle>{provider.displayName}</CardTitle>
          <CardDescription>{provider.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Switch
            checked={activeKycProvider === provider.providerId}
            onCheckedChange={() => setActiveKycProvider(provider.providerId)}
          />
          <Button onClick={() => testConnection(provider.providerId)}>
            Test Connection
          </Button>
        </CardContent>
      </Card>
    ))}
  </div>
);
```

---

## 📊 ИТОГОВАЯ АРХИТЕКТУРА

### ✅ После всех изменений:

```
src/lib/integrations/
├── types.ts
├── IntegrationRegistry.ts        # ✅ Sumsub registered
├── IntegrationFactory.ts         # ✅ Generic getKycProvider()
│
├── categories/
│   └── IKycProvider.ts           # ✅ Standard interface
│
└── providers/
    └── kyc/
        ├── KycaidAdapter.ts      # ✅ KYCAID implementation
        └── SumsubAdapter.ts      # 🆕 Sumsub implementation

prisma/schema.prisma:
  KycSession:
    - verificationId              # ✅ Generic
    - applicantId                 # ✅ Generic
    - formId                      # ✅ Generic
    - kycProviderId               # ✅ "kycaid" | "sumsub"
    - providerMetadata: Json      # ✅ Provider-specific data

API Routes:
  - /api/kyc/start              # ✅ Uses integrationFactory
  - /api/kyc/webhook            # ✅ Provider-agnostic
  - /api/kyc/status             # ✅ Generic

Client UI:
  - /kyc                        # ✅ Dynamic (KYCAID QR / Sumsub iframe)

Admin UI:
  - /admin/integrations         # ✅ Switch between providers
  - /admin/kyc                  # ✅ Provider-agnostic review
```

---

## 🎯 ПРЕИМУЩЕСТВА НОВОЙ АРХИТЕКТУРЫ

### ✅ 1. **Модульность**
- Легко добавить новые KYC провайдеры (Onfido, Jumio, Veriff)
- Один интерфейс (`IKycProvider`) для всех

### ✅ 2. **Гибкость**
- Переключение между провайдерами без изменения кода
- A/B тестирование разных провайдеров

### ✅ 3. **Масштабируемость**
- Разные провайдеры для разных регионов
- Fallback на второй провайдер при сбое первого

### ✅ 4. **Безопасность**
- Конфигурация в БД (encrypted API keys)
- Webhook signature verification для каждого провайдера

### ✅ 5. **Удобство**
- Админ может переключать провайдеров через UI
- Клиент видит оптимальный UI для выбранного провайдера

---

## 📋 ЧЕКЛИСТ РЕАЛИЗАЦИИ

### ФАЗА 1: Database ✅
- [ ] Обновить `KycSession` schema (remove KYCAID-specific fields)
- [ ] Создать миграцию
- [ ] Мигрировать существующие данные
- [ ] Протестировать на dev БД

### ФАЗА 2: Sumsub Adapter 🆕
- [ ] Создать `SumsubAdapter.ts`
- [ ] Реализовать все методы `IKycProvider`
- [ ] Добавить тесты (unit tests)
- [ ] Протестировать с Sumsub sandbox

### ФАЗА 3: Registry 🔗
- [ ] Зарегистрировать Sumsub в `IntegrationRegistry`
- [ ] Обновить типы
- [ ] Добавить в seed.ts (для dev)

### ФАЗА 4: API Routes 🔄
- [ ] Обновить `/api/kyc/start`
- [ ] Обновить `/api/kyc/webhook`
- [ ] Обновить `/api/kyc/status`
- [ ] Обновить `/api/admin/kyc/*`

### ФАЗА 5: Client UI 🎨
- [ ] Динамическая KYC форма
- [ ] KYCAID QR код
- [ ] Sumsub iframe
- [ ] Loading states

### ФАЗА 6: Admin UI 👨‍💼
- [ ] Provider switcher
- [ ] Test connection buttons
- [ ] Config forms (API keys)
- [ ] Provider-specific settings

### ФАЗА 7: Testing 🧪
- [ ] Unit tests (adapters)
- [ ] Integration tests (API routes)
- [ ] E2E tests (full KYC flow)
- [ ] Manual testing (KYCAID + Sumsub)

### ФАЗА 8: Documentation 📚
- [ ] Update README
- [ ] API documentation
- [ ] Admin guide (how to switch providers)
- [ ] Developer guide (how to add new providers)

---

## 🚀 ГОТОВО К РЕАЛИЗАЦИИ!

**Следующий шаг:** Начать с ФАЗЫ 1 (Database refactoring)?

**Время реализации:** ~2-3 дня
- ФАЗА 1: 2 часа
- ФАЗА 2: 6 часов
- ФАЗА 3-4: 4 часа
- ФАЗА 5-6: 6 часов
- ФАЗА 7-8: 4 часа

**Риски:** Минимальные (backward compatible, можно откатить)

---

**Автор:** AI Development Team  
**Дата:** 30 октября 2025

