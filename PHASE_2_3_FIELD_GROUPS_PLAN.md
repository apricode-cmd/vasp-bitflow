# 🎯 Phase 2.3: Field Groups & Sections

## 📋 Цель

Создать систему группировки KYC полей для лучшей организации и UX.

## 🎨 Что будет реализовано

### 1. Database Schema
```prisma
model KycFieldGroup {
  id          String   @id @default(cuid())
  name        String   // "Personal Information"
  description String?  // "Basic personal details"
  icon        String?  // Lucide icon name
  priority    Int      @default(0)
  isCollapsible Boolean @default(false)
  isCollapsedByDefault Boolean @default(false)
  
  // Conditional Logic для группы
  dependsOn   String?
  showWhen    Json?
  
  // Styling
  customClass String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  fields      KycFormField[] @relation("FieldToGroup")
  
  @@index([priority])
}

// Update KycFormField
model KycFormField {
  // ... existing fields ...
  
  groupId     String?
  group       KycFieldGroup? @relation("FieldToGroup", fields: [groupId], references: [id])
  
  @@index([groupId])
}
```

### 2. UI Components

#### GroupManagementPanel
- List all groups
- Create/Edit/Delete groups
- Reorder groups (priority)
- Assign fields to groups

#### GroupConfigDialog
- Group name & description
- Icon picker (Lucide icons)
- Collapsible settings
- Conditional logic (same as fields)
- Custom styling

#### FieldGroupDisplay (in KYC form)
- Collapsible sections
- Group header with icon
- Smooth animations
- Conditional rendering

### 3. API Endpoints

```typescript
// GET /api/admin/kyc/field-groups
// GET /api/admin/kyc/field-groups/[id]
// POST /api/admin/kyc/field-groups
// PATCH /api/admin/kyc/field-groups/[id]
// DELETE /api/admin/kyc/field-groups/[id]

// PATCH /api/admin/kyc/form-fields/[id]
// Add: groupId field
```

## 🎯 Benefits

### For Admins:
- ✅ Better organization of 50+ fields
- ✅ Logical grouping (Personal, Employment, PEP, etc)
- ✅ Reusable groups across forms

### For Users:
- ✅ Cleaner UI with collapsible sections
- ✅ Progressive disclosure (show what matters)
- ✅ Better mobile experience
- ✅ Faster form completion

### Example Groups:

```yaml
Personal Information:
  - First Name
  - Last Name
  - Date of Birth
  - Nationality
  
Contact Details:
  - Email
  - Phone
  - Address
  
Employment (conditional):
  - Employment Status
  - Employer Name
  - Job Title
  - Income
  
PEP Information (conditional):
  - PEP Status
  - PEP Role
  - PEP Institution
  
Documents:
  - ID Document
  - Proof of Address
```

## 📊 Implementation Steps

### Step 1: Database (30 mins)
1. Add KycFieldGroup model
2. Update KycFormField with groupId
3. Create migration
4. Seed default groups

### Step 2: API (30 mins)
1. CRUD endpoints for groups
2. Update field endpoints
3. Validation schemas

### Step 3: UI Components (2 hours)
1. GroupManagementPanel
2. GroupConfigDialog
3. Field assignment UI
4. Preview in form

### Step 4: Integration (30 mins)
1. Update KYC form to use groups
2. Collapsible behavior
3. Conditional group logic

---

## 🚀 Let's Start!

**Simpler Alternative for MVP:**

Instead of full database implementation, we can start with:
1. **Virtual Groups** - Group fields by category in UI only
2. **Collapsible Sections** - Add to existing categories
3. **No Database Changes** - Use existing category field

This gets us 80% of benefits in 1 hour instead of 3-4 hours.

**Which approach?**
A) Full Database Implementation (3-4 hours) - Complete solution
B) Virtual Groups MVP (1 hour) - Quick wins, can upgrade later

Let me know and I'll proceed!

