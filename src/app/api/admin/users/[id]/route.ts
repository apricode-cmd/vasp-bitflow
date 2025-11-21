// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin User Details & Management API
 * 
 * GET /api/admin/users/[id] - Get user details
 * PATCH /api/admin/users/[id] - Update user (block/unblock)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['CLIENT', 'ADMIN']).optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;

    // Get user with full details
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        kycSession: {
          include: {
            documents: true,
            formData: true
          }
        },
        orders: {
          include: {
            currency: true,
            fiatCurrency: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        userWallets: {
          include: {
            blockchain: true,
            currency: true
          }
        },
        _count: {
          select: {
            orders: true,
            auditLogs: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    // Remove password
    const { password, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    console.error('Get user details error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve user details'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;
    const body = await request.json();

    // Validate
    const validated = updateUserSchema.parse(body);

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

    // Get current user state
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    // Prevent self-blocking
    if (adminId === id && validated.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          error: 'You cannot block yourself'
        },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: validated,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log admin action
    const action = validated.isActive === false ? AUDIT_ACTIONS.USER_BLOCKED : 
                   validated.isActive === true ? AUDIT_ACTIONS.USER_UNBLOCKED :
                   AUDIT_ACTIONS.USER_UPDATED;

    await auditService.logAdminAction(
      adminId,
      action,
      AUDIT_ENTITIES.USER,
      id,
      {
        role: currentUser.role,
        isActive: currentUser.isActive
      },
      {
        role: updatedUser.role,
        isActive: updatedUser.isActive
      },
      {
        email: currentUser.email
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update user'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission - only SUPER_ADMIN can delete users
    const sessionOrError = await requireAdminRole('SUPER_ADMIN');
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

    // Prevent self-deletion
    if (adminId === id) {
      return NextResponse.json(
        {
          success: false,
          error: 'You cannot delete yourself'
        },
        { status: 400 }
      );
    }

    // Get user before deletion for audit log
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        profile: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.USER_DELETED,
      AUDIT_ENTITIES.USER,
      id,
      {
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        name: user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : null
      },
      null,
      {
        deletedAt: new Date().toISOString()
      }
    );

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);

    // Check for foreign key constraint errors
    if (error instanceof Error && error.message.includes('foreign key constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete user with existing orders or related data. Consider deactivating instead.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete user'
      },
      { status: 500 }
    );
  }
}

