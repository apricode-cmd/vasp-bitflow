// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/kyc/[id]/audit-logs
 * 
 * Fetch complete audit log timeline for a KYC session
 * Includes:
 * - User actions (document uploads, submissions, resubmissions)
 * - Admin actions (approve/reject, view)
 * - System actions (webhook received, API calls)
 * - API calls to KYC provider (request/response)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id: kycSessionId } = params;

    // Verify KYC session exists
    const kycSession = await prisma.kycSession.findUnique({
      where: { id: kycSessionId },
      select: { id: true, userId: true }
    });

    if (!kycSession) {
      return NextResponse.json(
        { success: false, error: 'KYC session not found' },
        { status: 404 }
      );
    }

    // Fetch audit logs from AuditLog table
    // This includes ALL logs: User, Admin, and System (API calls, webhooks)
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'KycSession',
        entityId: kycSessionId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        actorType: true,
        actorId: true,
        actorEmail: true,
        actorRole: true,
        action: true,
        entityType: true,
        entityId: true,
        diffBefore: true,
        diffAfter: true,
        context: true,
        metadata: true,
        severity: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true
      }
    });

    // Format logs for frontend timeline
    const timeline = logs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt,
      actorType: log.actorType || 'SYSTEM', // USER, ADMIN, SYSTEM
      actorId: log.actorId,
      actorEmail: log.actorEmail,
      actorRole: log.actorRole,
      action: log.action,
      severity: log.severity || 'INFO',
      
      // Change tracking
      before: log.diffBefore,
      after: log.diffAfter,
      
      // Context (metadata from action)
      context: log.context || log.metadata,
      
      // Request tracking
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      
      // Formatted title for timeline display
      title: formatActionTitle(log.action, log.actorType),
      
      // Icon/badge for timeline UI
      icon: getActionIcon(log.action),
      variant: getActionVariant(log.action)
    }));

    // Calculate stats
    const stats = {
      total: timeline.length,
      byType: {
        user: timeline.filter(l => l.actorType === 'USER').length,
        admin: timeline.filter(l => l.actorType === 'ADMIN').length,
        system: timeline.filter(l => l.actorType === 'SYSTEM').length
      },
      byAction: timeline.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      apiCalls: timeline.filter(l => l.action === 'KYC_API_REQUEST').length,
      errors: timeline.filter(l => l.action === 'KYC_API_ERROR').length
    };

    return NextResponse.json({
      success: true,
      data: {
        kycSessionId,
        userId: kycSession.userId,
        timeline,
        stats
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to fetch KYC audit logs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

/**
 * Format action name for display
 */
function formatActionTitle(action: string, actorType: string | null): string {
  const actionMap: Record<string, string> = {
    KYC_CREATED: 'KYC Session Created',
    KYC_SUBMITTED: 'Documents Submitted for Review',
    KYC_DOCUMENT_UPLOADED: 'Document Uploaded',
    KYC_RESUBMITTED: 'Documents Resubmitted',
    KYC_APPROVED: 'KYC Approved by Admin',
    KYC_REJECTED: 'KYC Rejected by Admin',
    KYC_VIEWED: 'KYC Viewed by Admin',
    KYC_WEBHOOK_RECEIVED: 'Webhook Received from Provider',
    KYC_STATUS_CHANGED: 'Status Changed',
    KYC_API_REQUEST: 'API Request to Provider',
    KYC_API_ERROR: 'API Request Failed'
  };

  const title = actionMap[action] || action.replace(/_/g, ' ');
  
  if (actorType === 'SYSTEM') {
    return `[System] ${title}`;
  } else if (actorType === 'ADMIN') {
    return `[Admin] ${title}`;
  } else if (actorType === 'USER') {
    return `[User] ${title}`;
  }
  
  return title;
}

/**
 * Get icon name for action
 */
function getActionIcon(action: string): string {
  const iconMap: Record<string, string> = {
    KYC_CREATED: 'file-plus',
    KYC_SUBMITTED: 'send',
    KYC_DOCUMENT_UPLOADED: 'upload',
    KYC_RESUBMITTED: 'refresh-cw',
    KYC_APPROVED: 'check-circle',
    KYC_REJECTED: 'x-circle',
    KYC_VIEWED: 'eye',
    KYC_WEBHOOK_RECEIVED: 'webhook',
    KYC_STATUS_CHANGED: 'git-commit',
    KYC_API_REQUEST: 'server',
    KYC_API_ERROR: 'alert-circle'
  };

  return iconMap[action] || 'circle';
}

/**
 * Get color variant for action
 */
function getActionVariant(action: string): string {
  if (action.includes('APPROVED')) return 'success';
  if (action.includes('REJECTED')) return 'destructive';
  if (action.includes('ERROR')) return 'destructive';
  if (action.includes('WEBHOOK')) return 'secondary';
  if (action.includes('API_REQUEST')) return 'outline';
  return 'default';
}


