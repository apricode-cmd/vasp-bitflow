/**
 * Admin User Wallet Management API
 * 
 * GET /api/admin/user-wallets/[id] - Get user wallet details
 * PATCH /api/admin/user-wallets/[id] - Update user wallet
 * DELETE /api/admin/user-wallets/[id] - Delete user wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const updateUserWalletSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  isVerified: z.boolean().optional(),
  isDefault: z.boolean().optional()
});

export async function GET(
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

    // Get user wallet
    const wallet = await prisma.userWallet.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        blockchain: true,
        currency: true,
        orders: {
          select: {
            id: true,
            paymentReference: true,
            status: true,
            cryptoAmount: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'User wallet not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    console.error('Get user wallet error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve user wallet'
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
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;
    const body = await request.json();

    // Validate
    const validated = updateUserWalletSchema.parse(body);

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

    // Get current wallet
    const currentWallet = await prisma.userWallet.findUnique({
      where: { id }
    });

    if (!currentWallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'User wallet not found'
        },
        { status: 404 }
      );
    }

    // If isDefault is being set to true, unset other default wallets
    if (validated.isDefault === true) {
      await prisma.userWallet.updateMany({
        where: {
          userId: currentWallet.userId,
          currencyCode: currentWallet.currencyCode,
          isDefault: true,
          id: { not: id }
        },
        data: {
          isDefault: false
        }
      });
    }

    // Update user wallet
    const updatedWallet = await prisma.userWallet.update({
      where: { id },
      data: validated,
      include: {
        user: {
          select: {
            email: true
          }
        },
        blockchain: true,
        currency: true
      }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.SYSTEM_SETTINGS,
      id,
      {
        label: currentWallet.label,
        isVerified: currentWallet.isVerified,
        isDefault: currentWallet.isDefault
      },
      {
        label: updatedWallet.label,
        isVerified: updatedWallet.isVerified,
        isDefault: updatedWallet.isDefault
      },
      { entity: 'UserWallet', action: 'updated' }
    );

    return NextResponse.json({
      success: true,
      data: updatedWallet
    });
  } catch (error) {
    console.error('Update user wallet error:', error);

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
        error: 'Failed to update user wallet'
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

    // Check dependencies
    const wallet = await prisma.userWallet.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true
          }
        }
      }
    });

    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'User wallet not found'
        },
        { status: 404 }
      );
    }

    if (wallet._count.orders > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete wallet with existing orders',
          dependencies: {
            orders: wallet._count.orders
          }
        },
        { status: 400 }
      );
    }

    // Delete wallet
    await prisma.userWallet.delete({
      where: { id }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.SYSTEM_SETTINGS,
      id,
      {
        userId: wallet.userId,
        address: wallet.address
      },
      {},
      {
        entity: 'UserWallet',
        action: 'deleted'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'User wallet deleted successfully'
    });
  } catch (error) {
    console.error('Delete user wallet error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete user wallet'
      },
      { status: 500 }
    );
  }
}

