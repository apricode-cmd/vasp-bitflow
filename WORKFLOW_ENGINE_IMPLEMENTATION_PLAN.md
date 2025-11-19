# 🔧 Dynamic Compliance Workflow Builder - Implementation Plan

**Feature:** Visual "No-Code" rule engine for compliance automation  
**Date:** November 19, 2025  
**Status:** 📋 Planning

---

## 🎯 Overview

Build a visual workflow builder using `@xyflow/react` that allows admins to create compliance rules without code changes. Rules are stored as both visual graphs (for UI) and executable logic (for backend).

### Use Cases
- **PayIn/PayOut Risk Assessment:** Auto-freeze transactions > €10,000
- **KYC Triggers:** Require Enhanced Due Diligence for high-risk countries
- **Document Requirements:** Request Source of Funds for large orders
- **Approval Workflows:** Multi-level approval chains based on amount/risk

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN UI (React Flow)                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Trigger  │ -> │Condition │ -> │  Action  │              │
│  │  Node    │    │   Node   │    │   Node   │              │
│  └──────────┘    └──────────┘    └──────────┘              │
│         │                                                     │
│         └─ Save: { nodes[], edges[] } + json-logic          │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Workflow DB   │
                    │  - UI State     │
                    │  - Logic State  │
                    └─────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND EXECUTOR                           │
│                                                               │
│  WorkflowEngine.execute(context, workflow)                   │
│    → Parse json-logic                                        │
│    → Evaluate conditions                                     │
│    → Return actions                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Changes

### New Models

```prisma
// prisma/schema.prisma

enum WorkflowTrigger {
  ORDER_CREATED
  PAYIN_RECEIVED
  PAYOUT_REQUESTED
  KYC_SUBMITTED
  USER_REGISTERED
  WALLET_ADDED
  AMOUNT_THRESHOLD
}

enum WorkflowStatus {
  DRAFT
  ACTIVE
  PAUSED
  ARCHIVED
}

enum WorkflowActionType {
  FREEZE_ORDER
  REJECT_TRANSACTION
  REQUEST_DOCUMENT
  REQUIRE_APPROVAL
  SEND_NOTIFICATION
  FLAG_FOR_REVIEW
  AUTO_APPROVE
  ESCALATE_TO_COMPLIANCE
}

model Workflow {
  id          String   @id @default(cuid())
  name        String
  description String?
  
  // Trigger configuration
  trigger     WorkflowTrigger
  triggerConfig Json?  // Additional trigger params
  
  // Dual storage strategy
  visualState Json     // { nodes: [], edges: [] } for React Flow
  logicState  Json     // Compiled json-logic for execution
  
  // Metadata
  status      WorkflowStatus @default(DRAFT)
  priority    Int            @default(0)  // Higher = runs first
  isActive    Boolean        @default(false)
  
  // Version control
  version     Int            @default(1)
  parentId    String?        // For versioning
  parent      Workflow?      @relation("WorkflowVersions", fields: [parentId], references: [id])
  versions    Workflow[]     @relation("WorkflowVersions")
  
  // Audit
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  createdBy   String
  creator     Admin          @relation("WorkflowCreator", fields: [createdBy], references: [id])
  updatedBy   String?
  updater     Admin?         @relation("WorkflowUpdater", fields: [updatedBy], references: [id])
  
  // Stats
  executionCount Int          @default(0)
  lastExecutedAt DateTime?
  
  // Execution logs
  executions  WorkflowExecution[]
  
  @@index([trigger, isActive])
  @@index([status, isActive])
  @@index([createdBy])
}

model WorkflowExecution {
  id          String   @id @default(cuid())
  workflowId  String
  workflow    Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  
  // Context
  trigger     WorkflowTrigger
  contextData Json     // The data that triggered the workflow (order, payIn, etc.)
  
  // Result
  success     Boolean
  result      Json     // Actions returned by workflow
  error       String?
  
  // Performance
  executionTimeMs Int
  
  // Audit
  executedAt  DateTime @default(now())
  entityType  String?  // 'Order', 'PayIn', 'KYC', etc.
  entityId    String?  // Related entity ID
  
  @@index([workflowId, executedAt])
  @@index([trigger, executedAt])
  @@index([entityType, entityId])
}
```

---

## 🎨 Frontend Structure

### File Organization

```
src/app/(admin)/admin/workflows/
├── page.tsx                          # List of all workflows
├── [id]/
│   ├── page.tsx                      # Workflow editor (React Flow)
│   └── _components/
│       ├── WorkflowCanvas.tsx        # Main React Flow canvas
│       ├── WorkflowToolbar.tsx       # Top toolbar (Save, Test, Publish)
│       ├── NodePalette.tsx           # Left sidebar (drag nodes from here)
│       ├── PropertiesPanel.tsx       # Right sidebar (edit selected node)
│       └── nodes/
│           ├── TriggerNode.tsx       # Starting point node
│           ├── ConditionNode.tsx     # Logic condition with True/False handles
│           ├── ActionNode.tsx        # End action node
│           └── index.ts              # Export all node types
├── create/
│   └── page.tsx                      # Create new workflow
└── _components/
    ├── WorkflowCard.tsx              # Workflow list card
    ├── WorkflowFilters.tsx           # Filter by trigger/status
    ├── WorkflowTestDialog.tsx        # Test workflow with sample data
    └── WorkflowVersionHistory.tsx    # Version history viewer

src/components/workflows/
├── compiler/
│   └── graphToJsonLogic.ts           # Compile nodes/edges -> json-logic
├── executor/
│   └── WorkflowExecutor.ts           # Frontend preview executor
└── validation/
    └── validateWorkflowGraph.ts      # Validate graph before save
```

---

## 🔌 API Endpoints

### Workflow Management

```typescript
// GET /api/admin/workflows
// List all workflows with filters
{
  trigger?: WorkflowTrigger;
  status?: WorkflowStatus;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// POST /api/admin/workflows
// Create new workflow
{
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  visualState: { nodes: Node[], edges: Edge[] };
  logicState: JsonLogic; // Auto-compiled from visualState
}

// GET /api/admin/workflows/[id]
// Get workflow details

// PATCH /api/admin/workflows/[id]
// Update workflow
{
  name?: string;
  visualState?: { nodes: Node[], edges: Edge[] };
  logicState?: JsonLogic;
  status?: WorkflowStatus;
  isActive?: boolean;
}

// POST /api/admin/workflows/[id]/test
// Test workflow with sample data
{
  contextData: any; // Sample Order/PayIn/KYC data
}

// POST /api/admin/workflows/[id]/publish
// Publish workflow (DRAFT -> ACTIVE)

// GET /api/admin/workflows/[id]/executions
// Get execution history

// DELETE /api/admin/workflows/[id]
// Archive workflow (soft delete)
```

### Execution Endpoints

```typescript
// POST /api/workflows/execute
// Execute workflows for a given trigger (internal use)
{
  trigger: WorkflowTrigger;
  contextData: any;
}
```

---

## 🧩 Custom Node Types

### 1. Trigger Node

**Purpose:** Entry point of workflow  
**Handles:** 1 output (Source)

```typescript
interface TriggerNodeData {
  trigger: WorkflowTrigger;
  config?: {
    // E.g., for AMOUNT_THRESHOLD:
    threshold?: number;
    currency?: string;
  };
}
```

**UI:**
- Badge with trigger type
- Icon (Zap, DollarSign, FileCheck, etc.)
- Config panel in PropertiesPanel

---

### 2. Condition Node

**Purpose:** Logic branching  
**Handles:** 1 input, 2 outputs (True/False)

```typescript
interface ConditionNodeData {
  field: string;          // e.g., 'amount', 'country', 'kycStatus'
  operator: Operator;     // '>', '<', '==', '!=', 'in', 'contains'
  value: any;             // Comparison value
  label?: string;         // Display label
}

enum Operator {
  EQUAL = '==',
  NOT_EQUAL = '!=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_EQUAL = '>=',
  LESS_EQUAL = '<=',
  IN = 'in',              // Array membership
  NOT_IN = 'not_in',
  CONTAINS = 'contains',  // String contains
  MATCHES = 'matches',    // Regex match
}
```

**UI (shadcn/ui):**
- Card with 3 inputs:
  - Select (Field): order.amount, user.country, kyc.status
  - Select (Operator): >, <, ==, in
  - Input/Select (Value): depends on field type
- Visual handles: Green (True), Red (False)

---

### 3. Action Node

**Purpose:** End result/action to take  
**Handles:** 1 input (Target)

```typescript
interface ActionNodeData {
  actionType: WorkflowActionType;
  config: {
    // For FREEZE_ORDER:
    reason?: string;
    
    // For REQUEST_DOCUMENT:
    documentType?: string;
    message?: string;
    
    // For SEND_NOTIFICATION:
    recipientRole?: string;
    template?: string;
    
    // For REQUIRE_APPROVAL:
    approverRole?: string;
    minApprovals?: number;
  };
}
```

**UI:**
- Badge with action type
- Icon based on action (Ban, FileText, Bell, UserCheck)
- Config form in PropertiesPanel

---

## 🔨 Implementation Phases

### Phase 1: Database & Backend (Week 1)

**Tasks:**
1. ✅ Add `Workflow` and `WorkflowExecution` models to schema
2. ✅ Run migration: `npx prisma migrate dev --name add_workflow_engine`
3. ✅ Create CRUD API routes (`/api/admin/workflows`)
4. ✅ Implement `WorkflowExecutor` service
5. ✅ Install `json-logic-js` package
6. ✅ Write unit tests for executor

**Files to Create:**
- `prisma/migrations/XXX_add_workflow_engine/migration.sql`
- `src/lib/services/workflow-executor.service.ts`
- `src/lib/validations/workflow.ts`
- `src/app/api/admin/workflows/route.ts`
- `src/app/api/admin/workflows/[id]/route.ts`
- `src/app/api/admin/workflows/[id]/test/route.ts`
- `src/app/api/admin/workflows/[id]/publish/route.ts`
- `src/app/api/admin/workflows/[id]/executions/route.ts`

---

### Phase 2: React Flow UI (Week 2)

**Tasks:**
1. ✅ Install `@xyflow/react` and `json-logic-js`
2. ✅ Create custom nodes (Trigger, Condition, Action)
3. ✅ Build workflow canvas with drag-and-drop
4. ✅ Implement node palette (left sidebar)
5. ✅ Implement properties panel (right sidebar)
6. ✅ Add Save/Publish/Test buttons
7. ✅ Style with shadcn/ui components

**Files to Create:**
- `src/app/(admin)/admin/workflows/page.tsx`
- `src/app/(admin)/admin/workflows/[id]/page.tsx`
- `src/app/(admin)/admin/workflows/[id]/_components/WorkflowCanvas.tsx`
- `src/app/(admin)/admin/workflows/[id]/_components/nodes/TriggerNode.tsx`
- `src/app/(admin)/admin/workflows/[id]/_components/nodes/ConditionNode.tsx`
- `src/app/(admin)/admin/workflows/[id]/_components/nodes/ActionNode.tsx`
- `src/app/(admin)/admin/workflows/[id]/_components/NodePalette.tsx`
- `src/app/(admin)/admin/workflows/[id]/_components/PropertiesPanel.tsx`
- `src/app/(admin)/admin/workflows/[id]/_components/WorkflowToolbar.tsx`

**Package Installation:**
```bash
npm install @xyflow/react json-logic-js
npm install --save-dev @types/json-logic-js
```

---

### Phase 3: Compiler & Validation (Week 3)

**Tasks:**
1. ✅ Implement graph → json-logic compiler
2. ✅ Add validation (no loops, all nodes connected, etc.)
3. ✅ Add visual error indicators
4. ✅ Test mode (run workflow with sample data)
5. ✅ Version history tracking

**Files to Create:**
- `src/lib/workflows/compiler/graphToJsonLogic.ts`
- `src/lib/workflows/validation/validateWorkflowGraph.ts`
- `src/app/(admin)/admin/workflows/_components/WorkflowTestDialog.tsx`
- `src/app/(admin)/admin/workflows/_components/WorkflowVersionHistory.tsx`

**Algorithm Example (Compiler):**
```typescript
// Input: nodes + edges
// Output: json-logic

function compileWorkflow(nodes: Node[], edges: Edge[]): JsonLogic {
  const triggerNode = findTriggerNode(nodes);
  
  function traverseNode(nodeId: string): any {
    const node = nodes.find(n => n.id === nodeId);
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    
    if (node.type === 'condition') {
      const trueEdge = outgoingEdges.find(e => e.sourceHandle === 'true');
      const falseEdge = outgoingEdges.find(e => e.sourceHandle === 'false');
      
      return {
        "if": [
          { [node.data.operator]: [
              { "var": node.data.field },
              node.data.value
            ]
          },
          trueEdge ? traverseNode(trueEdge.target) : null,
          falseEdge ? traverseNode(falseEdge.target) : null
        ]
      };
    }
    
    if (node.type === 'action') {
      return {
        action: node.data.actionType,
        config: node.data.config
      };
    }
  }
  
  return traverseNode(triggerNode.id);
}
```

---

### Phase 4: Integration with Existing Systems (Week 4)

**Tasks:**
1. ✅ Hook into Order creation flow
2. ✅ Hook into PayIn received flow
3. ✅ Hook into PayOut request flow
4. ✅ Hook into KYC submission flow
5. ✅ Add workflow results to audit logs
6. ✅ Create admin UI to view execution history

**Integration Points:**

**A. Order Creation** (`src/app/api/orders/route.ts`)
```typescript
// After validation, before saving:
const workflowResults = await WorkflowExecutor.execute({
  trigger: 'ORDER_CREATED',
  contextData: {
    userId: session.user.id,
    amount: validatedData.cryptoAmount,
    fiatAmount: total,
    currency: validatedData.currencyCode,
    fiatCurrency: validatedData.fiatCurrencyCode,
    country: user.profile?.country,
    kycStatus: user.kycSession?.status
  }
});

// Apply actions
if (workflowResults.actions.includes('FREEZE_ORDER')) {
  orderData.status = 'FROZEN';
  orderData.notes = workflowResults.reason;
}
```

**B. PayIn Received** (`src/app/api/admin/pay-in/route.ts`)
```typescript
const workflowResults = await WorkflowExecutor.execute({
  trigger: 'PAYIN_RECEIVED',
  contextData: {
    orderId: validated.orderId,
    amount: validated.receivedAmount,
    currency: order.fiatCurrencyCode,
    senderName: validated.senderName,
    senderCountry: validated.senderCountry,
    // ...
  }
});
```

**C. PayOut Request** (`src/app/api/admin/pay-out/route.ts`)
```typescript
const workflowResults = await WorkflowExecutor.execute({
  trigger: 'PAYOUT_REQUESTED',
  contextData: {
    amount: validated.amount,
    currency: order.currencyCode,
    destinationAddress: validated.destinationAddress,
    userId: order.userId,
    // ...
  }
});

// If flagged, require additional approval
if (workflowResults.actions.includes('REQUIRE_APPROVAL')) {
  payOutData.approvalRequired = true;
  payOutData.requiresStepUpMfa = true;
}
```

---

## 📦 Dependencies

### New Packages

```json
{
  "@xyflow/react": "^12.0.0",
  "json-logic-js": "^2.0.2",
  "@types/json-logic-js": "^2.0.7"
}
```

### Existing (Already in Project)
- `shadcn/ui` components (Card, Select, Input, Badge, etc.)
- `Radix UI` (Dialog, Dropdown, etc.)
- `Prisma` ORM
- `Zod` validation
- `Next.js 14` App Router

---

## 🧪 Testing Strategy

### Unit Tests
- `workflow-executor.service.test.ts` - Test logic execution
- `graphToJsonLogic.test.ts` - Test compiler accuracy
- `validateWorkflowGraph.test.ts` - Test validation rules

### Integration Tests
- Create workflow via API
- Execute workflow with sample data
- Verify actions are applied correctly

### E2E Tests (Playwright)
- Create workflow in UI
- Connect nodes
- Save and publish
- Verify execution in order flow

---

## 🔒 Security Considerations

1. **Admin-Only Access:**
   - Workflow creation/editing restricted to `SUPER_ADMIN` and `COMPLIANCE` roles
   - Step-up MFA required for publishing workflows

2. **Execution Safety:**
   - Timeout limit (5 seconds per workflow)
   - Max recursion depth (10 levels)
   - Sandboxed execution (no external code)
   - Rate limiting (max 100 workflows per entity)

3. **Audit Trail:**
   - All workflow changes logged
   - Execution history preserved
   - Version control for rollback

4. **Input Validation:**
   - Validate all workflow configs with Zod
   - Sanitize field names to prevent injection
   - Whitelist allowed fields/operators

---

## 📈 Performance Optimization

1. **Caching:**
   - Cache active workflows in Redis (30 min TTL)
   - Invalidate on workflow update

2. **Lazy Loading:**
   - Load workflow execution history on-demand
   - Paginate execution logs (100 per page)

3. **Async Execution:**
   - Run workflows in background for non-critical triggers
   - Use job queue for heavy operations

4. **Indexing:**
   - Index `Workflow.trigger + isActive`
   - Index `WorkflowExecution.entityType + entityId`

---

## 🎯 Example Workflows

### Example 1: High-Value Order Freeze

**Trigger:** `ORDER_CREATED`

**Logic:**
```
IF order.amount > 10000 EUR
  THEN ACTION: FREEZE_ORDER
       reason: "High-value transaction requires manual review"
ELSE
  IF user.kycStatus != 'APPROVED'
    THEN ACTION: REJECT_TRANSACTION
         reason: "KYC verification required"
  ELSE
    ACTION: AUTO_APPROVE
```

**Visual:**
```
[Trigger: Order Created]
        │
        ▼
[Condition: Amount > 10000?]
        │          │
       YES        NO
        │          │
        │     [Condition: KYC Approved?]
        │          │          │
        │         YES        NO
        │          │          │
[Freeze Order]  [Auto Approve]  [Reject]
```

---

### Example 2: High-Risk Country Detection

**Trigger:** `KYC_SUBMITTED`

**Logic:**
```
IF user.country IN ['AF', 'IR', 'KP', 'SY']
  THEN ACTION: ESCALATE_TO_COMPLIANCE
       message: "High-risk jurisdiction detected"
  AND ACTION: REQUEST_DOCUMENT
      documentType: "SOURCE_OF_WEALTH"
```

---

## 📋 Checklist

### Phase 1: Database & Backend
- [ ] Add Prisma models
- [ ] Run migration
- [ ] Create API routes
- [ ] Implement WorkflowExecutor service
- [ ] Write unit tests

### Phase 2: React Flow UI
- [ ] Install packages
- [ ] Create custom nodes
- [ ] Build workflow canvas
- [ ] Implement toolbars/sidebars
- [ ] Style with shadcn/ui

### Phase 3: Compiler & Validation
- [ ] Implement compiler
- [ ] Add validation
- [ ] Create test mode
- [ ] Add version history

### Phase 4: Integration
- [ ] Hook into Order flow
- [ ] Hook into PayIn flow
- [ ] Hook into PayOut flow
- [ ] Hook into KYC flow
- [ ] Add audit logging

---

## 🚀 Deployment Checklist

- [ ] Environment variables (if needed)
- [ ] Database migration in production
- [ ] Feature flag (enable gradually)
- [ ] Monitor execution performance
- [ ] Train admins on workflow builder
- [ ] Create workflow templates
- [ ] Documentation update

---

## 📚 Resources

- [React Flow Documentation](https://reactflow.dev/)
- [json-logic-js GitHub](https://github.com/jwadhams/json-logic-js)
- [Shadcn/ui Components](https://ui.shadcn.com/)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

**Next Step:** Start with Phase 1 - Database schema and backend implementation.


