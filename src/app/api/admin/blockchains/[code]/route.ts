/**
 * Admin Blockchain Network Management API
 * 
 * GET /api/admin/blockchains/[code] - Get blockchain network details
 * PATCH /api/admin/blockchains/[code] - Update blockchain network
 * DELETE /api/admin/blockchains/[code] - Deactivate blockchain network
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const updateBlockchainSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  nativeToken: z.string().min(2).max(20).optional(),
  explorerUrl: z.string().url().optional(),
  rpcUrl: z.string().url().optional().nullable(),
  chainId: z.number().int().optional().nullable(),
  minConfirmations: z.number().int().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
  metadata: z.any().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { code } = await params;

    // Get blockchain network
    const blockchain = await prisma.blockchainNetwork.findUnique({
      where: { code }
    });

    if (!blockchain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blockchain network not found'
        },
        { status: 404 }
      );
    }

    // Add counts separately
    try {
      const [userWallets, platformWallets, orders] = await Promise.all([
        prisma.userWallet.count({ where: { blockchainCode: code } }),
        prisma.platformWallet.count({ where: { blockchainCode: code } }),
        prisma.order.count({ where: { blockchainCode: code } })
      ]);

      return NextResponse.json({
        success: true,
        data: {
          ...blockchain,
          _count: {
            userWallets,
            platformWallets,
            orders
          }
        }
      });
    } catch (error) {
      console.error(`Error counting for blockchain ${code}:`, error);
      return NextResponse.json({
        success: true,
        data: {
          ...blockchain,
          _count: {
            userWallets: 0,
            platformWallets: 0,
            orders: 0
          }
        }
      });
    }
  } catch (error) {
    console.error('Get blockchain error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve blockchain network'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { code } = await params;
    const body = await request.json();

    // Validate
    const validated = updateBlockchainSchema.parse(body);

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

    // Get current blockchain
    const currentBlockchain = await prisma.blockchainNetwork.findUnique({
      where: { code }
    });

    if (!currentBlockchain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blockchain network not found'
        },
        { status: 404 }
      );
    }

    // Update blockchain network
    const updatedData: any = { ...validated };
    if (validated.minConfirmations !== undefined) {
      updatedData.confirmations = validated.minConfirmations; // For compatibility
    }
    if (validated.nativeToken !== undefined) {
      updatedData.nativeAsset = validated.nativeToken; // For compatibility
    }

    const updatedBlockchain = await prisma.blockchainNetwork.update({
      where: { code },
      data: updatedData
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.SYSTEM_SETTINGS,
      code,
      {
        name: currentBlockchain.name,
        isActive: currentBlockchain.isActive,
        minConfirmations: currentBlockchain.minConfirmations
      },
      {
        name: updatedBlockchain.name,
        isActive: updatedBlockchain.isActive,
        minConfirmations: updatedBlockchain.minConfirmations
      },
      { entity: 'BlockchainNetwork', action: 'updated' }
    );

    return NextResponse.json({
      success: true,
      data: updatedBlockchain
    });
  } catch (error) {
    console.error('Update blockchain error:', error);

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
        error: 'Failed to update blockchain network'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { code } = await params;

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
    const blockchain = await prisma.blockchainNetwork.findUnique({
      where: { code }
    });

    if (!blockchain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blockchain network not found'
        },
        { status: 404 }
      );
    }

    // Count dependencies separately
    try {
      const [userWalletsCount, platformWalletsCount, ordersCount] = await Promise.all([
        prisma.userWallet.count({ where: { blockchainCode: code } }),
        prisma.platformWallet.count({ where: { blockchainCode: code } }),
        prisma.order.count({ where: { blockchainCode: code } })
      ]);

      const totalDependencies = userWalletsCount + platformWalletsCount + ordersCount;

      if (totalDependencies > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot delete blockchain network with existing dependencies',
            dependencies: {
              userWallets: userWalletsCount,
              platformWallets: platformWalletsCount,
              orders: ordersCount
            }
          },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error(`Error checking dependencies for blockchain ${code}:`, error);
      // Continue with deactivation if count fails
    }

    // Deactivate instead of deleting
    const updatedBlockchain = await prisma.blockchainNetwork.update({
      where: { code },
      data: { isActive: false }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.SYSTEM_SETTINGS,
      code,
      { isActive: true },
      { isActive: false },
      {
        entity: 'BlockchainNetwork',
        action: 'deactivated'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Blockchain network deactivated'
    });
  } catch (error) {
    console.error('Delete blockchain error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete blockchain network'
      },
      { status: 500 }
    );
  }
}

