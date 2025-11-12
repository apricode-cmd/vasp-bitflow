/**
 * Admin Change Role API
 * 
 * POST: Change admin role (SUPER_ADMIN only, REQUIRES STEP-UP MFA)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { handleStepUpMfa } from '@/lib/middleware/step-up-mfa';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const changeRoleSchema = z.object({
  newRoleCode: z.string().min(1, 'Role is required'),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('SUPER_ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const adminId = params.id;

    // Cannot change your own role
    if (adminId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Get admin
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { 
        id: true, 
        email: true,
        workEmail: true,
        firstName: true, 
        lastName: true, 
        role: true,
        roleCode: true,
        status: true
      },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Cannot change role of SUPER_ADMIN
    if (admin.role === 'SUPER_ADMIN' || admin.roleCode === 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Cannot change role of Super Admin' },
        { status: 403 }
      );
    }

    // Cannot change role of TERMINATED admin
    if (admin.status === 'TERMINATED') {
      return NextResponse.json(
        { success: false, error: 'Cannot change role of terminated admin' },
        { status: 400 }
      );
    }

    // Read body
    const body = await request.json();
    
    // Validate input
    const validatedData = changeRoleSchema.parse(body);

    // Check if new role exists
    const newRole = await prisma.roleModel.findUnique({
      where: { code: validatedData.newRoleCode },
      select: { code: true, name: true, isActive: true },
    });

    if (!newRole) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    if (!newRole.isActive) {
      return NextResponse.json(
        { success: false, error: 'Role is not active' },
        { status: 400 }
      );
    }

    // Check if role is already assigned
    if (admin.roleCode === validatedData.newRoleCode) {
      return NextResponse.json(
        { success: false, error: 'Admin already has this role' },
        { status: 400 }
      );
    }

    // 🔐 STEP-UP MFA REQUIRED FOR CHANGING ADMIN ROLE
    const mfaResult = await handleStepUpMfa(
      body,
      session.user.id,
      'CHANGE_ADMIN_ROLE',
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

    // Store old role for audit
    const oldRoleCode = admin.roleCode || admin.role;

    // Update admin role
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        roleCode: validatedData.newRoleCode,
        // Also update legacy role field for backward compatibility
        role: validatedData.newRoleCode as any,
      },
    });

    // Log to audit with MFA verification
    await auditService.logAdminAction(
      session.user.id,
      AUDIT_ACTIONS.ADMIN_ROLE_CHANGED,
      AUDIT_ENTITIES.ADMIN,
      adminId,
      { 
        roleCode: oldRoleCode,
        role: admin.role 
      },
      { 
        roleCode: validatedData.newRoleCode,
        role: validatedData.newRoleCode 
      },
      {
        targetAdmin: admin.workEmail || admin.email,
        targetName: `${admin.firstName} ${admin.lastName}`,
        oldRole: oldRoleCode,
        newRole: validatedData.newRoleCode,
        newRoleName: newRole.name,
        reason: validatedData.reason,
        mfaVerified: true
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Admin role changed successfully',
      data: {
        adminId,
        oldRole: oldRoleCode,
        newRole: validatedData.newRoleCode,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('❌ Change admin role error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to change admin role' },
      { status: 500 }
    );
  }
}

