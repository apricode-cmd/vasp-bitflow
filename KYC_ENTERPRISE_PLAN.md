# 🚀 KYC Form Configuration - Enterprise Level Plan

## 📊 Текущий статус

### ✅ Что уже работает:
- KYC Form Fields Configuration page (`/admin/kyc-fields`)
- Conditional Logic (hardcoded в `conditionalLogic.ts`)
- Basic CRUD для полей
- Step-based organization
- Enable/Disable fields

### ❌ Что нужно для Enterprise:

#### 1. **Conditional Logic UI** (Priority 1) 🎯
- [ ] Visual dependency builder в edit dialog
- [ ] `dependsOn` field selector
- [ ] `showWhen` condition builder (==, !=, in, not_in, >, <, contains)
- [ ] Multiple conditions support (AND/OR logic)
- [ ] Preview conditional fields в реальном времени

#### 2. **Advanced Field Configuration** (Priority 1)
- [ ] Validation Rules Builder
  - Min/max length
  - Regex patterns
  - Custom validators
  - Error messages
- [ ] Field Options Manager
  - Dynamic options from API
  - Conditional options
  - Option dependencies
- [ ] Field Styling
  - Custom CSS classes
  - Layout hints (full-width, half-width)
  - Placeholder text
  - Help text/tooltips

#### 3. **Field Groups & Sections** (Priority 2)
- [ ] Create field groups
- [ ] Collapsible sections
- [ ] Conditional groups
- [ ] Section validation
- [ ] Visual separators

#### 4. **Preview & Testing** (Priority 2)
- [ ] Live Form Preview
- [ ] Test Mode (заполнить форму как user)
- [ ] Conditional Logic Debugger
- [ ] Validation Testing
- [ ] Mobile Preview

#### 5. **Bulk Operations** (Priority 2)
- [ ] Bulk Enable/Disable
- [ ] Bulk Priority Change
- [ ] Bulk Category Change
- [ ] Bulk Validation Rules

#### 6. **Import/Export** (Priority 3)
- [ ] Export configuration to JSON
- [ ] Import configuration from JSON
- [ ] Templates library
- [ ] Version control
- [ ] Rollback to previous version

#### 7. **Analytics & Insights** (Priority 3)
- [ ] Field completion rates
- [ ] Average time per field
- [ ] Drop-off points
- [ ] Validation errors frequency
- [ ] Popular field values

#### 8. **Field Templates** (Priority 3)
- [ ] Pre-built field templates
- [ ] Industry-specific templates
- [ ] Compliance templates (GDPR, KYC, AML)
- [ ] Custom template creation

---

## 🎯 Implementation Plan

### Phase 2.1: Conditional Logic UI (Week 1) ⭐

#### Day 1-2: Edit Dialog Enhancement
```typescript
// Add to edit dialog:
interface ConditionalConfig {
  dependsOn: string | null;
  showWhen: {
    operator: '==' | '!=' | 'in' | 'not_in' | '>' | '<' | 'contains';
    value: any;
  } | null;
}
```

**Features:**
1. **Depends On Selector**
   - Dropdown: Select parent field
   - Show only compatible fields
   - Clear button

2. **Condition Builder**
   - Operator selector
   - Value input (based on parent field type)
   - Multiple conditions (AND/OR)

3. **Preview Section**
   - Show when this field will be visible
   - Example scenarios

**UI Mock:**
```
┌─────────────────────────────────────────┐
│ Edit Field: PEP Role Title              │
├─────────────────────────────────────────┤
│                                         │
│ [Label] [Validation] [Conditional] ←Tabs│
│                                         │
│ Conditional Logic:                      │
│                                         │
│ Show this field when:                   │
│ ┌─────────────────────────────────────┐ │
│ │ [pep_status ▼] [is not ▼] [NO    ] │ │
│ │ [+ Add Condition]                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Preview:                                │
│ ✓ Shows when pep_status != "NO"        │
│ ✗ Hidden when pep_status = "NO"        │
│                                         │
│ [Cancel] [Save Changes]                 │
└─────────────────────────────────────────┘
```

#### Day 3: Database Schema Update
```prisma
model KycFormField {
  // ... existing fields ...
  
  // Conditional Logic
  dependsOn    String?
  showWhen     Json?      // { operator, value }
  
  // Advanced
  helpText     String?
  placeholder  String?
  customClass  String?
}
```

#### Day 4: API Endpoints
```typescript
// PATCH /api/admin/kyc/form-fields/[id]
// Add support for dependsOn and showWhen

// GET /api/admin/kyc/form-fields/dependencies
// Return field dependency tree
```

#### Day 5: Integration & Testing
- Update `shouldShowField()` to use database config
- Fallback to hardcoded logic
- Test all scenarios

---

### Phase 2.2: Validation Builder (Week 2)

#### Visual Validation Rules
```typescript
interface ValidationRule {
  type: 'min' | 'max' | 'regex' | 'email' | 'url' | 'custom';
  value: any;
  message: string;
}
```

**UI:**
```
Validation Rules:
┌────────────────────────────────────┐
│ [+] Min Length: [2] characters     │
│ [+] Max Length: [100] characters   │
│ [+] Pattern: [^[A-Z]{2}$]          │
│     Message: "Must be 2 letters"   │
│ [+ Add Rule]                       │
└────────────────────────────────────┘
```

---

### Phase 2.3: Field Groups (Week 3)

```typescript
model KycFieldGroup {
  id          String   @id @default(cuid())
  name        String
  description String?
  icon        String?
  priority    Int      @default(0)
  isCollapsible Boolean @default(false)
  dependsOn   String?
  showWhen    Json?
  
  fields      KycFormField[]
}
```

**UI:**
```
Step 1: Personal Information
┌───────────────────────────────────────┐
│ ▼ Basic Info (2 fields)               │
│   [x] First Name                      │
│   [x] Last Name                       │
│                                       │
│ ▼ PEP Information (8 fields)          │
│   [x] PEP Status                      │
│   [ ] PEP Role (depends on status)    │
│   [ ] PEP Institution (depends on...) │
└───────────────────────────────────────┘
```

---

### Phase 2.4: Live Preview (Week 4)

**Split Screen:**
```
┌──────────────────┬──────────────────┐
│ Configuration    │  Live Preview    │
│                  │                  │
│ [Edit Fields]    │  [Form Display]  │
│                  │                  │
│ • First Name     │  ┌────────────┐  │
│ • Last Name      │  │First Name  │  │
│ • PEP Status     │  └────────────┘  │
│   • PEP Role ↳   │  ┌────────────┐  │
│                  │  │Last Name   │  │
│                  │  └────────────┘  │
│                  │  ┌────────────┐  │
│                  │  │PEP Status▼ │  │
│                  │  └────────────┘  │
│                  │  (Hidden: PEP    │
│                  │   Role)          │
└──────────────────┴──────────────────┘
```

---

## 📊 Enterprise Features Comparison

| Feature | Current | Phase 2.1 | Phase 2.2 | Phase 2.3 | Phase 2.4 |
|---------|---------|-----------|-----------|-----------|-----------|
| Basic CRUD | ✅ | ✅ | ✅ | ✅ | ✅ |
| Enable/Disable | ✅ | ✅ | ✅ | ✅ | ✅ |
| Priority | ✅ | ✅ | ✅ | ✅ | ✅ |
| Conditional Logic | Hardcoded | **✅ UI** | ✅ | ✅ | ✅ |
| Validation Builder | JSON | JSON | **✅ UI** | ✅ | ✅ |
| Field Groups | ❌ | ❌ | ❌ | **✅** | ✅ |
| Live Preview | ❌ | ❌ | ❌ | ❌ | **✅** |
| Bulk Operations | ❌ | ✅ | ✅ | ✅ | ✅ |
| Import/Export | ❌ | ❌ | ✅ | ✅ | ✅ |
| Analytics | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🎯 Quick Win Actions (Start Today)

### 1. Add Conditional Logic to Edit Dialog (2-3 hours)
```typescript
// Components needed:
- <ConditionalLogicSection />
- <FieldDependencySelector />
- <ConditionBuilder />
- <ConditionPreview />
```

### 2. Database Migration (30 mins)
```sql
ALTER TABLE "KycFormField"
ADD COLUMN "dependsOn" TEXT,
ADD COLUMN "showWhen" JSONB,
ADD COLUMN "helpText" TEXT,
ADD COLUMN "placeholder" TEXT;
```

### 3. Update API (1 hour)
Support `dependsOn` and `showWhen` in PATCH endpoint

### 4. Update conditionalLogic.ts (1 hour)
Read from database first, fallback to hardcoded

---

## 💰 Business Value

### For Customers:
- ✅ Faster KYC form customization
- ✅ No code required
- ✅ Visual form builder
- ✅ Compliance-ready templates
- ✅ Multi-language support
- ✅ A/B testing forms

### For Us:
- ✅ **Premium Feature** - charge $500-1000/month extra
- ✅ Competitive advantage
- ✅ Faster client onboarding
- ✅ Reduced support tickets
- ✅ Upsell opportunity

---

## 📝 Next Steps

**Today:**
1. ✅ Create this plan
2. ⏳ Add Conditional Logic UI to edit dialog
3. ⏳ Database migration
4. ⏳ Update API

**This Week:**
- Complete Phase 2.1
- Test with real scenarios
- Document for clients

**Next Week:**
- Start Phase 2.2 (Validation Builder)
- Collect feedback

---

**Ready to start implementation?** 🚀

