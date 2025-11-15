# 🔐 KYC System - Полный аудит и план улучшения

**Дата:** 2025-11-12  
**Статус:** 🔴 Найдены критические проблемы архитектуры

---

## 🎯 Executive Summary

KYC система имеет **серьезные проблемы гибкости и масштабируемости**:
- ❌ Hardcoded steps (этапы) в клиентском коде
- ❌ Нет мультитенантности (все пользователи видят одинаковые поля)
- ❌ Категории жестко прописаны
- ❌ Огромный монолитный файл (1981 строка!)
- ❌ Несоответствие между админкой и клиентской формой

**Риски для production:**
- 🔴 **CRITICAL**: Невозможно адаптировать под разных клиентов
- 🔴 **HIGH**: Каждое изменение steps требует редеплоя
- 🟠 **MEDIUM**: Сложно поддерживать код (1981 строка)
- 🟠 **MEDIUM**: Нет compliance flexibility (GDPR vs non-EU)

---

## 🔍 Найденные проблемы

### 🔴 КРИТИЧНО #1: Hardcoded Steps

**Файл:** `src/app/(client)/kyc/page.tsx:78-83`

```typescript
const STEPS = [
  { id: 1, title: 'Personal Info', categories: ['personal'] },
  { id: 2, title: 'Contact & Address', categories: ['contact', 'address'] },
  { id: 3, title: 'Compliance Profile', categories: ['documents', 'employment', 'pep_sanctions'] },
  // Step 4 'Intended Use & Funds' disabled - fields not needed for MVP
];
```

**Проблемы:**
1. **Steps нет в БД** - только в коде
2. **Нельзя изменить** без редеплоя кода
3. **Порядок категорий** жестко фиксирован
4. **Step 4 закомментирован** - но в админке есть поля для этой категории!

**Несоответствие с админкой:**

В `/admin/kyc-fields` есть категории:
```typescript
const categoryNames = {
  personal: 'Personal Identification',
  contact: 'Contact Information',
  address: 'Residential Address',
  documents: 'Identity Documents',
  pep_sanctions: 'PEP & Sanctions',
  employment: 'Employment',
  purpose: 'Purpose of Account',       // ❌ НЕТ в клиентской форме!
  activity: 'Expected Activity',       // ❌ НЕТ в клиентской форме!
  funds: 'Source of Funds',             // ❌ НЕТ в клиентской форме!
  consents: 'Consents & Compliance'
};
```

**Результат:**
- Admin добавляет поля `purpose`, `activity`, `funds`
- Пользователь их НЕ ВИДИТ (нет в STEPS)
- Confusion & frustration 😤

---

### 🔴 КРИТИЧНО #2: Нет мультитенантности / гибкости

**Проблема:** Все пользователи видят одинаковые KYC поля.

**Real-world requirements:**
- 🇪🇺 EU users → нужны GDPR compliance поля
- 🇺🇸 US users → нужны SSN/TIN
- 🇬🇧 UK users → нужен NI Number
- 🏢 Business → нужны Company Registration, VAT
- 👤 Individual → не нужны business поля

**Текущая модель БД:**
```prisma
model KycFormField {
  id         String   @id
  fieldName  String   @unique
  label      String
  fieldType  String
  isRequired Boolean  @default(true)
  isEnabled  Boolean  @default(true)  // ❌ Глобальный флаг!
  category   String
  validation Json?
  options    Json?
  priority   Int
}
```

**Что не хватает:**
- `organizationId` - для white-label клиентов
- `countryCode` - для jurisdiction-specific fields
- `userType` - для individual vs business
- `complianceLevel` - для разных уровней KYC (Basic, Enhanced, Ultimate)

---

### 🔴 КРИТИЧНО #3: Огромный монолитный файл

**Файл:** `src/app/(client)/kyc/page.tsx` - **1981 строка!**

Нормальный React component: 100-300 строк
Ваш KYC component: **1981 строка** (в 7-10 раз больше!)

**Что внутри:**
- State management (100+ строк)
- Form rendering logic (500+ строк)
- Field validation (200+ строк)
- Step navigation (100+ строк)
- API calls (200+ строк)
- Conditional rendering для PEP (300+ строк)
- Sumsub integration (200+ строк)
- Mobile link generation (100+ строк)
- Consent screens (200+ строк)

**Проблемы:**
- ❌ Сложно читать и понимать
- ❌ Сложно тестировать
- ❌ Медленная разработка (merge conflicts)
- ❌ Риск багов при изменениях

---

### 🟠 ВАЖНО #4: Hardcoded Categories

**Файл:** `src/app/(admin)/admin/kyc-fields/page.tsx:66-77`

```typescript
const categoryNames: Record<string, string> = {
  personal: 'Personal Identification',
  contact: 'Contact Information',
  address: 'Residential Address',
  documents: 'Identity Documents',
  pep_sanctions: 'PEP & Sanctions',
  employment: 'Employment',
  purpose: 'Purpose of Account',
  activity: 'Expected Activity',
  funds: 'Source of Funds',  // ❌ Есть в admin, НЕТ в client form
  consents: 'Consents & Compliance'
};
```

**Проблемы:**
1. Нельзя добавить новую категорию через UI
2. Нельзя переименовать категорию
3. Нельзя установить иконки через БД
4. Нужен code deploy для добавления категории

---

### 🟠 ВАЖНО #5: Нет conditional logic

**Проблема:** Некоторые поля зависят от других.

**Примеры:**
- Если `is_pep = true` → показать PEP sub-form (7 полей)
- Если `purpose = "other"` → показать `purpose_note`
- Если `country = "US"` → показать `ssn`
- Если `userType = "business"` → показать company fields

**Текущий код:**
```typescript
// Hardcoded в 1981-строчном файле:
{formData.is_pep === 'true' && (
  <div>
    {/* 300 строк PEP sub-form */}
  </div>
)}
```

**Что нужно:**
- Conditional rules в БД
- `dependsOn: { field: 'is_pep', value: 'true' }`
- Dynamic rendering на основе rules

---

### 🟡 MINOR #6: Performance issues

**Проблема:** При каждом изменении поля - re-render всей формы (1981 строка!)

**Причина:**
```typescript
const [formData, setFormData] = useState<Record<string, any>>({});

// При изменении поля:
setFormData({ ...formData, [fieldName]: value });  // ❌ Весь объект изменяется!
```

**Результат:**
- Re-render всех 30+ полей
- Slow input на медленных устройствах
- Плохой UX

---

### 🟡 MINOR #7: Нет версионирования полей

**Проблема:** Если админ изменяет поле (делает required → optional), это влияет на текущие KYC sessions.

**Сценарий:**
1. User начал KYC с 10 required полями
2. Admin изменил 2 поля на optional
3. User сабмитит форму
4. Валидация падает или поля пропадают

**Что нужно:**
- Версионирование KYC form schema
- `KycSession` должен запомнить версию полей
- Нельзя изменять поля пока есть active sessions

---

## 📊 Архитектурное сравнение

### ❌ Текущая архитектура:

```
User → /kyc page (1981 строка) → Hardcoded STEPS
                                → API /api/kyc/form-fields
                                → KycFormField (global)
Admin → /admin/kyc-fields → KycFormField (edit)
```

**Проблемы:**
- Steps hardcoded
- Fields global (no tenant isolation)
- No conditional logic
- No versioning

---

### ✅ Целевая архитектура:

```
User → /kyc page (300 строк)
         ↓
       DynamicKycForm component
         ↓
       KycFormConfig (from DB)
         ├─ Steps (dynamic, orderable)
         ├─ Fields (tenant-specific)
         ├─ Categories (configurable)
         ├─ ConditionalRules
         └─ ValidationSchemas

Admin → /admin/kyc-configuration
          ├─ Step Builder (drag & drop)
          ├─ Field Manager (per tenant)
          ├─ Category Manager
          ├─ Conditional Logic Builder
          └─ Version Management
```

---

## 🎯 План улучшения (по этапам)

### 🚀 Phase 1: Database Schema Enhancement (2-3 дня)

#### 1.1. Добавить `KycFormStep` модель

```prisma
model KycFormStep {
  id          String   @id @default(cuid())
  orgId       String?  // null = default для всех
  stepNumber  Int
  title       String
  description String?
  categories  String[] // JSON array: ['personal', 'contact']
  isEnabled   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([orgId, stepNumber])
  @@index([orgId, isEnabled])
}
```

**Пример данных:**
```json
[
  {
    "stepNumber": 1,
    "title": "Personal Info",
    "categories": ["personal"],
    "isEnabled": true
  },
  {
    "stepNumber": 2,
    "title": "Contact & Address",
    "categories": ["contact", "address"],
    "isEnabled": true
  },
  {
    "stepNumber": 3,
    "title": "Compliance",
    "categories": ["documents", "employment", "pep_sanctions"],
    "isEnabled": true
  },
  {
    "stepNumber": 4,
    "title": "Purpose & Funds",
    "categories": ["purpose", "activity", "funds"],
    "isEnabled": false  // ← Disabled for MVP, можно включить позже!
  }
]
```

---

#### 1.2. Добавить `KycFieldCategory` модель

```prisma
model KycFieldCategory {
  code        String   @id  // 'personal', 'contact', etc.
  name        String   // 'Personal Identification'
  description String?
  icon        String?  // Lucide icon name
  priority    Int      @default(0)
  isEnabled   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([priority])
}
```

**Преимущества:**
- Можно добавлять категории через UI
- Можно изменять названия без code deploy
- Можно устанавливать иконки

---

#### 1.3. Расширить `KycFormField` для мультитенантности

```prisma
model KycFormField {
  id              String   @id @default(cuid())
  fieldName       String
  label           String
  fieldType       String
  category        String
  isRequired      Boolean  @default(true)
  isEnabled       Boolean  @default(true)
  priority        Int      @default(0)
  
  // ✅ NEW: Multi-tenancy & Flexibility
  orgId           String?      // null = default для всех
  countryCode     String?      // 'US', 'EU', 'UK', etc. (null = all)
  userType        String?      // 'individual', 'business' (null = all)
  complianceLevel String?      // 'basic', 'enhanced', 'ultimate'
  
  // ✅ NEW: Conditional Logic
  dependsOn       Json?        // { field: 'is_pep', operator: '==', value: 'true' }
  showIf          Json?        // Complex conditional rules
  
  // ✅ NEW: Validation
  validation      Json?
  options         Json?
  
  // ✅ NEW: Versioning
  version         Int      @default(1)
  isActive        Boolean  @default(true)  // For soft delete
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([orgId, fieldName, version])
  @@index([category])
  @@index([orgId, isEnabled])
  @@index([countryCode])
}
```

---

#### 1.4. Добавить версионирование через `KycFormVersion`

```prisma
model KycFormVersion {
  id          String   @id @default(cuid())
  version     Int
  orgId       String?
  name        String   // "v1.0 - MVP", "v1.1 - Added PEP fields"
  description String?
  schema      Json     // Snapshot of fields + steps + categories
  isActive    Boolean  @default(false)  // Only one active version
  activatedAt DateTime?
  createdBy   String
  createdAt   DateTime @default(now())
  
  // Relations
  kycSessions KycSession[]
  
  @@unique([orgId, version])
  @@index([orgId, isActive])
}

// Update KycSession to track version
model KycSession {
  // ... existing fields
  formVersionId String?
  formVersion   KycFormVersion? @relation(fields: [formVersionId], references: [id])
}
```

---

### 🚀 Phase 2: API & Services (1-2 дня)

#### 2.1. Новые API endpoints

```
GET  /api/kyc/form-config
  → Returns: { steps, fields, categories, conditionalRules, version }
  → Filters by: orgId, countryCode, userType, complianceLevel

GET  /api/admin/kyc-config/steps
POST /api/admin/kyc-config/steps
PUT  /api/admin/kyc-config/steps/:id
DELETE /api/admin/kyc-config/steps/:id

GET  /api/admin/kyc-config/categories
POST /api/admin/kyc-config/categories
PUT  /api/admin/kyc-config/categories/:code
DELETE /api/admin/kyc-config/categories/:code

POST /api/admin/kyc-config/publish-version
  → Creates new form version, makes it active
```

---

### 🚀 Phase 3: Frontend Refactoring (3-4 дня)

#### 3.1. Разбить `/kyc/page.tsx` (1981 строку) на компоненты

**Новая структура:**

```
src/components/kyc/
├── KycFormWizard.tsx          (Main component, 150 строк)
├── KycFormStep.tsx            (Step container, 100 строк)
├── KycFormField.tsx           (Field renderer, 100 строк)
├── KycConsentScreen.tsx       (Consents, 150 строк)
├── KycPepSubForm.tsx          (PEP fields, 200 строк)
├── KycMobileLink.tsx          (QR code, 100 строк)
├── KycStatusCard.tsx          (Status display, 100 строк)
└── hooks/
    ├── useKycFormConfig.ts    (Fetch config from API)
    ├── useKycFormState.ts     (Form state management)
    └── useKycValidation.ts    (Dynamic validation)
```

**Новый `src/app/(client)/kyc/page.tsx`:**
```typescript
// ~100 строк вместо 1981!
'use client';

import { KycFormWizard } from '@/components/kyc/KycFormWizard';
import { useKycFormConfig } from '@/components/kyc/hooks/useKycFormConfig';

export default function KycPage() {
  const { config, loading, error } = useKycFormConfig();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <KycFormWizard config={config} />;
}
```

---

#### 3.2. Динамическая форма с conditional logic

```typescript
// components/kyc/KycFormField.tsx
export function KycFormField({ field, formData }: Props) {
  // Check if field should be shown based on conditionalRules
  const isVisible = evaluateCondition(field.showIf, formData);
  
  if (!isVisible) return null;
  
  // Render field based on fieldType
  switch (field.fieldType) {
    case 'text': return <Input {...field} />;
    case 'select': return <Select {...field} />;
    case 'date': return <DatePicker {...field} />;
    case 'country': return <CountryDropdown {...field} />;
    // ... etc
  }
}
```

---

### 🚀 Phase 4: Admin UI Enhancement (2-3 дня)

#### 4.1. Step Builder (drag & drop)

```
/admin/kyc-config/steps

┌──────────────────────────────────────┐
│ KYC Form Steps Configuration         │
├──────────────────────────────────────┤
│                                       │
│  Step 1: Personal Info       [Edit]  │
│    Categories: personal               │
│    Fields: 5                          │
│                                       │
│  Step 2: Contact & Address   [Edit]  │
│    Categories: contact, address       │
│    Fields: 8                          │
│                                       │
│  Step 3: Compliance          [Edit]  │
│    Categories: documents, pep         │
│    Fields: 12                         │
│                                       │
│  Step 4: Purpose & Funds [Disabled]  │
│    Categories: purpose, funds         │
│    Fields: 6                          │
│    [Enable Step]                      │
│                                       │
│  [+ Add Step]                         │
└──────────────────────────────────────┘
```

---

#### 4.2. Field Manager with filters

```
/admin/kyc-config/fields

Filters: 
[Organization: All   ▼] [Country: All ▼] [User Type: All ▼]

┌──────────────────────────────────────────────────┐
│ Field           │ Category │ Required │ Enabled │
├──────────────────────────────────────────────────┤
│ First Name      │ personal │ ✓        │ ✓       │
│ Last Name       │ personal │ ✓        │ ✓       │
│ SSN             │ personal │ ✓ (US)   │ ✓ (US)  │ ← Country-specific!
│ Date of Birth   │ personal │ ✓        │ ✓       │
│ ...                                              │
└──────────────────────────────────────────────────┘
```

---

## 📊 Ожидаемые результаты

### До оптимизации:
- ❌ Steps hardcoded → нужен code deploy для изменений
- ❌ Категории hardcoded → confusion между admin и client
- ❌ Нет гибкости → все пользователи видят одинаковые поля
- ❌ 1981-строчный файл → сложно поддерживать
- ❌ Нет conditional logic → ненужные поля показываются всем

### После оптимизации:
- ✅ Steps в БД → админ может изменять через UI
- ✅ Категории в БД → можно добавлять новые
- ✅ Мультитенантность → разные поля для EU/US/UK/Business
- ✅ Компонентная структура → 100-150 строк на компонент
- ✅ Conditional logic → показывать поля только когда нужно
- ✅ Версионирование → безопасные изменения формы

---

## 🚀 Quick Wins (можно сделать сегодня)

### 1. Создать migration для Steps (1 час)

```sql
CREATE TABLE "KycFormStep" (
  "id" TEXT PRIMARY KEY,
  "orgId" TEXT,
  "stepNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "categories" JSONB NOT NULL,
  "isEnabled" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

-- Seed default steps
INSERT INTO "KycFormStep" (id, stepNumber, title, categories) VALUES
  ('step-1', 1, 'Personal Info', '["personal"]'),
  ('step-2', 2, 'Contact & Address', '["contact","address"]'),
  ('step-3', 3, 'Compliance Profile', '["documents","employment","pep_sanctions"]'),
  ('step-4', 4, 'Purpose & Funds', '["purpose","activity","funds"]');
```

---

### 2. Создать API endpoint для steps (30 минут)

```typescript
// src/app/api/kyc/form-config/route.ts
export async function GET(request: NextRequest) {
  const steps = await prisma.kycFormStep.findMany({
    where: { isEnabled: true },
    orderBy: { stepNumber: 'asc' }
  });
  
  const fields = await prisma.kycFormField.findMany({
    where: { isEnabled: true },
    orderBy: [{ category: 'asc' }, { priority: 'asc' }]
  });
  
  return NextResponse.json({
    steps,
    fields,
    version: 1
  });
}
```

---

### 3. Заменить hardcoded STEPS в клиенте (30 минут)

```typescript
// src/app/(client)/kyc/page.tsx
const [steps, setSteps] = useState<KycFormStep[]>([]);

useEffect(() => {
  fetchFormConfig();
}, []);

const fetchFormConfig = async () => {
  const response = await fetch('/api/kyc/form-config');
  const data = await response.json();
  setSteps(data.steps);  // ← Dynamic steps from DB!
  setFields(data.fields);
};
```

---

## 📝 Порядок внедрения

### Неделя 1 - Database & API (Quick Wins)
1. ✅ Migration: KycFormStep
2. ✅ API: /api/kyc/form-config
3. ✅ Client: Use dynamic steps
4. ✅ Test & Deploy

**Result:** Steps теперь в БД, можно менять без code deploy!

### Неделя 2 - Multi-tenancy
1. ✅ Migration: Extend KycFormField (orgId, countryCode, userType)
2. ✅ Admin UI: Filters for fields
3. ✅ API: Filter fields based on user context
4. ✅ Test & Deploy

**Result:** Разные поля для разных пользователей!

### Неделя 3 - Component Refactoring
1. ✅ Extract components from 1981-line file
2. ✅ Create hooks for state management
3. ✅ Implement conditional logic
4. ✅ Test & Deploy

**Result:** Чистый, поддерживаемый код!

### Неделя 4 - Admin UI Enhancement
1. ✅ Step Builder (drag & drop)
2. ✅ Category Manager
3. ✅ Conditional Logic Builder
4. ✅ Version Management

**Result:** Полная гибкость через админку!

---

## 🔗 Дополнительные ресурсы

- [Dynamic Form Libraries](https://react-jsonschema-form.readthedocs.io/)
- [Multi-tenant SaaS Patterns](https://docs.aws.amazon.com/whitepapers/latest/saas-architecture-fundamentals/multi-tenant-storage-strategies.html)
- [Form Versioning Best Practices](https://www.prisma.io/blog/database-change-management)

---

**Готово к обсуждению!** 🚀

Следующие шаги:
1. Обсудить приоритеты (Quick Wins vs Full Refactoring)
2. Начать с Phase 1 (Database) или Quick Wins
3. Plan sprint/timeline

---

**Автор:** AI Assistant  
**Статус:** Ready for implementation

