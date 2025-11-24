# KYC Audit Logging - Implementation Plan

**Date:** 2025-11-22  
**Status:** 🔧 Implementation Ready  
**Priority:** HIGH (Compliance & Security)

---

## 🎯 Problem Statement

**Current Issue:**
```typescript
// KycHistoryTab.tsx - Line 41
// TODO: Create API endpoint for KYC audit logs
// For now, show session timeline from existing data
```

**What's wrong:**
1. ❌ No real audit logging for KYC session changes
2. ❌ Mock timeline from `createdAt`, `submittedAt`, `reviewedAt` only
3. ❌ No tracking of who approved/rejected
4. ❌ No tracking of document uploads
5. ❌ No tracking of status changes
6. ❌ No tracking of resubmissions

**Impact:**
- ❌ Cannot track KYC session progression
- ❌ Cannot identify who made decisions (compliance issue!)
- ❌ Cannot audit document handling
- ❌ Cannot investigate rejections/approvals

---

## 🏗️ Architecture Overview

### **Existing Infrastructure:**

✅ **Database Models:**
- `AdminAuditLog` - for admin actions
- `UserAuditLog` - for user actions
- `KycSession` - session data

✅ **Services:**
- `AuditService` (`src/lib/services/audit.service.ts`)
- `AdminAuditLogService` (`src/lib/services/admin-audit-log.service.ts`)
- `UserAuditLogService` (`src/lib/services/user-audit-log.service.ts`)

✅ **Constants:**
- `AUDIT_ACTIONS` - includes KYC actions
- `AUDIT_ENTITIES` - includes `KYC_SESSION`

---

## 📋 Events to Log

### **Admin Actions (AdminAuditLog):**

| Action | Event | Who | When |
|--------|-------|-----|------|
| `KYC_APPROVED` | Admin approves KYC | Admin | `/api/admin/kyc/[id]` (PUT) |
| `KYC_REJECTED` | Admin rejects KYC | Admin | `/api/admin/kyc/[id]` (PUT) |
| `KYC_DELETED` | Admin deletes session | Admin | `/api/admin/kyc/[id]` (DELETE) |
| `KYC_DOCUMENT_UPLOADED` | Admin uploads doc manually | Admin | Upload endpoint |
| `SETTINGS_UPDATED` | Admin updates KYC settings | Admin | Settings page |

### **User Actions (UserAuditLog):**

| Action | Event | Who | When |
|--------|-------|-----|------|
| `KYC_CREATED` | User starts KYC | User | `/api/kyc/start` |
| `KYC_SUBMITTED` | User submits for review | User | `/api/kyc/submit-review` |
| `KYC_DOCUMENT_UPLOADED` | User uploads document | User | `/api/kyc/resubmit-documents` |
| `KYC_RESUBMITTED` | User resubmits after rejection | User | Resubmit flow |

### **System Actions (AdminAuditLog with System actor):**

| Action | Event | Who | When |
|--------|-------|-----|------|
| `KYC_WEBHOOK_RECEIVED` | Webhook from provider | System | `/api/webhooks/sumsub` |
| `KYC_STATUS_CHANGED` | Status changed via webhook | System | Webhook processing |
| `KYC_SYNCED` | Sync with provider API | System | Sync endpoint |

---

## 🔧 Implementation Tasks

### **Phase 1: Add Audit Logging to Existing Endpoints** ✅

#### 1.1 **Admin Approve/Reject KYC**
**File:** `src/app/api/admin/kyc/[id]/route.ts`

```typescript
// Current: No audit logging
// Add: AdminAuditLog entry on approve/reject

import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

// In PUT handler:
await auditService.logAdminAction(
  session.user.id,
  status === 'APPROVED' ? AUDIT_ACTIONS.KYC_APPROVED : AUDIT_ACTIONS.KYC_REJECTED,
  AUDIT_ENTITIES.KYC_SESSION,
  kycSessionId,
  { status: oldStatus },
  { status: newStatus, rejectionReason },
  {
    userId: kycSession.userId,
    userEmail: kycSession.user.email,
    provider: kycSession.kycProviderId,
    attempt: kycSession.attempts
  }
);
```

#### 1.2 **User KYC Creation**
**File:** `src/app/api/kyc/start/route.ts`

```typescript
// Add UserAuditLog entry

await auditService.logUserAction(
  session.user.id,
  AUDIT_ACTIONS.KYC_CREATED,
  AUDIT_ENTITIES.KYC_SESSION,
  kycSession.id,
  {
    provider: kycSession.kycProviderId,
    applicantId: kycSession.applicantId
  }
);
```

#### 1.3 **User KYC Submission**
**File:** `src/app/api/kyc/submit-review/route.ts`

```typescript
// Add UserAuditLog entry

await auditService.logUserAction(
  session.user.id,
  AUDIT_ACTIONS.KYC_SUBMITTED,
  AUDIT_ENTITIES.KYC_SESSION,
  kycSession.id,
  {
    provider: kycSession.kycProviderId,
    documentsCount: documents.length,
    attempt: kycSession.attempts + 1
  }
);
```

#### 1.4 **Document Resubmission**
**File:** `src/app/api/kyc/resubmit-documents/route.ts`

```typescript
// Add UserAuditLog entry for each document upload

await auditService.logUserAction(
  session.user.id,
  AUDIT_ACTIONS.KYC_DOCUMENT_UPLOADED,
  AUDIT_ENTITIES.KYC_SESSION,
  kycSession.id,
  {
    documentType,
    fileName: file.name,
    fileSize: file.size,
    isResubmission: true,
    attempt: kycSession.attempts
  }
);

// If last document, also log resubmission
if (isLastDocument) {
  await auditService.logUserAction(
    session.user.id,
    'KYC_RESUBMITTED', // Add to AUDIT_ACTIONS
    AUDIT_ENTITIES.KYC_SESSION,
    kycSession.id,
    {
      oldStatus: 'REJECTED',
      newStatus: 'PENDING',
      documentsUploaded: uploadedDocs.length
    }
  );
}
```

#### 1.5 **Webhook Processing**
**File:** `src/app/api/webhooks/sumsub/route.ts` (and KYCAID)

```typescript
// Add system audit log for webhooks

await auditService.logAdminAction(
  'system', // Special system actor
  AUDIT_ACTIONS.KYC_WEBHOOK_RECEIVED,
  AUDIT_ENTITIES.KYC_SESSION,
  kycSession.id,
  { status: oldStatus },
  { status: newStatus },
  {
    provider: 'sumsub',
    webhookType: event.type,
    reviewAnswer: event.reviewResult?.reviewAnswer,
    rejectLabels: event.reviewResult?.rejectLabels
  }
);
```

---

### **Phase 2: Create API Endpoint for KYC Audit Logs** ✅

#### 2.1 **New Endpoint**
**File:** `src/app/api/admin/kyc/[id]/audit-logs/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { error } = await requireAdminRole('ADMIN');
  if (error) return error;

  try {
    const kycSessionId = params.id;

    // Get KYC session to verify it exists
    const kycSession = await prisma.kycSession.findUnique({
      where: { id: kycSessionId },
      select: { id: true, userId: true }
    });

    if (!kycSession) {
      return NextResponse.json(
        { error: 'KYC session not found' },
        { status: 404 }
      );
    }

    // Fetch admin audit logs (system actions, admin approvals/rejections)
    const adminLogs = await prisma.adminAuditLog.findMany({
      where: {
        entityType: 'KYC_SESSION',
        entityId: kycSessionId
      },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch user audit logs (user submissions, uploads)
    const userLogs = await prisma.userAuditLog.findMany({
      where: {
        entityType: 'KYC_SESSION',
        entityId: kycSessionId
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Merge and sort both logs
    const allLogs = [
      ...adminLogs.map(log => ({
        id: log.id,
        action: log.action,
        performedBy: log.adminId === 'system' 
          ? 'System' 
          : `${log.admin?.firstName || ''} ${log.admin?.lastName || ''}`.trim() || log.admin?.email || 'Admin',
        performedByType: log.adminId === 'system' ? 'system' : 'admin',
        performedByEmail: log.admin?.email,
        performedByRole: log.admin?.role,
        performedAt: log.createdAt,
        diffBefore: log.diffBefore,
        diffAfter: log.diffAfter,
        metadata: log.metadata,
        severity: log.severity,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent
      })),
      ...userLogs.map(log => ({
        id: log.id,
        action: log.action,
        performedBy: `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim() || log.user?.email || 'User',
        performedByType: 'user',
        performedByEmail: log.user?.email,
        performedAt: log.createdAt,
        diffBefore: log.diffBefore,
        diffAfter: log.diffAfter,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent
      }))
    ].sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());

    return NextResponse.json({
      success: true,
      logs: allLogs,
      count: allLogs.length
    });

  } catch (error: any) {
    console.error('Error fetching KYC audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
```

---

### **Phase 3: Update Frontend to Display Real Logs** ✅

#### 3.1 **Update KycHistoryTab Component**
**File:** `src/app/(admin)/admin/kyc/[id]/_components/KycHistoryTab.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, User, Activity, Shield, FileText, Check, X, Upload, RefreshCw } from 'lucide-react';
import type { KycSessionDetail } from './types';
import { formatDateTime } from '@/lib/formatters';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  action: string;
  performedBy: string;
  performedByType: 'admin' | 'user' | 'system';
  performedByEmail?: string;
  performedByRole?: string;
  performedAt: Date;
  diffBefore?: any;
  diffAfter?: any;
  metadata?: any;
  severity?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface KycHistoryTabProps {
  session: KycSessionDetail;
}

// Map action to icon and color
function getActionIcon(action: string) {
  switch (action) {
    case 'KYC_CREATED':
      return <FileText className="h-4 w-4 text-blue-600" />;
    case 'KYC_SUBMITTED':
      return <Upload className="h-4 w-4 text-purple-600" />;
    case 'KYC_APPROVED':
      return <Check className="h-4 w-4 text-green-600" />;
    case 'KYC_REJECTED':
      return <X className="h-4 w-4 text-red-600" />;
    case 'KYC_DOCUMENT_UPLOADED':
      return <Upload className="h-4 w-4 text-indigo-600" />;
    case 'KYC_RESUBMITTED':
      return <RefreshCw className="h-4 w-4 text-orange-600" />;
    case 'KYC_WEBHOOK_RECEIVED':
      return <Activity className="h-4 w-4 text-gray-600" />;
    case 'KYC_STATUS_CHANGED':
      return <RefreshCw className="h-4 w-4 text-yellow-600" />;
    default:
      return <Activity className="h-4 w-4 text-gray-600" />;
  }
}

// Format action name for display
function formatActionName(action: string): string {
  return action
    .replace('KYC_', '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
}

export function KycHistoryTab({ session }: KycHistoryTabProps): JSX.Element {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, [session.id]);

  const fetchAuditLogs = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/kyc/${session.id}/audit-logs`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setAuditLogs(data.logs.map((log: any) => ({
        ...log,
        performedAt: new Date(log.performedAt)
      })));
      
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast.error('Failed to load KYC history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No history available for this KYC session
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            KYC Session Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auditLogs.map((log, index) => (
              <div
                key={log.id}
                className={`relative flex gap-4 pb-4 ${
                  index !== auditLogs.length - 1 ? 'border-l-2 border-gray-200 dark:border-gray-700 ml-2' : ''
                }`}
              >
                {/* Icon */}
                <div className="absolute -left-[9px] top-0 bg-white dark:bg-gray-900 p-1 rounded-full border-2 border-gray-200 dark:border-gray-700">
                  {getActionIcon(log.action)}
                </div>

                {/* Content */}
                <div className="ml-8 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {/* Action name */}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatActionName(log.action)}</span>
                        {log.severity && (
                          <Badge 
                            variant={
                              log.severity === 'CRITICAL' ? 'destructive' : 
                              log.severity === 'WARNING' ? 'warning' : 
                              'secondary'
                            }
                          >
                            {log.severity}
                          </Badge>
                        )}
                      </div>

                      {/* Performed by */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        {log.performedByType === 'admin' && <Shield className="h-3 w-3" />}
                        {log.performedByType === 'user' && <User className="h-3 w-3" />}
                        {log.performedByType === 'system' && <Activity className="h-3 w-3" />}
                        <span>
                          {log.performedBy}
                          {log.performedByRole && ` (${log.performedByRole})`}
                        </span>
                      </div>

                      {/* Metadata/Changes */}
                      {(log.diffBefore || log.diffAfter || log.metadata) && (
                        <div className="mt-2 space-y-1">
                          {/* Status change */}
                          {log.diffBefore?.status && log.diffAfter?.status && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Status: </span>
                              <Badge variant="outline">{log.diffBefore.status}</Badge>
                              <span className="mx-2">→</span>
                              <Badge variant="outline">{log.diffAfter.status}</Badge>
                            </div>
                          )}

                          {/* Rejection reason */}
                          {log.diffAfter?.rejectionReason && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Reason: </span>
                              <span className="text-destructive">{log.diffAfter.rejectionReason}</span>
                            </div>
                          )}

                          {/* Document info */}
                          {log.metadata?.documentType && (
                            <div className="text-sm text-muted-foreground">
                              Document: {log.metadata.documentType}
                              {log.metadata.fileName && ` - ${log.metadata.fileName}`}
                            </div>
                          )}

                          {/* Provider info */}
                          {log.metadata?.provider && (
                            <div className="text-sm text-muted-foreground">
                              Provider: {log.metadata.provider}
                            </div>
                          )}

                          {/* IP Address (for admins viewing) */}
                          {log.ipAddress && (
                            <div className="text-xs text-muted-foreground">
                              IP: {log.ipAddress}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.performedAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">History Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Events</div>
              <div className="text-2xl font-bold">{auditLogs.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Admin Actions</div>
              <div className="text-2xl font-bold">
                {auditLogs.filter(l => l.performedByType === 'admin').length}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">User Actions</div>
              <div className="text-2xl font-bold">
                {auditLogs.filter(l => l.performedByType === 'user').length}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">System Events</div>
              <div className="text-2xl font-bold">
                {auditLogs.filter(l => l.performedByType === 'system').length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### **Phase 4: Add Missing Constants** ✅

#### 4.1 **Add KYC_RESUBMITTED Action**
**File:** `src/lib/services/audit.service.ts`

```typescript
export const AUDIT_ACTIONS = {
  // ... existing actions ...
  
  // KYC actions
  KYC_CREATED: 'KYC_CREATED',
  KYC_SUBMITTED: 'KYC_SUBMITTED',
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
  KYC_DELETED: 'KYC_DELETED',
  KYC_DOCUMENT_UPLOADED: 'KYC_DOCUMENT_UPLOADED',
  KYC_RESUBMITTED: 'KYC_RESUBMITTED', // ✅ ADD THIS
  KYC_WEBHOOK_RECEIVED: 'KYC_WEBHOOK_RECEIVED', // ✅ ADD THIS
  KYC_STATUS_CHANGED: 'KYC_STATUS_CHANGED', // ✅ ADD THIS
  
  // ... rest ...
} as const;
```

---

## ✅ Testing Checklist

- [ ] Admin approves KYC → `AdminAuditLog` entry created
- [ ] Admin rejects KYC → `AdminAuditLog` entry created with reason
- [ ] User starts KYC → `UserAuditLog` entry created
- [ ] User submits KYC → `UserAuditLog` entry created
- [ ] User uploads document → `UserAuditLog` entry created
- [ ] User resubmits after rejection → `UserAuditLog` entry created
- [ ] Webhook received → `AdminAuditLog` (system) entry created
- [ ] API `/api/admin/kyc/[id]/audit-logs` returns merged logs
- [ ] KycHistoryTab displays timeline correctly
- [ ] Timeline shows icons, actors, timestamps
- [ ] Timeline shows diff before/after
- [ ] Timeline shows metadata (documents, IP, etc.)

---

## 📊 Expected Result

### **Before:**
```
History Tab:
  - KYC Session Created (System, 2025-11-20 10:00)
  - KYC Submitted (demo@apricode.agency, 2025-11-20 10:15)
  - KYC Approved (Admin, 2025-11-20 11:00)
```

❌ No real audit data, just timestamps from DB

### **After:**
```
History Tab (with audit logs):
  ✅ KYC Rejected (Admin - john@bitflow.biz, 2025-11-22 15:30)
      Status: PENDING → REJECTED
      Reason: BAD_SELFIE, DOCUMENT_PAGE_MISSING
      IP: 192.168.1.100

  ✅ Document Uploaded (User - demo@apricode.agency, 2025-11-22 15:15)
      Document: PASSPORT
      File: passport-front.jpg (2.4 MB)
      Resubmission: Yes
      IP: 192.168.1.50

  ✅ KYC Resubmitted (User - demo@apricode.agency, 2025-11-22 15:15)
      Status: REJECTED → PENDING
      Documents: 2

  ✅ Webhook Received (System, 2025-11-22 14:00)
      Provider: Sumsub
      Review Answer: RED
      Reject Labels: BAD_SELFIE, DOCUMENT_PAGE_MISSING

  ✅ KYC Submitted (User - demo@apricode.agency, 2025-11-22 10:15)
      Provider: Sumsub
      Documents: 3
      Attempt: 1

  ✅ KYC Created (User - demo@apricode.agency, 2025-11-22 10:00)
      Provider: Sumsub
      Applicant ID: 692476053ae2f64a4a445392

Statistics:
  Total Events: 6
  Admin Actions: 1
  User Actions: 4
  System Events: 1
```

✅ Full audit trail with actors, actions, metadata

---

## 🚀 Rollout Plan

1. **Phase 1:** Add audit logging to all KYC endpoints (1-2 hours)
2. **Phase 2:** Create `/api/admin/kyc/[id]/audit-logs` endpoint (30 min)
3. **Phase 3:** Update `KycHistoryTab` component (1 hour)
4. **Phase 4:** Add missing constants (15 min)
5. **Testing:** Test all flows (1 hour)

**Total Estimate:** ~4-5 hours

---

## ✅ Compliance Benefits

- ✅ **Who did what, when** - full audit trail
- ✅ **IP tracking** - detect suspicious activity
- ✅ **Immutable logs** - cannot be tampered (AdminAuditLog has `freezeChecksum`)
- ✅ **Severity levels** - flag critical actions
- ✅ **Diff tracking** - see exact changes
- ✅ **Regulatory compliance** - KYC decisions are auditable

**Ready for implementation!** 🎯


