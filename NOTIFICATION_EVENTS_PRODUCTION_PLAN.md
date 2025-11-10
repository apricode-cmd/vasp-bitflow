# 🎯 Notification Events - Production Implementation Plan

## 📋 Phase 1: Критичные функции (Must Have)

### 1.1 Event ↔ Template Integration

#### Database Changes
```prisma
model NotificationEvent {
  // ... existing fields
  
  // Template integration
  templateId    String?
  emailTemplate EmailTemplate? @relation(fields: [templateId], references: [id])
  templateKey   String? // Deprecated, use templateId
}
```

#### API Changes
```typescript
// GET /api/admin/notification-events/templates
// - List available templates for event
// - Filter by category

// POST /api/admin/notification-events
// - Validate templateId exists
// - Check template variables match event schema

// PATCH /api/admin/notification-events/[eventKey]
// - Validate new templateId
```

#### UI Changes
```typescript
// Create/Edit Dialog:
- Replace templateKey Input with Select
- Fetch templates from API
- Show template preview
- Display required variables
- Validate variable compatibility
```

---

### 1.2 Variable Schema (Payload Documentation)

#### Database Changes
```prisma
model NotificationEvent {
  // ... existing fields
  
  // Variable schema
  variableSchema   Json?     // JSON Schema for validation
  requiredVariables String[] // ['orderId', 'amount']
  optionalVariables String[] // ['couponCode', 'note']
  examplePayload   Json?     // Example data for developers
  
  // Documentation
  developerNotes   String?   // Technical notes
  usageExamples    Json?     // Code examples
}
```

#### JSON Schema Example
```json
{
  "type": "object",
  "required": ["orderId", "amount", "currency"],
  "properties": {
    "orderId": {
      "type": "string",
      "description": "Order ID"
    },
    "amount": {
      "type": "number",
      "minimum": 0,
      "description": "Order amount"
    },
    "currency": {
      "type": "string",
      "enum": ["EUR", "PLN", "USD"],
      "description": "Currency code"
    },
    "customerName": {
      "type": "string",
      "description": "Customer full name"
    }
  }
}
```

#### API Changes
```typescript
// POST /api/admin/notification-events/[eventKey]/validate-payload
// - Validate payload against schema
// - Return validation errors

// GET /api/admin/notification-events/[eventKey]/schema
// - Get variable schema
// - Get example payload
```

#### UI Changes
```typescript
// Create/Edit Dialog - New Tab: "Variables"
- JSON Schema editor (Monaco Editor)
- Required variables list (multi-select)
- Optional variables list
- Example payload editor
- Test payload validation
- Developer notes textarea

// View Dialog:
- Show variable schema
- Show example payload
- Copy code examples
```

---

### 1.3 Dynamic Event Categories

#### Database Changes
```prisma
model EventCategory {
  id          String   @id @default(cuid())
  code        String   @unique // 'ORDER', 'KYC', 'PAYMENT'
  name        String   // "Order Management"
  description String?
  
  // Visual
  icon        String?  // 'ShoppingCart', 'Shield', 'CreditCard'
  color       String?  // '#3B82F6', '#10B981'
  
  // Hierarchy (optional)
  parentId    String?
  parent      EventCategory? @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children    EventCategory[] @relation("CategoryHierarchy")
  
  // Settings
  isSystem    Boolean  @default(false) // System categories cannot be deleted
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  
  // Relations
  events      NotificationEvent[]
  
  // Audit
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String?
  
  @@index([code])
  @@index([parentId])
  @@index([isActive])
}

model NotificationEvent {
  // ... existing fields
  
  // Replace enum with relation
  categoryId  String?
  category    EventCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  
  // Deprecated
  // category    EventCategory // Remove enum
}
```

#### Migration Strategy
```typescript
// 1. Create EventCategory table
// 2. Seed with existing categories (ORDER, KYC, etc.)
// 3. Migrate NotificationEvent.category to categoryId
// 4. Remove old enum field
```

#### API Endpoints
```typescript
// GET /api/admin/event-categories
// - List all categories
// - Include event count
// - Support hierarchy

// POST /api/admin/event-categories
// - Create new category
// - Validate unique code
// - SUPER_ADMIN only

// PATCH /api/admin/event-categories/[id]
// - Update category
// - Cannot modify system categories

// DELETE /api/admin/event-categories/[id]
// - Delete category
// - Check if used by events
// - Cannot delete system categories
```

#### UI Components
```typescript
// New Page: /admin/event-categories
- List categories (tree view if hierarchy)
- Create/Edit dialog
- Color picker
- Icon selector (Lucide icons)
- Delete with confirmation

// Notification Events Page:
- Replace category enum with Select
- Fetch categories from API
- Show category icon + color
- Filter by category
```

---

## 📋 Phase 2: Важные функции (Should Have)

### 2.1 Sending Conditions (Rules Engine)

#### Database Changes
```prisma
model NotificationEvent {
  // ... existing fields
  
  // Conditions
  conditions      Json?     // Rule engine JSON
  targetAudience  String[]  // ['ALL', 'ADMIN', 'USER', 'VIP']
  
  // Rate limiting
  maxPerUser      Int?      // Max notifications per user per day
  maxPerHour      Int?      // Global rate limit
  cooldownMinutes Int?      // Min time between same event for same user
  
  // Time restrictions
  quietHoursStart String?   // "22:00"
  quietHoursEnd   String?   // "08:00"
  allowedDays     String[]  // ['MON', 'TUE', 'WED', 'THU', 'FRI']
}
```

#### Conditions JSON Example
```json
{
  "operator": "AND",
  "rules": [
    {
      "field": "user.role",
      "operator": "in",
      "value": ["ADMIN", "SUPER_ADMIN"]
    },
    {
      "field": "order.amount",
      "operator": "gte",
      "value": 1000
    },
    {
      "operator": "OR",
      "rules": [
        {
          "field": "user.country",
          "operator": "eq",
          "value": "PL"
        },
        {
          "field": "user.isVip",
          "operator": "eq",
          "value": true
        }
      ]
    }
  ]
}
```

#### Service Layer
```typescript
// src/lib/services/notification-rules.service.ts
class NotificationRulesService {
  async evaluateConditions(
    event: NotificationEvent,
    payload: any,
    user?: User
  ): Promise<boolean> {
    // Evaluate JSON rules
    // Check rate limits
    // Check quiet hours
    // Check allowed days
  }
  
  async checkRateLimit(
    eventKey: string,
    userId: string
  ): Promise<boolean> {
    // Check if user exceeded rate limit
  }
}
```

---

### 2.2 Retry Policy Configuration

#### Database Changes
```prisma
model NotificationEvent {
  // ... existing fields
  
  // Retry configuration
  maxRetries        Int @default(3)
  retryDelayMinutes Int @default(5)
  retryBackoff      String @default('EXPONENTIAL') // LINEAR, EXPONENTIAL, FIXED
  
  // Fallback
  fallbackChannels  NotificationChannel[] // If primary fails
  
  // Timeout
  timeoutSeconds    Int @default(30)
}
```

#### Service Layer
```typescript
// src/lib/services/notification-retry.service.ts
class NotificationRetryService {
  calculateNextRetry(
    attempt: number,
    strategy: 'LINEAR' | 'EXPONENTIAL' | 'FIXED',
    baseDelay: number
  ): Date {
    // LINEAR: 5, 10, 15 minutes
    // EXPONENTIAL: 5, 10, 20, 40 minutes
    // FIXED: 5, 5, 5 minutes
  }
  
  async retryFailed(queueId: string): Promise<void> {
    // Retry failed notification
    // Try fallback channels if needed
  }
}
```

---

### 2.3 Event Tags

#### Database Changes
```prisma
model EventTag {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  description String?
  color       String?  // '#3B82F6'
  
  events      NotificationEvent[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model NotificationEvent {
  // ... existing fields
  tags EventTag[]
}
```

#### API Endpoints
```typescript
// GET /api/admin/event-tags
// POST /api/admin/event-tags
// PATCH /api/admin/event-tags/[id]
// DELETE /api/admin/event-tags/[id]
```

---

## 📋 Phase 3: Дополнительные функции (Nice to Have)

### 3.1 A/B Testing

#### Database Changes
```prisma
model NotificationEventVariant {
  id          String   @id @default(cuid())
  eventId     String
  event       NotificationEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  name        String   // "Variant A", "Variant B"
  description String?
  weight      Int      // 50 (50% traffic)
  
  // Override settings
  subject     String?
  templateId  String?
  channels    NotificationChannel[]
  
  // Metrics
  sentCount   Int @default(0)
  deliveredCount Int @default(0)
  openCount   Int @default(0)
  clickCount  Int @default(0)
  
  openRate    Float?   // Calculated
  clickRate   Float?   // Calculated
  
  isActive    Boolean @default(true)
  isWinner    Boolean @default(false)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

### 3.2 Localization (i18n)

#### Database Changes
```prisma
model NotificationEventTranslation {
  id          String   @id @default(cuid())
  eventId     String
  event       NotificationEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  locale      String   // 'en', 'ru', 'pl', 'uk'
  name        String
  description String?
  
  // Template per locale
  templateId  String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([eventId, locale])
  @@index([locale])
}
```

---

## 🗓️ Implementation Timeline

### Week 1: Phase 1.1 - Template Integration
- [ ] Update schema
- [ ] Create migration
- [ ] Update API endpoints
- [ ] Update UI (template selector)
- [ ] Testing

### Week 2: Phase 1.2 - Variable Schema
- [ ] Update schema
- [ ] Create migration
- [ ] Add JSON Schema editor
- [ ] Payload validation
- [ ] Testing

### Week 3: Phase 1.3 - Dynamic Categories
- [ ] Create EventCategory model
- [ ] Migration + seed
- [ ] Category CRUD API
- [ ] Category management UI
- [ ] Update event creation/editing
- [ ] Testing

### Week 4: Phase 2 - Conditions & Retry
- [ ] Conditions schema
- [ ] Rules engine service
- [ ] Retry policy configuration
- [ ] UI for conditions
- [ ] Testing

### Week 5: Phase 2 - Tags & Polish
- [ ] Event tags model
- [ ] Tags CRUD API
- [ ] Tags UI
- [ ] Final testing
- [ ] Documentation

### Week 6+: Phase 3 (Optional)
- [ ] A/B testing
- [ ] Localization
- [ ] Advanced analytics

---

## 🎯 Success Criteria

### Phase 1 Complete:
- ✅ Events linked to templates with validation
- ✅ Variable schema documented
- ✅ Dynamic categories with CRUD
- ✅ All existing events migrated
- ✅ UI updated and tested

### Phase 2 Complete:
- ✅ Conditions engine working
- ✅ Rate limiting implemented
- ✅ Retry policy configurable
- ✅ Tags system working

### Production Ready:
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Performance optimized
- ✅ Security audit passed
- ✅ User acceptance testing done

---

## 🚀 Ready to Start?

**Рекомендую начать с Phase 1.1 (Template Integration)** - это даст максимальную ценность и улучшит связь между событиями и шаблонами.

**Готов приступить! Начинаем?**

