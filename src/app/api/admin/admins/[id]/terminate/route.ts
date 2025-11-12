/**
 * Admin Terminate API
 * 
 * POST: Terminate admin account permanently (SUPER_ADMIN only, REQUIRES STEP-UP MFA)
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

    // Cannot terminate yourself
    if (adminId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot terminate your own account' },
        { status: 400 }
      );
    }

    // Get admin
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Cannot terminate another SUPER_ADMIN
    if (admin.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Cannot terminate another Super Admin' },
        { status: 403 }
      );
    }

    // Read body (might contain MFA data)
    const body = await request.json().catch(() => ({}));

    // 🔐 STEP-UP MFA REQUIRED FOR TERMINATING ADMIN
    const mfaResult = await handleStepUpMfa(
      body,
      session.user.id,
      'DELETE_ADMIN',
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

    // Terminate admin
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        status: 'TERMINATED',
        isActive: false,
        isSuspended: false,
      },
    });

    // Terminate all active sessions
    await prisma.adminSession.updateMany({
      where: {
        adminId,
        isActive: true,
      },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminatedBy: session.user.id,
        terminationReason: 'ADMIN_TERMINATED',
      },
    });

    // Deactivate all WebAuthn credentials
    await prisma.webAuthnCredential.updateMany({
      where: { adminId },
      data: { isActive: false },
    });

    // Log to audit with MFA verification
    await auditService.logAdminAction(
      session.user.id,
      AUDIT_ACTIONS.ADMIN_TERMINATED,
      AUDIT_ENTITIES.ADMIN,
      adminId,
      { status: 'ACTIVE' },
      { status: 'TERMINATED' },
      {
        targetAdmin: admin.email,
        targetRole: admin.role,
        mfaVerified: true
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Admin terminated successfully',
    });
  } catch (error) {
    console.error('❌ Terminate admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to terminate admin' },
      { status: 500 }
    );
  }
}

