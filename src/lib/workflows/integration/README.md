# Workflow Integration Guide

## Overview

This directory contains integration points for the Workflow Engine to trigger workflows when events occur in the system.

## Integration Points

### 1. Order Created

**File:** `src/app/api/orders/route.ts` (POST handler)

**Add after order creation:**

```typescript
import { triggerWorkflows } from '@/lib/workflows/integration/workflowTrigger';
import { executeActions } from '@/lib/workflows/integration/actionHandler';

// After creating order
const order = await prisma.order.create({ ... });

// Trigger workflows
const actions = await triggerWorkflows('ORDER_CREATED', {
  orderId: order.id,
  amount: order.amount,
  currency: order.currency,
  userId: order.userId,
  // ... other order fields
});

// Execute actions
if (actions.length > 0) {
  await executeActions(actions, 'Order', order.id);
}
```

### 2. PayIn Received

**File:** `src/lib/services/payin.service.ts` (or webhook handler)

**Add after PayIn confirmation:**

```typescript
import { triggerWorkflows } from '@/lib/workflows/integration/workflowTrigger';
import { executeActions } from '@/lib/workflows/integration/actionHandler';

// After confirming PayIn
const payIn = await prisma.payIn.update({ 
  where: { id: payInId },
  data: { status: 'CONFIRMED' }
});

// Trigger workflows
const actions = await triggerWorkflows('PAYIN_RECEIVED', {
  payInId: payIn.id,
  orderId: payIn.orderId,
  amount: payIn.amount,
  currency: payIn.currency,
  userId: payIn.order.userId,
  // ... other payIn fields
});

// Execute actions
if (actions.length > 0) {
  await executeActions(actions, 'PayIn', payIn.id);
}
```

### 3. PayOut Requested

**File:** `src/app/api/payouts/route.ts` (POST handler)

**Add after payout request creation:**

```typescript
import { triggerWorkflows } from '@/lib/workflows/integration/workflowTrigger';
import { executeActions } from '@/lib/workflows/integration/actionHandler';

// After creating PayOut request
const payOut = await prisma.payOut.create({ ... });

// Trigger workflows
const actions = await triggerWorkflows('PAYOUT_REQUESTED', {
  payOutId: payOut.id,
  amount: payOut.amount,
  currency: payOut.currency,
  userId: payOut.userId,
  walletAddress: payOut.walletAddress,
  // ... other payOut fields
});

// Execute actions
if (actions.length > 0) {
  await executeActions(actions, 'PayOut', payOut.id);
}
```

### 4. KYC Submitted

**File:** `src/app/api/kyc/submit/route.ts` (POST handler)

**Add after KYC submission:**

```typescript
import { triggerWorkflows } from '@/lib/workflows/integration/workflowTrigger';
import { executeActions } from '@/lib/workflows/integration/actionHandler';

// After submitting KYC
const kycSession = await prisma.kycSession.update({
  where: { id: sessionId },
  data: { status: 'PENDING' }
});

// Trigger workflows
const actions = await triggerWorkflows('KYC_SUBMITTED', {
  kycSessionId: kycSession.id,
  userId: kycSession.userId,
  country: kycSession.formData.country,
  documentType: kycSession.formData.documentType,
  // ... other KYC fields
});

// Execute actions
if (actions.length > 0) {
  await executeActions(actions, 'KYC', kycSession.id);
}
```

### 5. User Registered

**File:** `src/app/api/auth/register/route.ts` (POST handler)

**Add after user registration:**

```typescript
import { triggerWorkflows } from '@/lib/workflows/integration/workflowTrigger';
import { executeActions } from '@/lib/workflows/integration/actionHandler';

// After creating user
const user = await prisma.user.create({ ... });

// Trigger workflows
const actions = await triggerWorkflows('USER_REGISTERED', {
  userId: user.id,
  email: user.email,
  country: user.profile?.country,
  // ... other user fields
});

// Execute actions
if (actions.length > 0) {
  await executeActions(actions, 'User', user.id);
}
```

## Context Data Structure

Each trigger should provide relevant context data:

### ORDER_CREATED
```typescript
{
  orderId: string;
  amount: number;
  currency: string;
  userId: string;
  cryptoType: string;
  rate: number;
  totalAmount: number;
}
```

### PAYIN_RECEIVED
```typescript
{
  payInId: string;
  orderId: string;
  amount: number;
  currency: string;
  userId: string;
  method: string;
}
```

### PAYOUT_REQUESTED
```typescript
{
  payOutId: string;
  amount: number;
  currency: string;
  userId: string;
  walletAddress: string;
  cryptoType: string;
}
```

### KYC_SUBMITTED
```typescript
{
  kycSessionId: string;
  userId: string;
  country: string;
  documentType: string;
  provider: string;
}
```

## Action Types

The following actions can be executed by workflows:

- **FREEZE_ORDER**: Freeze order processing
- **REJECT_TRANSACTION**: Reject order/payout
- **REQUEST_DOCUMENT**: Request additional documents
- **REQUIRE_APPROVAL**: Mark for manual approval
- **SEND_NOTIFICATION**: Send notification to user/admin
- **FLAG_FOR_REVIEW**: Create review task
- **AUTO_APPROVE**: Automatically approve
- **ESCALATE_TO_COMPLIANCE**: Escalate to compliance team

## Error Handling

All workflow triggers are wrapped in try-catch blocks. If a workflow fails:
1. Error is logged to console
2. Failed execution is recorded in DB
3. Main flow continues (non-blocking)

## Performance

- Workflows execute sequentially by priority
- Each execution is logged with timing metrics
- Failed workflows don't block other workflows
- All DB operations use transactions where needed

