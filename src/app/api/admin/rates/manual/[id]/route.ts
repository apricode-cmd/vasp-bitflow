/**
 * Admin Manual Rate Management API
 * 
 * DELETE /api/admin/rates/manual/[id] - Remove manual rate override
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { rateManagementService } from '@/lib/services/rate-management.service';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;

    // Get admin ID
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Get manual rate for logging
    const manualRate = await prisma.manualRate.findUnique({
      where: { id }
    });

    if (!manualRate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Manual rate not found'
        },
        { status: 404 }
      );
    }

    // Remove manual rate
    await rateManagementService.removeManualRate(id);

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.MANUAL_RATE_SET,
      AUDIT_ENTITIES.MANUAL_RATE,
      id,
      {
        cryptoCode: manualRate.cryptoCode,
        fiatCode: manualRate.fiatCode,
        rate: manualRate.rate,
        isActive: true
      },
      {
        isActive: false
      },
      {
        action: 'removed'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Manual rate removed'
    });
  } catch (error) {
    console.error('Remove manual rate error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove manual rate'
      },
      { status: 500 }
    );
  }
}

