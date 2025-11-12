/**
 * Admin Unsuspend (Reactivate) API
 * 
 * POST: Unsuspend admin account (SUPER_ADMIN only, REQUIRES STEP-UP MFA)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { handleStepUpMfa } from '@/lib/middleware/step-up-mfa';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('SUPER_ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const adminId = params.id;

    // Get admin
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true, 
        role: true,
        status: true,
        isSuspended: true
      },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Check if admin is actually suspended
    if (admin.status !== 'SUSPENDED' && !admin.isSuspended) {
      return NextResponse.json(
        { success: false, error: 'Admin is not suspended' },
        { status: 400 }
      );
    }

    // Read body (might contain MFA data)
    const body = await request.json().catch(() => ({}));

    // 🔐 STEP-UP MFA REQUIRED FOR UNSUSPENDING ADMIN
    const mfaResult = await handleStepUpMfa(
      body,
      session.user.id,
      'UNSUSPEND_ADMIN',
      'Admin',
      adminId
    );

    // Return MFA challenge if required
    if (mfaResult.requiresMfa) {
      return NextResponse.json({
        success: false,
        requiresMfa: true,
        challengeId: mfaResult.challengeId,
        options: mfaResult.options
      });
    }

    // Check MFA verification
    if (!mfaResult.verified) {
      return NextResponse.json(
        {
          success: false,
          error: mfaResult.error || 'MFA verification required'
        },
        { status: 403 }
      );
    }

    // Unsuspend (reactivate) admin
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        status: 'ACTIVE',
        isSuspended: false,
        suspendedUntil: null,
      },
    });

    // Log to audit with MFA verification
    await auditService.logAdminAction(
      session.user.id,
      AUDIT_ACTIONS.ADMIN_UNSUSPENDED,
      AUDIT_ENTITIES.ADMIN,
      adminId,
      { status: 'SUSPENDED', isSuspended: true },
      { status: 'ACTIVE', isSuspended: false },
      {
        targetAdmin: admin.email,
        targetRole: admin.role,
        mfaVerified: true
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Admin unsuspended successfully',
    });
  } catch (error) {
    console.error('❌ Unsuspend admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unsuspend admin' },
      { status: 500 }
    );
  }
}

