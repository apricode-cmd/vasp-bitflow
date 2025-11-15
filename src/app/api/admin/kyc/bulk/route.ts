// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin KYC Bulk Operations API
 * 
 * POST /api/admin/kyc/bulk - Perform bulk actions on KYC sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const BulkActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'delete']),
  sessionIds: z.array(z.string()).min(1).max(100),
  rejectionReason: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check admin authorization
  const { error, adminId } = await requireAdminRole('ADMIN');
  if (error) return error;

  try {
    const body = await request.json();
    const validation = BulkActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: validation.error },
        { status: 400 }
      );
    }

    const { action, sessionIds, rejectionReason } = validation.data;

    // Validate rejection reason for reject action
    if (action === 'reject' && !rejectionReason?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    let affected = 0;
    const now = new Date();

    switch (action) {
      case 'approve': {
        // Only approve PENDING sessions
        const result = await prisma.kycSession.updateMany({
          where: {
            id: { in: sessionIds },
            status: 'PENDING', // Only affect pending sessions
          },
          data: {
            status: 'APPROVED',
            reviewedAt: now,
            reviewedBy: adminId,
            rejectionReason: null, // Clear any previous rejection reason
          },
        });
        affected = result.count;

        // Create audit log for bulk approval
        await prisma.auditLog.create({
          data: {
            action: 'BULK_KYC_APPROVE',
            performedBy: adminId!,
            resourceType: 'KYC_SESSION',
            resourceId: sessionIds.join(','),
            details: {
              affected,
              sessionIds,
            },
          },
        });

        break;
      }

      case 'reject': {
        // Only reject PENDING sessions
        const result = await prisma.kycSession.updateMany({
          where: {
            id: { in: sessionIds },
            status: 'PENDING', // Only affect pending sessions
          },
          data: {
            status: 'REJECTED',
            reviewedAt: now,
            reviewedBy: adminId,
            rejectionReason,
          },
        });
        affected = result.count;

        // Create audit log for bulk rejection
        await prisma.auditLog.create({
          data: {
            action: 'BULK_KYC_REJECT',
            performedBy: adminId!,
            resourceType: 'KYC_SESSION',
            resourceId: sessionIds.join(','),
            details: {
              affected,
              sessionIds,
              rejectionReason,
            },
          },
        });

        break;
      }

      case 'delete': {
        // Delete sessions (be careful!)
        const result = await prisma.kycSession.deleteMany({
          where: {
            id: { in: sessionIds },
          },
        });
        affected = result.count;

        // Create audit log for bulk deletion
        await prisma.auditLog.create({
          data: {
            action: 'BULK_KYC_DELETE',
            performedBy: adminId!,
            resourceType: 'KYC_SESSION',
            resourceId: sessionIds.join(','),
            details: {
              affected,
              sessionIds,
            },
          },
        });

        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${action}d ${affected} session(s)`,
      affected,
    });
  } catch (error) {
    console.error('Bulk KYC operation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}

