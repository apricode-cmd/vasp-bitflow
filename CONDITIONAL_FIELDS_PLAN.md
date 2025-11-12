# 🎯 Conditional Fields Implementation Plan

## Проблемы:
1. ❌ PEP поля показываются всегда (должны только при `pep_status !== 'NO'`)
2. ❌ Employment поля показываются всегда (должны по условию)
3. ❌ KYC сессия не создается автоматически
4. ❌ Нет настройки условной логики в админке

## Решение в 2 этапа:

### 📋 **Phase 1: Quick Fix (сегодня, 2-3 часа)**

#### 1.1. Hardcoded Conditional Logic (работает сразу)
```typescript
// src/lib/kyc/conditionalLogic.ts
export function shouldShowField(
  field: KycField,
  formData: Record<string, any>
): boolean {
  // PEP fields
  const pepFields = ['pep_role_title', 'pep_institution', 'pep_country', 
                     'pep_since', 'pep_until', 'relationship_to_pep'];
  if (pepFields.includes(field.fieldName)) {
    const pepStatus = formData['pep_status'];
    if (!pepStatus || pepStatus === 'NO') return false;
    
    // pep_until only for FORMER
    if (field.fieldName === 'pep_until' && !pepStatus.includes('FORMER')) {
      return false;
    }
    
    // relationship_to_pep only for FAMILY/ASSOCIATE
    if (field.fieldName === 'relationship_to_pep' && 
        !pepStatus.includes('FAMILY') && !pepStatus.includes('ASSOCIATE')) {
      return false;
    }
  }
  
  // Employment fields
  const employedFields = ['employer_name', 'job_title', 'industry', 
                          'employment_country', 'employment_years', 'income_band_monthly'];
  if (employedFields.includes(field.fieldName)) {
    const status = formData['employment_status'];
    return status === 'EMPLOYED_FT' || status === 'EMPLOYED_PT';
  }
  
  const selfEmployedFields = ['biz_name', 'biz_activity', 'biz_country', 
                              'biz_years', 'revenue_band_annual'];
  if (selfEmployedFields.includes(field.fieldName)) {
    return formData['employment_status'] === 'SELF_EMPLOYED';
  }
  
  const studentFields = ['institution_name', 'student_funding_source'];
  if (studentFields.includes(field.fieldName)) {
    return formData['employment_status'] === 'STUDENT';
  }
  
  if (field.fieldName === 'other_employment_note') {
    return formData['employment_status'] === 'OTHER';
  }
  
  return true; // Show by default
}
```

#### 1.2. Auto-create KYC Session
```typescript
// src/app/api/kyc/submit-form/route.ts
// If no session exists, create one automatically
if (!kycSession) {
  kycSession = await prisma.kycSession.create({
    data: {
      userId: session.user.id,
      status: 'PENDING',
      provider: 'manual' // Or from settings
    }
  });
}
```

#### 1.3. Update KycFormStep to use conditional logic
```typescript
// Filter fields by shouldShowField()
const visibleFields = stepFields.filter(f => shouldShowField(f, formData));
```

---

### 🚀 **Phase 2: Admin Configuration (следующая неделя, 1-2 дня)**

#### 2.1. Database Schema Update
```prisma
model KycFormField {
  id           String   @id @default(cuid())
  fieldName    String   @unique
  label        String
  fieldType    String
  category     String
  isRequired   Boolean  @default(true)
  isEnabled    Boolean  @default(true)
  priority     Int      @default(0)
  validation   Json?
  options      Json?
  
  // NEW: Conditional logic
  dependsOn    String?  // Parent field name (e.g., 'pep_status')
  showWhen     Json?    // Condition (e.g., {"operator": "!=", "value": "NO"})
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

Example:
```json
{
  "fieldName": "pep_role_title",
  "dependsOn": "pep_status",
  "showWhen": {
    "operator": "!=",
    "value": "NO"
  }
}
```

#### 2.2. Admin UI for Conditional Logic
```typescript
// Admin panel: Add "Depends On" configuration
<Select label="Depends On Field">
  <option value="">Always show</option>
  <option value="pep_status">PEP Status</option>
  <option value="employment_status">Employment Status</option>
</Select>

<Input label="Show When Value" />
```

#### 2.3. Dynamic Evaluation
```typescript
export function shouldShowField(
  field: KycField,
  formData: Record<string, any>
): boolean {
  if (!field.dependsOn) return true;
  
  const parentValue = formData[field.dependsOn];
  if (!field.showWhen) return true;
  
  const { operator, value } = field.showWhen as any;
  
  switch (operator) {
    case '=': return parentValue === value;
    case '!=': return parentValue !== value;
    case 'in': return value.includes(parentValue);
    case 'notIn': return !value.includes(parentValue);
    default: return true;
  }
}
```

---

## 📅 Timeline:

| Phase | Task | Time | Status |
|-------|------|------|--------|
| **Phase 1** | Hardcoded conditional logic | 1h | 🔄 In Progress |
| **Phase 1** | Auto-create KYC session | 30min | ⏳ Pending |
| **Phase 1** | Update validation logic | 30min | ⏳ Pending |
| **Phase 1** | Testing & commit | 30min | ⏳ Pending |
| **Phase 2** | Database migration | 1h | 📅 Next week |
| **Phase 2** | Admin UI | 4h | 📅 Next week |
| **Phase 2** | Dynamic evaluation | 2h | 📅 Next week |
| **Phase 2** | Testing | 1h | 📅 Next week |

---

## ✅ Quick Win (Phase 1)
- Hardcoded logic работает **сразу**
- Нет изменений БД
- Решает проблему **сегодня**

## 🎁 Long-term (Phase 2)
- Полностью настраиваемо через админку
- Нет hardcode
- Масштабируемое решение

