// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin Details API
 * 
 * PATCH: Update admin details (firstName, lastName, jobTitle, department)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const updateAdminSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('SUPER_ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const adminId = params.id;

    // Cannot edit yourself (use profile page)
    if (adminId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Use profile page to edit your own details' },
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
        jobTitle: true,
        department: true,
        role: true,
        status: true
      },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Cannot edit SUPER_ADMIN
    if (admin.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit Super Admin details' },
        { status: 403 }
      );
    }

    // Cannot edit TERMINATED admin
    if (admin.status === 'TERMINATED') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit terminated admin' },
        { status: 400 }
      );
    }

    // Read body
    const body = await request.json();
    
    // Validate input
    const validatedData = updateAdminSchema.parse(body);

    // Check if any changes were made
    const hasChanges = 
      (validatedData.firstName && validatedData.firstName !== admin.firstName) ||
      (validatedData.lastName && validatedData.lastName !== admin.lastName) ||
      (validatedData.jobTitle !== undefined && validatedData.jobTitle !== admin.jobTitle) ||
      (validatedData.department !== undefined && validatedData.department !== admin.department);

    if (!hasChanges) {
      return NextResponse.json(
        { success: false, error: 'No changes detected' },
        { status: 400 }
      );
    }

    // Store old values for audit
    const oldValues = {
      firstName: admin.firstName,
      lastName: admin.lastName,
      jobTitle: admin.jobTitle,
      department: admin.department,
    };

    // Update admin
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: {
        ...(validatedData.firstName && { firstName: validatedData.firstName }),
        ...(validatedData.lastName && { lastName: validatedData.lastName }),
        ...(validatedData.jobTitle !== undefined && { jobTitle: validatedData.jobTitle || null }),
        ...(validatedData.department !== undefined && { department: validatedData.department || null }),
      },
    });

    // Log to audit
    await auditService.logAdminAction(
      session.user.id,
      AUDIT_ACTIONS.ADMIN_UPDATED,
      AUDIT_ENTITIES.ADMIN,
      adminId,
      oldValues,
      {
        firstName: updatedAdmin.firstName,
        lastName: updatedAdmin.lastName,
        jobTitle: updatedAdmin.jobTitle,
        department: updatedAdmin.department,
      },
      {
        targetAdmin: admin.workEmail || admin.email,
        targetName: `${admin.firstName} ${admin.lastName}`,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Admin details updated successfully',
      data: {
        adminId,
        firstName: updatedAdmin.firstName,
        lastName: updatedAdmin.lastName,
        jobTitle: updatedAdmin.jobTitle,
        department: updatedAdmin.department,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('❌ Update admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update admin' },
      { status: 500 }
    );
  }
}

