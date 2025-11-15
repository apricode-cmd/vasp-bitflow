# 🎯 KYC Refactoring - План на сегодня

**Цель:** Синхронизировать админку и клиентскую форму без изменения БД  
**Время:** 8-10 часов (рабочий день)  
**Подход:** Рефакторинг, shared config, компоненты

---

## ✅ Checklist (что делаем)

- [ ] **Part 1:** Shared Config (1-2 часа)
  - [ ] Создать `src/lib/kyc/config.ts` с STEPS и categories
  - [ ] Добавить Step 4 (Purpose & Funds)
  - [ ] Убрать дубли категорий
  
- [ ] **Part 2:** Component Refactoring (4-5 часов)
  - [ ] Разбить `/kyc/page.tsx` (1981 строку) на компоненты
  - [ ] Вынести логику в hooks
  - [ ] Улучшить performance
  
- [ ] **Part 3:** Admin Synchronization (2-3 часа)
  - [ ] Использовать shared config в админке
  - [ ] Показывать steps с полями
  - [ ] Скрывать empty steps
  
- [ ] **Part 4:** Testing & Cleanup (1 час)
  - [ ] Тестировать клиентскую форму
  - [ ] Тестировать админку
  - [ ] Commit & Push

---

## 📦 Part 1: Shared Config (1-2 часа)

### 1.1. Создать shared config для STEPS и categories

**Файл:** `src/lib/kyc/config.ts` (новый)

```typescript
/**
 * KYC Form Configuration
 * Shared between client form and admin panel
 */

export interface KycCategory {
  code: string;
  name: string;
  description?: string;
  icon: string; // Lucide icon name
  priority: number;
}

export interface KycStep {
  id: number;
  title: string;
  description?: string;
  categories: string[];
}

// ✅ Single source of truth для категорий
export const KYC_CATEGORIES: Record<string, KycCategory> = {
  personal: {
    code: 'personal',
    name: 'Personal Identification',
    description: 'Basic personal information',
    icon: 'User',
    priority: 1
  },
  contact: {
    code: 'contact',
    name: 'Contact Information',
    description: 'Email and phone',
    icon: 'Mail',
    priority: 2
  },
  address: {
    code: 'address',
    name: 'Residential Address',
    description: 'Current address',
    icon: 'MapPin',
    priority: 3
  },
  documents: {
    code: 'documents',
    name: 'Identity Documents',
    description: 'ID verification',
    icon: 'FileText',
    priority: 4
  },
  pep_sanctions: {
    code: 'pep_sanctions',
    name: 'PEP & Sanctions',
    description: 'Political exposure and sanctions screening',
    icon: 'ShieldCheck',
    priority: 5
  },
  employment: {
    code: 'employment',
    name: 'Employment',
    description: 'Current occupation',
    icon: 'Briefcase',
    priority: 6
  },
  // ✅ Добавляем недостающие категории
  purpose: {
    code: 'purpose',
    name: 'Purpose of Account',
    description: 'Why you need the account',
    icon: 'Target',
    priority: 7
  },
  activity: {
    code: 'activity',
    name: 'Expected Activity',
    description: 'Transaction volume and frequency',
    icon: 'Activity',
    priority: 8
  },
  funds: {
    code: 'funds',
    name: 'Source of Funds',
    description: 'Origin of your funds',
    icon: 'DollarSign',
    priority: 9
  },
  consents: {
    code: 'consents',
    name: 'Consents & Compliance',
    description: 'Legal consents',
    icon: 'CheckSquare',
    priority: 10
  }
};

// ✅ Single source of truth для Steps
export const KYC_STEPS: KycStep[] = [
  {
    id: 1,
    title: 'Personal Info',
    description: 'Your basic personal details',
    categories: ['personal']
  },
  {
    id: 2,
    title: 'Contact & Address',
    description: 'How to reach you',
    categories: ['contact', 'address']
  },
  {
    id: 3,
    title: 'Compliance Profile',
    description: 'Identity verification and compliance',
    categories: ['documents', 'employment', 'pep_sanctions']
  },
  {
    id: 4,
    title: 'Purpose & Funds',
    description: 'Account purpose and source of funds',
    categories: ['purpose', 'activity', 'funds']
  }
];

// ✅ Helper function: Get category name
export function getCategoryName(code: string): string {
  return KYC_CATEGORIES[code]?.name || code;
}

// ✅ Helper function: Get category icon
export function getCategoryIcon(code: string): string {
  return KYC_CATEGORIES[code]?.icon || 'FileText';
}

// ✅ Helper function: Get steps with enabled fields
export function getStepsWithFields(fields: Array<{ category: string; isEnabled: boolean }>): KycStep[] {
  return KYC_STEPS.filter(step => {
    // Проверяем есть ли хотя бы одно enabled поле в категориях этого шага
    const hasEnabledFields = step.categories.some(category => 
      fields.some(field => field.category === category && field.isEnabled)
    );
    return hasEnabledFields;
  });
}

// ✅ Helper function: Get all category codes
export function getAllCategories(): string[] {
  return Object.keys(KYC_CATEGORIES);
}
```

**Действие:**
```bash
# Создать папку
mkdir -p src/lib/kyc

# Создать файл
touch src/lib/kyc/config.ts
# (вставить код выше)
```

---

## 📦 Part 2: Component Refactoring (4-5 часов)

### 2.1. Создать компоненты (вместо 1981-строчного файла)

**Структура:**

```
src/components/kyc/
├── KycFormWizard.tsx           # Main wizard (200 строк)
├── KycFormStep.tsx             # Step container (150 строк)
├── KycField.tsx                # Field renderer (100 строк)
├── KycConsentScreen.tsx        # Consent form (150 строк)
├── KycPepSubForm.tsx           # PEP fields (200 строк)
├── KycMobileLink.tsx           # QR code (100 строк)
├── KycStatusCard.tsx           # Status display (100 строк)
└── hooks/
    ├── useKycForm.ts           # Form state (100 строк)
    ├── useKycFields.ts         # Fetch fields (50 строк)
    └── useKycValidation.ts     # Validation (100 строк)
```

**Итого:** 8 маленьких файлов (100-200 строк) вместо 1 огромного (1981 строка)

---

### 2.2. Обновить клиентскую страницу `/kyc`

**Файл:** `src/app/(client)/kyc/page.tsx` (сократить до ~150 строк)

```typescript
/**
 * KYC Verification Page
 * Refactored to use components
 */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { KycFormWizard } from '@/components/kyc/KycFormWizard';
import { KycStatusCard } from '@/components/kyc/KycStatusCard';
import { KycConsentScreen } from '@/components/kyc/KycConsentScreen';
import { useKycFields } from '@/components/kyc/hooks/useKycFields';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function KycPage(): React.ReactElement {
  const { data: session } = useSession();
  const { fields, grouped, loading, error, refetch } = useKycFields();
  const [kycSession, setKycSession] = useState(null);
  const [showConsents, setShowConsents] = useState(true);
  const [consentsAccepted, setConsentsAccepted] = useState(false);

  // Fetch KYC status
  useEffect(() => {
    if (session?.user?.id) {
      fetchKycStatus();
    }
  }, [session]);

  const fetchKycStatus = async () => {
    try {
      const response = await fetch('/api/kyc/status');
      if (response.ok) {
        const data = await response.json();
        setKycSession(data.kycSession);
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
    }
  };

  const handleConsentsAccept = () => {
    setConsentsAccepted(true);
    setShowConsents(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show consents first
  if (showConsents && !consentsAccepted) {
    return (
      <KycConsentScreen 
        onAccept={handleConsentsAccept}
      />
    );
  }

  // Show status card if KYC already submitted
  if (kycSession && kycSession.status !== 'PENDING') {
    return (
      <KycStatusCard 
        kycSession={kycSession}
        onRefresh={fetchKycStatus}
      />
    );
  }

  // Show form wizard
  return (
    <KycFormWizard
      fields={fields}
      grouped={grouped}
      kycSession={kycSession}
      onComplete={fetchKycStatus}
    />
  );
}
```

---

### 2.3. Создать основные компоненты

#### A. `KycFormWizard.tsx` (главный компонент)

```typescript
'use client';

import { useState } from 'react';
import { KycFormStep } from './KycFormStep';
import { KYC_STEPS, getStepsWithFields } from '@/lib/kyc/config';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface Props {
  fields: any[];
  grouped: Record<string, any[]>;
  kycSession: any;
  onComplete: () => void;
}

export function KycFormWizard({ fields, grouped, kycSession, onComplete }: Props) {
  // Фильтруем steps - показываем только те, где есть enabled поля
  const activeSteps = getStepsWithFields(fields);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleNext = async () => {
    // Validate current step
    const isValid = await validateStep(currentStep);
    if (!isValid) return;

    if (currentStep < activeSteps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit form
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/kyc/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData })
      });

      if (response.ok) {
        toast.success('KYC submitted successfully');
        onComplete();
      } else {
        toast.error('Failed to submit KYC');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const progress = (currentStep / activeSteps.length) * 100;
  const step = activeSteps[currentStep - 1];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Step {currentStep} of {activeSteps.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Current Step */}
      <Card>
        <KycFormStep
          step={step}
          fields={fields}
          formData={formData}
          onChange={setFormData}
        />
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={isSaving}
        >
          {currentStep === activeSteps.length ? 'Submit' : 'Next'}
          {currentStep < activeSteps.length && <ArrowRight className="h-4 w-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}
```

---

#### B. `KycFormStep.tsx`

```typescript
'use client';

import { KycField } from './KycField';
import { KYC_CATEGORIES } from '@/lib/kyc/config';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface Props {
  step: { id: number; title: string; description?: string; categories: string[] };
  fields: any[];
  formData: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
}

export function KycFormStep({ step, fields, formData, onChange }: Props) {
  // Filter fields for this step
  const stepFields = fields.filter(f => 
    step.categories.includes(f.category) && f.isEnabled
  ).sort((a, b) => a.priority - b.priority);

  const handleFieldChange = (fieldName: string, value: any) => {
    onChange({ ...formData, [fieldName]: value });
  };

  return (
    <>
      <CardHeader>
        <CardTitle>{step.title}</CardTitle>
        {step.description && (
          <CardDescription>{step.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Group by category */}
        {step.categories.map(category => {
          const categoryFields = stepFields.filter(f => f.category === category);
          if (categoryFields.length === 0) return null;

          const categoryInfo = KYC_CATEGORIES[category];

          return (
            <div key={category} className="space-y-4">
              <h3 className="text-lg font-semibold">
                {categoryInfo?.name || category}
              </h3>
              {categoryInfo?.description && (
                <p className="text-sm text-muted-foreground">
                  {categoryInfo.description}
                </p>
              )}

              {/* Render fields */}
              {categoryFields.map(field => (
                <KycField
                  key={field.id}
                  field={field}
                  value={formData[field.fieldName]}
                  onChange={(value) => handleFieldChange(field.fieldName, value)}
                />
              ))}
            </div>
          );
        })}
      </CardContent>
    </>
  );
}
```

---

#### C. `KycField.tsx` (simplified)

```typescript
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { CountryDropdown } from '@/components/ui/country-dropdown';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  field: any;
  value: any;
  onChange: (value: any) => void;
}

export function KycField({ field, value, onChange }: Props) {
  const renderInput = () => {
    switch (field.fieldType) {
      case 'text':
      case 'email':
        return (
          <Input
            type={field.fieldType}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.isRequired}
          />
        );

      case 'select':
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <DatePicker
            date={value ? new Date(value) : undefined}
            onDateChange={(date) => onChange(date?.toISOString())}
          />
        );

      case 'country':
        return (
          <CountryDropdown
            value={value}
            onChange={onChange}
          />
        );

      case 'phone':
        return (
          <PhoneInput
            value={value}
            onChange={onChange}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
          />
        );

      default:
        return <Input value={value || ''} onChange={(e) => onChange(e.target.value)} />;
    }
  };

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.isRequired && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderInput()}
    </div>
  );
}
```

---

## 📦 Part 3: Admin Synchronization (2-3 часа)

### 3.1. Обновить админку `/admin/kyc-fields`

**Файл:** `src/app/(admin)/admin/kyc-fields/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { KYC_CATEGORIES, KYC_STEPS, getCategoryIcon, getStepsWithFields } from '@/lib/kyc/config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';

export default function KycFormFieldsPage() {
  const [fields, setFields] = useState<KycField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    const response = await fetch('/api/admin/kyc-fields');
    const data = await response.json();
    setFields(data.fields);
    setLoading(false);
  };

  // ✅ Group fields by Step (not by category)
  const fieldsByStep = KYC_STEPS.map(step => {
    const stepFields = fields.filter(f => 
      step.categories.includes(f.category)
    );
    
    const enabledCount = stepFields.filter(f => f.isEnabled).length;
    
    return {
      step,
      fields: stepFields,
      enabledCount,
      totalCount: stepFields.length
    };
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">KYC Form Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Manage KYC form fields by steps. Total: {fields.length} fields
        </p>
      </div>

      {/* ✅ Show steps with field counts */}
      <div className="grid grid-cols-4 gap-4">
        {fieldsByStep.map(({ step, enabledCount, totalCount }) => (
          <Card key={step.id} className="p-4">
            <h3 className="font-semibold">Step {step.id}: {step.title}</h3>
            <div className="text-sm text-muted-foreground mt-2">
              {enabledCount} / {totalCount} enabled
            </div>
            <div className="mt-2">
              {step.categories.map(cat => (
                <Badge key={cat} variant="outline" className="mr-1 mb-1">
                  {KYC_CATEGORIES[cat]?.name}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs по Step (не по category!) */}
      <Tabs defaultValue="step-1">
        <TabsList>
          {fieldsByStep.map(({ step, enabledCount }) => (
            <TabsTrigger key={step.id} value={`step-${step.id}`}>
              Step {step.id}
              {enabledCount > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {enabledCount}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {fieldsByStep.map(({ step, fields }) => (
          <TabsContent key={step.id} value={`step-${step.id}`}>
            <Card>
              {/* Field list for this step */}
              {fields.map(field => (
                <FieldRow 
                  key={field.id} 
                  field={field} 
                  onUpdate={fetchFields}
                />
              ))}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
```

---

## 📋 Детальный порядок действий:

### ⏰ 09:00-10:30 (1.5 часа) - Shared Config
```bash
1. Создать src/lib/kyc/config.ts
2. Скопировать код shared config
3. Добавить Step 4
4. Проверить что всё компилируется
```

### ⏰ 10:30-12:00 (1.5 часа) - Hooks
```bash
1. Создать src/components/kyc/hooks/useKycFields.ts
2. Создать src/components/kyc/hooks/useKycForm.ts
3. Вынести логику из page.tsx
```

### ⏰ 12:00-13:00 (1 час) - Обед 🍕

### ⏰ 13:00-15:00 (2 часа) - Components Part 1
```bash
1. Создать KycField.tsx
2. Создать KycFormStep.tsx
3. Тестировать компоненты
```

### ⏰ 15:00-17:00 (2 часа) - Components Part 2
```bash
1. Создать KycFormWizard.tsx
2. Обновить page.tsx (сократить до 150 строк)
3. Тестировать форму end-to-end
```

### ⏰ 17:00-18:30 (1.5 часа) - Admin Panel
```bash
1. Обновить /admin/kyc-fields/page.tsx
2. Использовать shared config
3. Показывать Steps вместо Categories
4. Тестировать админку
```

### ⏰ 18:30-19:00 (30 минут) - Testing & Cleanup
```bash
1. End-to-end тестирование
2. Проверка обеих форм
3. Commit & Push
```

---

## ✅ Результаты (что получим):

### До:
- ❌ 1981-строчный monolith `/kyc/page.tsx`
- ❌ 3 steps (Step 4 закомментирован)
- ❌ Админка показывает 10 категорий, форма 6
- ❌ Дубли в определениях категорий

### После:
- ✅ 150-строчная `/kyc/page.tsx` + 8 компонентов (100-200 строк)
- ✅ 4 steps (все активны, но показываются только с enabled полями)
- ✅ Админка и форма синхронизированы
- ✅ Один источник истины (shared config)
- ✅ Чистый, поддерживаемый код

---

## 🚀 Начинаем?

Хочешь чтобы я начал с Part 1 (Shared Config)? Создам файлы и код прямо сейчас! 💪

