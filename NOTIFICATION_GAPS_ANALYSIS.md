# 🚨 Notification System - Gap Analysis

**Дата:** 2025-01-16  
**Критичность:** ❌ **HIGH** - KYC уведомления НЕ работают!

---

## 📊 Executive Summary

### ❌ Критические проблемы найдены:

1. **KYC уведомления НЕ отправляются** (APPROVED/REJECTED)
2. **Webhook KYC не отправляет уведомления**
3. **Отсутствуют уведомления для некоторых Order статусов**
4. **PASSWORD_RESET не реализован**
5. **EMAIL_VERIFICATION не реализован**

---

## 🔍 Detailed Analysis

### 1. KYC Notifications (❌ CRITICAL)

#### ❌ Problem: KYC APPROVED/REJECTED не отправляются

**Код с проблемой:**
```typescript
// src/app/api/admin/kyc/[id]/route.ts:151
const kycSession = await prisma.kycSession.update({
  where: { id },
  data: {
    status,
    rejectionReason: status === 'REJECTED' ? rejectionReason : null,
    reviewedAt: new Date(),
  },
  include: {
    user: {
      select: {
        email: true,
      },
    },
  },
});

// Revalidate cache...
revalidatePath('/admin/kyc');
// ...

// ❌ TODO: Send email notification to user
// ^^^^ ЭТО НЕ РЕАЛИЗОВАНО!

return NextResponse.json({
  success: true,
  data: kycSession,
});
```

**Impact:**
- 🚫 Пользователи НЕ получают email когда KYC одобрен
- 🚫 Пользователи НЕ получают email когда KYC отклонен
- 🚫 Нет IN_APP уведомлений

**Fix Required:**
```typescript
// ✅ ДОБАВИТЬ после update:
if (status === 'APPROVED') {
  await eventEmitter.emit('KYC_APPROVED', {
    userId: kycSession.userId,
    recipientEmail: kycSession.user.email,
  });
} else if (status === 'REJECTED') {
  await eventEmitter.emit('KYC_REJECTED', {
    userId: kycSession.userId,
    recipientEmail: kycSession.user.email,
    reason: rejectionReason,
  });
}
```

---

#### ❌ Problem: KYC Webhook не отправляет уведомления

**Код с проблемой:**
```typescript
// src/lib/services/kyc.service.ts:776-779
console.log(`✅ KYC session updated via webhook: ${updatedSession.status}`);

// ❌ TODO: Send email notification to user
// ❌ TODO: Trigger any post-approval actions

return {
  success: true,
  status: updatedSession.status,
  sessionId: updatedSession.id
};
```

**Impact:**
- 🚫 Когда KYC provider (KYCAID, Sumsub) approve/reject через webhook → пользователь НЕ получает уведомление

**Fix Required:**
```typescript
// ✅ ДОБАВИТЬ после update:
const user = await prisma.user.findUnique({
  where: { id: updatedSession.userId },
  select: { email: true }
});

if (updatedSession.status === 'APPROVED') {
  await eventEmitter.emit('KYC_APPROVED', {
    userId: updatedSession.userId,
    recipientEmail: user?.email,
  });
} else if (updatedSession.status === 'REJECTED') {
  await eventEmitter.emit('KYC_REJECTED', {
    userId: updatedSession.userId,
    recipientEmail: user?.email,
    reason: updatedSession.rejectionReason,
  });
}
```

---

### 2. Order Status Notifications

#### ✅ What's Working

| Order Status | Notification Event | Implementation |
|--------------|-------------------|----------------|
| `PENDING` | ❌ None | ✅ OK (initial state, no notification needed) |
| `PAYMENT_PENDING` | ✅ ORDER_PAYMENT_RECEIVED | ✅ `/api/admin/orders/[id]` line 350 |
| `PAYMENT_RECEIVED` | ✅ ORDER_PAYMENT_RECEIVED | ✅ `/api/admin/orders/[id]` line 351 |
| `COMPLETED` | ✅ ORDER_COMPLETED | ✅ `/api/admin/orders/[id]` line 352 |
| `CANCELLED` | ✅ ORDER_CANCELLED | ✅ `/api/admin/orders/[id]` line 353 |
| `REFUNDED` | ✅ ORDER_REFUNDED | ✅ `/api/admin/orders/[id]` line 354 |

#### ❌ Missing Notifications

| Order Status | Expected Event | Current Status |
|--------------|----------------|----------------|
| `PROCESSING` | ORDER_PROCESSING | ❌ **MISSING** |
| `EXPIRED` | ORDER_EXPIRED | ❌ **MISSING** |
| `FAILED` | ORDER_FAILED | ❌ **MISSING** |

**Code to fix:**
```typescript
// src/app/api/admin/orders/[id]/route.ts:349
const eventKeyMap: Record<string, string> = {
  'PAYMENT_PENDING': 'ORDER_PAYMENT_RECEIVED',
  'PAYMENT_RECEIVED': 'ORDER_PAYMENT_RECEIVED',
  'PROCESSING': 'ORDER_PROCESSING',        // ❌ ДОБАВИТЬ
  'COMPLETED': 'ORDER_COMPLETED',
  'CANCELLED': 'ORDER_CANCELLED',
  'EXPIRED': 'ORDER_EXPIRED',              // ❌ ДОБАВИТЬ
  'REFUNDED': 'ORDER_REFUNDED',
  'FAILED': 'ORDER_FAILED'                 // ❌ ДОБАВИТЬ
};
```

---

### 3. KYC Status Coverage

| KYC Status | Expected Event | Current Status |
|------------|----------------|----------------|
| `PENDING` | ❌ None | ✅ OK (waiting for review) |
| `APPROVED` | KYC_APPROVED | ❌ **NOT IMPLEMENTED** |
| `REJECTED` | KYC_REJECTED | ❌ **NOT IMPLEMENTED** |
| `EXPIRED` | KYC_EXPIRED | ❌ **MISSING EVENT** |

---

### 4. Security Events

#### ✅ Working

| Event | Implementation | Status |
|-------|----------------|--------|
| `SECURITY_2FA_ENABLED` | `/api/2fa/verify` line 69 | ✅ OK |
| `SECURITY_2FA_DISABLED` | `/api/2fa/disable` line 75 | ✅ OK |

#### ❌ Missing

| Event | Expected Location | Status |
|-------|------------------|--------|
| `SECURITY_LOGIN` | After successful login | ❌ **MISSING** |
| `SECURITY_PASSWORD_CHANGED` | Password change API | ❌ **MISSING** |
| `SECURITY_SUSPICIOUS_ACTIVITY` | Login anomaly detection | ❌ **MISSING** |

---

### 5. User Events

#### ✅ Working

| Event | Implementation | Status |
|-------|----------------|--------|
| `WELCOME_EMAIL` | `/api/auth/register` line 104 | ✅ OK |

#### ❌ Missing

| Event | Expected Location | Status |
|-------|------------------|--------|
| `PASSWORD_RESET` | Password reset request | ❌ **NOT IMPLEMENTED** |
| `EMAIL_VERIFICATION` | Email verification flow | ❌ **NOT IMPLEMENTED** |

---

### 6. Payment Events

| Event | Expected Trigger | Status |
|-------|-----------------|--------|
| `PAYMENT_PENDING` | When PayIn created | ❌ **MISSING** |
| `PAYMENT_CONFIRMED` | When PayIn verified | ❌ **MISSING** |
| `PAYMENT_FAILED` | When PayIn failed | ❌ **MISSING** |

---

## 📋 Coverage Matrix

### Events in Database vs Implementation

| Event Key | In DB | In Code | Email Template | Status |
|-----------|-------|---------|----------------|--------|
| **ORDER EVENTS** |
| ORDER_CREATED | ✅ | ✅ | ✅ | ✅ **WORKING** |
| ORDER_PAYMENT_RECEIVED | ✅ | ✅ | ✅ | ✅ **WORKING** |
| ORDER_PROCESSING | ✅ | ❌ | ✅ | ⚠️ **NOT CONNECTED** |
| ORDER_COMPLETED | ✅ | ✅ | ✅ | ✅ **WORKING** |
| ORDER_CANCELLED | ✅ | ✅ | ✅ | ✅ **WORKING** |
| ORDER_EXPIRED | ✅ | ❌ | ❌ | ❌ **NOT WORKING** |
| ORDER_FAILED | ❌ | ❌ | ❌ | ❌ **MISSING** |
| **KYC EVENTS** |
| KYC_SUBMITTED | ✅ | ❌ | ✅ | ⚠️ **NOT CONNECTED** |
| KYC_APPROVED | ✅ | ❌ | ✅ | ❌ **NOT WORKING** |
| KYC_REJECTED | ✅ | ❌ | ✅ | ❌ **NOT WORKING** |
| KYC_DOCUMENTS_REQUIRED | ✅ | ❌ | ❌ | ❌ **NOT WORKING** |
| KYC_EXPIRED | ❌ | ❌ | ❌ | ❌ **MISSING** |
| **PAYMENT EVENTS** |
| PAYMENT_PENDING | ✅ | ❌ | ❌ | ❌ **NOT WORKING** |
| PAYMENT_CONFIRMED | ✅ | ❌ | ❌ | ❌ **NOT WORKING** |
| PAYMENT_FAILED | ✅ | ❌ | ❌ | ❌ **NOT WORKING** |
| **SECURITY EVENTS** |
| SECURITY_LOGIN | ✅ | ❌ | ❌ | ❌ **NOT WORKING** |
| SECURITY_PASSWORD_CHANGED | ✅ | ❌ | ❌ | ❌ **NOT WORKING** |
| SECURITY_2FA_ENABLED | ✅ | ✅ | ✅ | ✅ **WORKING** |
| SECURITY_2FA_DISABLED | ✅ | ✅ | ✅ | ✅ **WORKING** |
| SECURITY_SUSPICIOUS_ACTIVITY | ✅ | ❌ | ❌ | ❌ **NOT WORKING** |
| **USER EVENTS** |
| WELCOME_EMAIL | ✅ | ✅ | ✅ | ✅ **WORKING** |
| PASSWORD_RESET | ❌ | ❌ | ❌ | ❌ **MISSING** |
| EMAIL_VERIFICATION | ❌ | ❌ | ❌ | ❌ **MISSING** |
| **ADMIN EVENTS** |
| ADMIN_INVITED | ✅ | ✅ | ✅ | ✅ **WORKING** |
| **SYSTEM EVENTS** |
| SYSTEM_MAINTENANCE | ✅ | ❌ | ❌ | ⚠️ **MANUAL** |

---

## 🎯 Priority Fix List

### 🔴 Priority 1: CRITICAL (Must Fix Before Production)

#### 1. KYC Notifications (30 min)
**Files to modify:**
- `src/app/api/admin/kyc/[id]/route.ts` (line 151)
- `src/lib/services/kyc.service.ts` (line 778)

**Impact:** Пользователи не узнают об одобрении/отклонении KYC!

```typescript
// Fix 1: Admin Manual Review
// src/app/api/admin/kyc/[id]/route.ts:151
if (status === 'APPROVED') {
  await eventEmitter.emit('KYC_APPROVED', {
    userId: kycSession.userId,
    recipientEmail: kycSession.user.email,
  });
} else if (status === 'REJECTED') {
  await eventEmitter.emit('KYC_REJECTED', {
    userId: kycSession.userId,
    recipientEmail: kycSession.user.email,
    reason: rejectionReason,
  });
}

// Fix 2: Webhook Processing
// src/lib/services/kyc.service.ts:778
const user = await prisma.user.findUnique({
  where: { id: updatedSession.userId },
  select: { email: true }
});

if (updatedSession.status === 'APPROVED') {
  await eventEmitter.emit('KYC_APPROVED', {
    userId: updatedSession.userId,
    recipientEmail: user?.email,
  });
} else if (updatedSession.status === 'REJECTED') {
  await eventEmitter.emit('KYC_REJECTED', {
    userId: updatedSession.userId,
    recipientEmail: user?.email,
    reason: updatedSession.rejectionReason,
  });
}
```

---

### 🟡 Priority 2: HIGH (Important)

#### 2. Order Status Events (15 min)
**File:** `src/app/api/admin/orders/[id]/route.ts:349`

```typescript
const eventKeyMap: Record<string, string> = {
  'PAYMENT_PENDING': 'ORDER_PAYMENT_RECEIVED',
  'PAYMENT_RECEIVED': 'ORDER_PAYMENT_RECEIVED',
  'PROCESSING': 'ORDER_PROCESSING',        // ADD
  'COMPLETED': 'ORDER_COMPLETED',
  'CANCELLED': 'ORDER_CANCELLED',
  'EXPIRED': 'ORDER_EXPIRED',              // ADD
  'REFUNDED': 'ORDER_REFUNDED',
  'FAILED': 'ORDER_FAILED'                 // ADD
};
```

**Also need:**
- Create email templates for `ORDER_EXPIRED` and `ORDER_FAILED`
- Add events to database seed if missing

---

#### 3. Password Reset Flow (2 hours)
**New files needed:**
- `src/app/api/auth/password-reset/request/route.ts`
- `src/app/api/auth/password-reset/verify/route.ts`
- `src/app/(auth)/password-reset/page.tsx`

**Implementation:**
```typescript
// 1. Request reset
await eventEmitter.emit('PASSWORD_RESET', {
  userId: user.id,
  recipientEmail: user.email,
  resetToken: token,
  resetUrl: `${origin}/password-reset/${token}`
});

// 2. Password changed
await eventEmitter.emit('SECURITY_PASSWORD_CHANGED', {
  userId: user.id,
  recipientEmail: user.email,
  timestamp: new Date().toISOString()
});
```

---

### 🟢 Priority 3: MEDIUM (Nice to Have)

#### 4. Security Login Notifications (1 hour)
**File:** `src/auth-client.ts` or login API

```typescript
// After successful login
await eventEmitter.emit('SECURITY_LOGIN', {
  userId: user.id,
  recipientEmail: user.email,
  location: getGeoFromRequest(request),
  device: request.headers.get('user-agent'),
  ipAddress: request.headers.get('x-forwarded-for'),
  timestamp: new Date().toISOString()
});
```

---

#### 5. Payment Events (2 hours)
**Files:**
- `src/app/api/admin/pay-in/[id]/route.ts`
- When PayIn status changes

```typescript
// When payment verified
if (newStatus === 'VERIFIED') {
  await eventEmitter.emit('PAYMENT_CONFIRMED', {
    userId: payIn.order.userId,
    orderId: payIn.orderId,
    amount: payIn.amount,
    currency: payIn.currency
  });
}
```

---

#### 6. KYC Submitted Event (30 min)
**File:** `src/app/api/kyc/submit-form/route.ts`

```typescript
// After KYC form submitted
await eventEmitter.emit('KYC_SUBMITTED', {
  userId: session.user.id,
  recipientEmail: session.user.email,
  kycSessionId: kycSession.id
});
```

---

## 🔧 Implementation Guide

### Step 1: Fix KYC Notifications (CRITICAL)

```bash
# 1. Edit admin KYC endpoint
vim src/app/api/admin/kyc/[id]/route.ts

# Add after line 141 (kycSession update):
if (status === 'APPROVED') {
  await eventEmitter.emit('KYC_APPROVED', {
    userId: kycSession.userId,
    recipientEmail: kycSession.user.email,
  });
} else if (status === 'REJECTED') {
  await eventEmitter.emit('KYC_REJECTED', {
    userId: kycSession.userId,
    recipientEmail: kycSession.user.email,
    reason: rejectionReason,
  });
}

# 2. Edit KYC service webhook
vim src/lib/services/kyc.service.ts

# Add after line 774 (updatedSession):
const user = await prisma.user.findUnique({
  where: { id: updatedSession.userId },
  select: { email: true }
});

if (updatedSession.status === 'APPROVED') {
  await eventEmitter.emit('KYC_APPROVED', {
    userId: updatedSession.userId,
    recipientEmail: user?.email,
  });
} else if (updatedSession.status === 'REJECTED') {
  await eventEmitter.emit('KYC_REJECTED', {
    userId: updatedSession.userId,
    recipientEmail: user?.email,
    reason: updatedSession.rejectionReason,
  });
}

# 3. Test
npm run dev
# Register user → Submit KYC → Admin approve → Check email
```

---

### Step 2: Fix Order Status Events

```bash
# Edit order update endpoint
vim src/app/api/admin/orders/[id]/route.ts

# Update eventKeyMap at line 349:
const eventKeyMap: Record<string, string> = {
  'PAYMENT_PENDING': 'ORDER_PAYMENT_RECEIVED',
  'PAYMENT_RECEIVED': 'ORDER_PAYMENT_RECEIVED',
  'PROCESSING': 'ORDER_PROCESSING',
  'COMPLETED': 'ORDER_COMPLETED',
  'CANCELLED': 'ORDER_CANCELLED',
  'EXPIRED': 'ORDER_EXPIRED',
  'REFUNDED': 'ORDER_REFUNDED',
  'FAILED': 'ORDER_FAILED'
};
```

---

## 📊 Testing Checklist

### KYC Flow Test
```bash
# 1. Register user
POST /api/auth/register

# 2. Submit KYC
POST /api/kyc/submit-form

# 3. Admin approve KYC
PUT /api/admin/kyc/{id}
{ "status": "APPROVED" }

# ✅ Check: KYC_APPROVED email sent
SELECT * FROM "EmailLog" WHERE template = 'KYC_APPROVED' ORDER BY "createdAt" DESC LIMIT 1;

# 4. Admin reject KYC
PUT /api/admin/kyc/{id}
{ "status": "REJECTED", "rejectionReason": "Invalid documents" }

# ✅ Check: KYC_REJECTED email sent
SELECT * FROM "EmailLog" WHERE template = 'KYC_REJECTED' ORDER BY "createdAt" DESC LIMIT 1;
```

### Order Flow Test
```bash
# 1. Create order
POST /api/orders

# ✅ Check: ORDER_CREATED email sent

# 2. Update to PROCESSING
PATCH /api/admin/orders/{id}
{ "status": "PROCESSING" }

# ✅ Check: ORDER_PROCESSING email sent (after fix)

# 3. Complete order
PATCH /api/admin/orders/{id}
{ "status": "COMPLETED" }

# ✅ Check: ORDER_COMPLETED email sent
```

---

## 📈 Metrics After Fixes

### Before Fixes
```
✅ Working events: 6/20 (30%)
❌ Broken events: 14/20 (70%)
```

### After Priority 1 Fixes
```
✅ Working events: 10/20 (50%)
❌ Broken events: 10/20 (50%)
```

### After Priority 1 + 2 Fixes
```
✅ Working events: 14/20 (70%)
❌ Broken events: 6/20 (30%)
```

### After All Fixes
```
✅ Working events: 20/20 (100%)
❌ Broken events: 0/20 (0%)
```

---

## 🎯 Summary

### Critical Issues (Must Fix):
1. ❌ **KYC APPROVED/REJECTED notifications** → 30 min fix
2. ❌ **KYC Webhook notifications** → 30 min fix
3. ⚠️ **ORDER_PROCESSING/EXPIRED/FAILED events** → 15 min fix

### Total Time to Fix Critical: **~1.5 hours**

### Impact:
- **Before:** Пользователи НЕ получают критические уведомления (KYC status)
- **After:** Все основные уведомления работают ✅

---

## 📞 Next Steps

1. **Immediate:** Fix KYC notifications (Priority 1)
2. **This Week:** Fix Order events (Priority 2)
3. **Next Sprint:** Implement Password Reset (Priority 3)

---

**Last Updated:** 2025-01-16  
**Status:** ❌ **Critical fixes required before production!**

