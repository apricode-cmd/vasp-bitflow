# 🤖 SUMSUB INTEGRATION - ДЕТАЛЬНЫЙ ПЛАН

**Дата:** 30 октября 2025  
**Цель:** Интегрировать Sumsub как второй KYC провайдер **БЕЗ изменения существующей архитектуры**

---

## 🎯 КЛЮЧЕВЫЕ ПРИНЦИПЫ

### ✅ Что НЕ меняем:
1. ❌ Database schema (`KycSession`, `KycProvider`, `Integration`)
2. ❌ `IKycProvider` interface
3. ❌ `IntegrationRegistry` / `IntegrationFactory`
4. ❌ Существующие API routes (`/api/kyc/start`, `/api/kyc/status`)
5. ❌ KYCAID функционал (продолжает работать как есть)

### ✅ Что добавляем:
1. ✅ `SumsubAdapter.ts` (новый провайдер)
2. ✅ Регистрация в `IntegrationRegistry`
3. ✅ Новый endpoint: `GET /api/kyc/sdk-token` (для WebSDK)
4. ✅ Новый endpoint: `POST /api/kyc/webhook/sumsub`
5. ✅ Client UI для Sumsub WebSDK
6. ✅ Admin UI для настройки Sumsub

---

## 📊 АРХИТЕКТУРА (БЕЗ ИЗМЕНЕНИЙ)

```
Existing:
  Database:
    - Integration (service, category, config: Json, isEnabled)
    - KycSession (userId, kycProviderId, verificationId, applicantId)
    - KycProvider (name, isActive, config: Json)
  
  Code:
    - IKycProvider (interface)
    - IntegrationRegistry (in-memory registry)
    - IntegrationFactory (DB-driven provider selection)
    - KycaidAdapter (existing implementation)

New (additive only):
  Code:
    - SumsubAdapter (new implementation)
    - /api/kyc/sdk-token (new endpoint)
    - /api/kyc/webhook/sumsub (new endpoint)
    - Client UI: SumsubWebSDK component
    - Admin UI: Sumsub config form
```

---

## 🔐 SUMSUB CONFIGURATION

### Database Storage (Integration table)

```json
{
  "service": "sumsub",
  "category": "KYC",
  "isEnabled": false,
  "config": {
    "appToken": "sbx:XXXXXXXX",
    "secretKey": "YYYYYYYY",
    "levelName": "basic-kyc-level",
    "baseUrl": "https://api.sumsub.com"
  }
}
```

**Важно:**
- `appToken` - публичный токен (используется в `X-App-Token`)
- `secretKey` - приватный ключ (для HMAC подписи)
- `levelName` - уровень KYC из Sumsub dashboard
- `baseUrl` - production или sandbox URL

---

## 🔑 SUMSUB API AUTHENTICATION

### HMAC Signature

Все запросы к Sumsub требуют:

```typescript
Headers:
  X-App-Token: <appToken>
  X-App-Access-Ts: <unix timestamp in seconds>
  X-App-Access-Sig: <HMAC-SHA256 signature>

Signature = HMAC_SHA256(
  secretKey,
  X-App-Access-Ts + HTTP_METHOD + REQUEST_PATH + REQUEST_BODY
)
```

**Пример:**
```typescript
const ts = Math.floor(Date.now() / 1000).toString();
const method = 'POST';
const path = '/resources/applicants?levelName=basic-kyc-level';
const body = JSON.stringify({ externalUserId: 'user123' });

const payload = ts + method.toUpperCase() + path + body;
const signature = crypto.createHmac('sha256', secretKey)
  .update(payload)
  .digest('hex');
```

---

## 📋 ПЛАН РЕАЛИЗАЦИИ (8 ФАЗ)

### **ФАЗА 1: SumsubAdapter.ts** ⭐

**Файл:** `src/lib/integrations/providers/kyc/SumsubAdapter.ts`

**Методы для реализации:**

#### 1.1. `initialize(config)`
```typescript
async initialize(config: BaseIntegrationConfig): Promise<void> {
  this.config = {
    appToken: config.apiKey, // или config.metadata.appToken
    secretKey: config.metadata.secretKey,
    levelName: config.metadata.levelName,
    baseUrl: config.apiEndpoint || 'https://api.sumsub.com'
  };
  
  if (!this.config.appToken || !this.config.secretKey || !this.config.levelName) {
    throw new Error('Sumsub configuration incomplete');
  }
  
  this.initialized = true;
}
```

#### 1.2. `test()`
```typescript
async test(): Promise<IntegrationTestResult> {
  // GET /resources/applicants/-;externalUserId=test-connection
  // 404 = OK (auth works, applicant not found)
  // 401/403 = BAD (invalid credentials)
}
```

#### 1.3. `createApplicant(userData)`
```typescript
async createApplicant(userData: KycUserData): Promise<KycApplicant> {
  // POST /resources/applicants?levelName={levelName}
  const payload = {
    externalUserId: userData.externalId, // our user.id
    email: userData.email,
    phone: userData.phone,
    fixedInfo: {
      firstName: userData.firstName,
      lastName: userData.lastName,
      dob: userData.dateOfBirth, // YYYY-MM-DD
      country: userData.nationality // ISO3 (USA, POL)
    }
  };
  
  // Return: { applicantId: data.id, status: 'init', metadata: {...} }
}
```

#### 1.4. `createVerification(applicantId)`
```typescript
async createVerification(applicantId: string): Promise<KycVerificationSession> {
  // Sumsub doesn't have separate verification creation
  // Verification starts automatically when applicant is created
  return {
    verificationId: applicantId, // Use applicant ID
    applicantId: applicantId,
    status: 'init',
    metadata: { levelName: this.config.levelName }
  };
}
```

#### 1.5. `getFormUrl(applicantId)` - **НЕ ИСПОЛЬЗУЕТСЯ!**
```typescript
async getFormUrl(applicantId: string): Promise<KycFormUrl> {
  // Sumsub uses WebSDK with access token (issued by backend)
  // This method is NOT used for Sumsub
  // Instead, we'll create a separate method: createAccessToken()
  throw new Error('Sumsub uses WebSDK with access token, not form URL');
}
```

#### 1.6. `createAccessToken(externalUserId)` - **НОВЫЙ МЕТОД!**
```typescript
async createAccessToken(externalUserId: string): Promise<{ token: string; expiresAt: Date }> {
  // POST /resources/accessTokens?userId={externalUserId}&levelName={levelName}
  const path = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(this.config.levelName)}`;
  
  const ts = Math.floor(Date.now() / 1000).toString();
  const signature = this.buildSignature(ts, 'POST', path);
  
  const response = await fetch(this.config.baseUrl + path, {
    method: 'POST',
    headers: {
      'X-App-Token': this.config.appToken,
      'X-App-Access-Ts': ts,
      'X-App-Access-Sig': signature
    }
  });
  
  const data = await response.json();
  
  return {
    token: data.token,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 min
  };
}
```

#### 1.7. `getVerificationStatus(verificationId)`
```typescript
async getVerificationStatus(verificationId: string): Promise<KycVerificationResult> {
  // GET /resources/applicants/{applicantId}/status
  const applicantId = verificationId;
  const path = `/resources/applicants/${encodeURIComponent(applicantId)}/status`;
  
  // Fetch status
  // Map Sumsub status to our standard:
  // - reviewStatus: 'completed' + reviewAnswer: 'GREEN' → 'approved'
  // - reviewStatus: 'completed' + reviewAnswer: 'RED' → 'rejected'
  // - Otherwise → 'pending'
}
```

#### 1.8. `getApplicant(applicantId)`
```typescript
async getApplicant(applicantId: string): Promise<KycApplicant> {
  // GET /resources/applicants/{applicantId}/one
  // Return full applicant data
}
```

#### 1.9. `verifyWebhookSignature(payload, signature)`
```typescript
verifyWebhookSignature(payload: string, signature: string): boolean {
  // Verify HMAC signature from webhook
  const expectedSignature = crypto
    .createHmac('sha256', this.config.secretKey)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

#### 1.10. `processWebhook(payload)`
```typescript
processWebhook(payload: any): {
  verificationId: string;
  applicantId: string;
  status: KycVerificationStatus;
  reason?: string;
  metadata?: Record<string, any>;
} {
  const applicantId = payload.applicantId || payload.applicant?.id;
  const reviewStatus = payload.reviewStatus || payload.review?.reviewStatus;
  const reviewAnswer = payload.reviewResult?.reviewAnswer;
  
  let status: KycVerificationStatus = 'pending';
  
  if (reviewStatus === 'completed') {
    if (reviewAnswer === 'GREEN') status = 'approved';
    else if (reviewAnswer === 'RED') status = 'rejected';
  }
  
  return {
    verificationId: applicantId,
    applicantId,
    status,
    reason: payload.reviewResult?.rejectLabels?.join(', '),
    metadata: payload
  };
}
```

---

### **ФАЗА 2: IntegrationRegistry** 🔗

**Файл:** `src/lib/integrations/IntegrationRegistry.ts`

**Изменения:**

```typescript
// Import Sumsub adapter
import { sumsubAdapter } from './providers/kyc/SumsubAdapter';

private registerDefaultProviders(): void {
  // ... existing providers ...
  
  // 🆕 Sumsub
  this.register({
    providerId: 'sumsub',
    category: IntegrationCategory.KYC,
    displayName: 'Sumsub',
    description: 'AI-powered identity verification with liveness detection',
    icon: '🤖',
    documentationUrl: 'https://docs.sumsub.com',
    instance: sumsubAdapter
  });
}
```

---

### **ФАЗА 3: API Endpoint - SDK Token** 🎫

**Файл:** `src/app/api/kyc/sdk-token/route.ts` (НОВЫЙ!)

**Назначение:** Выдать WebSDK access token для Sumsub (только для authenticated пользователей)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/kyc/sdk-token
 * 
 * Issue Sumsub WebSDK access token for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get active KYC provider
    const provider = await integrationFactory.getKycProvider();

    // 3. Check if Sumsub
    if (provider.providerId !== 'sumsub') {
      return NextResponse.json(
        { error: 'Sumsub is not the active KYC provider' },
        { status: 400 }
      );
    }

    // 4. Get KYC session
    const kycSession = await prisma.kycSession.findUnique({
      where: { userId: session.user.id }
    });

    if (!kycSession) {
      return NextResponse.json(
        { error: 'KYC session not found. Please start KYC first.' },
        { status: 404 }
      );
    }

    // 5. Create access token (Sumsub-specific method)
    const sumsubAdapter = provider as any; // Cast to access Sumsub-specific method
    const tokenData = await sumsubAdapter.createAccessToken(session.user.id);

    return NextResponse.json({
      success: true,
      token: tokenData.token,
      expiresAt: tokenData.expiresAt
    });
  } catch (error: any) {
    console.error('❌ SDK token error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create SDK token' },
      { status: 500 }
    );
  }
}
```

---

### **ФАЗА 4: API Endpoint - Webhook** 🪝

**Файл:** `src/app/api/kyc/webhook/sumsub/route.ts` (НОВЫЙ!)

**Назначение:** Принимать webhooks от Sumsub и обновлять KYC статус

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/kyc/webhook/sumsub
 * 
 * Sumsub webhook endpoint (configured in Sumsub dashboard)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body
    const rawBody = await request.text();
    const signature = request.headers.get('x-payload-digest') || 
                      request.headers.get('x-signature') || '';

    console.log('📥 Sumsub webhook received');

    // 2. Get Sumsub provider
    const provider = await integrationFactory.getProviderByService('sumsub');
    
    if (!provider) {
      console.error('❌ Sumsub provider not found');
      return NextResponse.json({ error: 'Provider not configured' }, { status: 500 });
    }

    // 3. Verify signature
    const sumsubAdapter = provider as any;
    if (!sumsubAdapter.verifyWebhookSignature?.(rawBody, signature)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 4. Process webhook
    const payload = JSON.parse(rawBody);
    const event = sumsubAdapter.processWebhook(payload);

    console.log('📊 Webhook event:', {
      applicantId: event.applicantId,
      status: event.status
    });

    // 5. Update KycSession
    const updated = await prisma.kycSession.updateMany({
      where: {
        kycProviderId: 'sumsub',
        OR: [
          { verificationId: event.verificationId },
          { applicantId: event.applicantId }
        ]
      },
      data: {
        status: event.status.toUpperCase() as any,
        rejectionReason: event.reason,
        webhookData: event.metadata as any,
        completedAt: event.status === 'approved' ? new Date() : undefined,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Updated ${updated.count} KYC sessions`);

    // 6. Log to audit (optional)
    // await logAuditEvent(...)

    return NextResponse.json({ success: true, processed: updated.count });
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

---

### **ФАЗА 5: Client UI - Sumsub WebSDK** 🎨

**Файл:** `src/components/kyc/SumsubWebSDK.tsx` (НОВЫЙ!)

**Назначение:** Встроить Sumsub WebSDK в клиентский UI

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface SumsubWebSDKProps {
  userId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function SumsubWebSDK({ userId, onComplete, onError }: SumsubWebSDKProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSumsubSDK();
  }, [userId]);

  const loadSumsubSDK = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch access token from backend
      const response = await fetch('/api/kyc/sdk-token');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get SDK token');
      }

      const { token } = await response.json();

      // 2. Load Sumsub WebSDK script
      if (!document.getElementById('sumsub-websdk-script')) {
        const script = document.createElement('script');
        script.id = 'sumsub-websdk-script';
        script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
        script.async = true;
        document.body.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      // 3. Initialize WebSDK
      // @ts-ignore (Sumsub SDK loaded via script tag)
      const snsWebSdkInstance = window.snsWebSdk
        .init(token, () => token) // Token refresh callback
        .withConf({
          lang: 'en',
          theme: 'light',
          onMessage: (type: string, payload: any) => {
            console.log('Sumsub message:', type, payload);
          },
          onError: (error: any) => {
            console.error('Sumsub error:', error);
            setError(error.message || 'Verification error');
            onError?.(error.message);
          }
        })
        .on('idCheck.onStepCompleted', (payload: any) => {
          console.log('Step completed:', payload);
        })
        .on('idCheck.onApplicantSubmitted', (payload: any) => {
          console.log('Applicant submitted:', payload);
          onComplete?.();
        })
        .build();

      // 4. Launch SDK in container
      if (containerRef.current) {
        snsWebSdkInstance.launch(containerRef.current);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('❌ Sumsub SDK error:', err);
      setError(err.message || 'Failed to load verification');
      setLoading(false);
      onError?.(err.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identity Verification</CardTitle>
        <CardDescription>
          Complete your identity verification using Sumsub
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2">Loading verification...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div ref={containerRef} className="min-h-[600px]" />
      </CardContent>
    </Card>
  );
}
```

**Обновить:** `src/app/(client)/kyc/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { SumsubWebSDK } from '@/components/kyc/SumsubWebSDK';
import { KycaidQRCode } from '@/components/kyc/KycaidQRCode'; // existing
import { useSession } from 'next-auth/react';

export default function KycPage() {
  const { data: session } = useSession();
  const [kycSession, setKycSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKycSession();
  }, []);

  const fetchKycSession = async () => {
    const response = await fetch('/api/kyc/status');
    const data = await response.json();
    setKycSession(data.session);
    setLoading(false);
  };

  const startKyc = async () => {
    await fetch('/api/kyc/start', { method: 'POST' });
    await fetchKycSession();
  };

  if (loading) return <div>Loading...</div>;

  if (!kycSession) {
    return (
      <div>
        <h1>KYC Verification</h1>
        <button onClick={startKyc}>Start KYC</button>
      </div>
    );
  }

  // Render provider-specific UI
  return (
    <div>
      <h1>KYC Verification</h1>
      
      {kycSession.kycProviderId === 'kycaid' && (
        <KycaidQRCode formUrl={kycSession.formUrl} />
      )}
      
      {kycSession.kycProviderId === 'sumsub' && (
        <SumsubWebSDK
          userId={session?.user?.id!}
          onComplete={() => {
            alert('Verification submitted! Please wait for review.');
            fetchKycSession();
          }}
          onError={(error) => {
            alert(`Error: ${error}`);
          }}
        />
      )}
    </div>
  );
}
```

---

### **ФАЗА 6: Admin UI - Sumsub Config** ⚙️

**Файл:** `src/app/(admin)/admin/integrations/page.tsx` (обновить существующий)

**Добавить форму для Sumsub:**

```typescript
// В существующий IntegrationsPage добавить:

{provider.providerId === 'sumsub' && (
  <div className="space-y-4">
    <div>
      <Label>App Token</Label>
      <Input
        type="text"
        placeholder="sbx:XXXXXXXX"
        value={config.appToken || ''}
        onChange={(e) => setConfig({ ...config, appToken: e.target.value })}
      />
    </div>
    
    <div>
      <Label>Secret Key</Label>
      <Input
        type="password"
        placeholder="Enter secret key"
        value={config.secretKey || ''}
        onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
      />
    </div>
    
    <div>
      <Label>Level Name</Label>
      <Input
        type="text"
        placeholder="basic-kyc-level"
        value={config.levelName || ''}
        onChange={(e) => setConfig({ ...config, levelName: e.target.value })}
      />
    </div>
    
    <div>
      <Label>Base URL</Label>
      <Input
        type="url"
        placeholder="https://api.sumsub.com"
        value={config.baseUrl || 'https://api.sumsub.com'}
        onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
      />
    </div>
    
    <Alert>
      <AlertDescription>
        <strong>Webhook URL:</strong> {window.location.origin}/api/kyc/webhook/sumsub
        <br />
        Configure this URL in your Sumsub dashboard under Settings → Webhooks
      </AlertDescription>
    </Alert>
  </div>
)}
```

---

### **ФАЗА 7: Testing** 🧪

#### 7.1. Connection Test
```bash
# В Admin UI нажать "Test Connection" для Sumsub
# Должен вернуть: "Connection successful"
```

#### 7.2. Full Flow Test
1. **Admin:** Активировать Sumsub (disable KYCAID, enable Sumsub)
2. **Client:** Открыть `/kyc`
3. **Client:** Нажать "Start KYC"
4. **Client:** Должен появиться Sumsub WebSDK iframe
5. **Client:** Пройти верификацию (upload документы, selfie)
6. **Sumsub:** Отправит webhook на `/api/kyc/webhook/sumsub`
7. **Backend:** Обновит `KycSession.status` → `APPROVED` / `REJECTED`
8. **Admin:** Проверить в `/admin/kyc` что статус обновился

---

### **ФАЗА 8: Documentation** 📚

**Создать:** `SUMSUB_SETUP_GUIDE.md`

```markdown
# Sumsub Setup Guide

## 1. Create Sumsub Account
- Go to https://sumsub.com
- Sign up for account
- Get App Token and Secret Key

## 2. Configure Level
- Create KYC level (e.g. "basic-kyc-level")
- Configure required documents
- Set verification rules

## 3. Configure in Apricode
- Go to Admin → Integrations
- Find "Sumsub"
- Enter:
  - App Token
  - Secret Key
  - Level Name
  - Base URL (production or sandbox)
- Click "Test Connection"
- Enable Sumsub (disable other KYC providers)

## 4. Configure Webhook
- Go to Sumsub Dashboard → Settings → Webhooks
- Add webhook URL: https://your-domain.com/api/kyc/webhook/sumsub
- Select events: "Applicant Review Completed"
- Save

## 5. Test
- Open client KYC page
- Start verification
- Upload documents
- Complete liveness check
- Check status in Admin panel
```

---

## 📊 ИТОГОВАЯ СТРУКТУРА

```
src/
├── lib/integrations/
│   ├── providers/kyc/
│   │   ├── KycaidAdapter.ts          # ✅ Existing
│   │   └── SumsubAdapter.ts          # 🆕 NEW
│   └── IntegrationRegistry.ts        # ✅ Updated (register Sumsub)
│
├── app/api/kyc/
│   ├── start/route.ts                # ✅ Existing (no changes)
│   ├── status/route.ts               # ✅ Existing (no changes)
│   ├── sdk-token/route.ts            # 🆕 NEW (Sumsub WebSDK token)
│   └── webhook/
│       ├── route.ts                  # ✅ Existing (KYCAID webhook)
│       └── sumsub/route.ts           # 🆕 NEW (Sumsub webhook)
│
├── app/(client)/kyc/
│   └── page.tsx                      # ✅ Updated (add Sumsub UI)
│
├── app/(admin)/admin/integrations/
│   └── page.tsx                      # ✅ Updated (add Sumsub config)
│
└── components/kyc/
    ├── KycaidQRCode.tsx              # ✅ Existing
    └── SumsubWebSDK.tsx              # 🆕 NEW
```

---

## ✅ ЧЕКЛИСТ

- [ ] ФАЗА 1: Создать `SumsubAdapter.ts`
- [ ] ФАЗА 2: Зарегистрировать в `IntegrationRegistry.ts`
- [ ] ФАЗА 3: Создать `/api/kyc/sdk-token`
- [ ] ФАЗА 4: Создать `/api/kyc/webhook/sumsub`
- [ ] ФАЗА 5: Создать `SumsubWebSDK.tsx` компонент
- [ ] ФАЗА 6: Обновить Admin UI (config form)
- [ ] ФАЗА 7: Тестирование (connection + full flow)
- [ ] ФАЗА 8: Документация (setup guide)

---

**Готов начать реализацию! 🚀**

**Время:** ~4-6 часов  
**Риски:** Минимальные (additive only, no breaking changes)

