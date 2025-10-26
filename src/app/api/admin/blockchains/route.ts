/**
 * Admin Blockchain Networks API
 * 
 * GET /api/admin/blockchains - List all blockchain networks
 * POST /api/admin/blockchains - Create new blockchain network
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const createBlockchainSchema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  name: z.string().min(3).max(100),
  nativeToken: z.string().min(2).max(20),
  explorerUrl: z.string().url(),
  rpcUrl: z.string().url().optional().nullable(),
  chainId: z.number().int().optional().nullable(),
  minConfirmations: z.number().int().min(1).max(100).default(12),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
  metadata: z.any().optional()
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Check if only active items should be returned (for selects/comboboxes)
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    // Get all blockchain networks
    const blockchains = await prisma.blockchainNetwork.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [
        { priority: 'asc' },
        { name: 'asc' }
      ]
    });

    // Add counts separately to avoid errors if relations don't exist yet
    const blockchainsWithCounts = await Promise.all(
      blockchains.map(async (blockchain) => {
        try {
          const [userWallets, platformWallets, orders] = await Promise.all([
            prisma.userWallet.count({ where: { blockchainCode: blockchain.code } }),
            prisma.platformWallet.count({ where: { blockchainCode: blockchain.code } }),
            prisma.order.count({ where: { blockchainCode: blockchain.code } })
          ]);

          return {
            ...blockchain,
            _count: {
              userWallets,
              platformWallets,
              orders
            }
          };
        } catch (error) {
          console.error(`Error counting for blockchain ${blockchain.code}:`, error);
          return {
            ...blockchain,
            _count: {
              userWallets: 0,
              platformWallets: 0,
              orders: 0
            }
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: blockchainsWithCounts
    });
  } catch (error) {
    console.error('Get blockchains error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve blockchain networks'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const body = await request.json();

    // Validate
    const validated = createBlockchainSchema.parse(body);

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

    // Check if blockchain already exists
    const existing = await prisma.blockchainNetwork.findUnique({
      where: { code: validated.code }
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blockchain network with this code already exists'
        },
        { status: 400 }
      );
    }

    // Create blockchain network
    const blockchain = await prisma.blockchainNetwork.create({
      data: {
        ...validated,
        nativeAsset: validated.nativeToken, // For compatibility
        confirmations: validated.minConfirmations // For compatibility
      }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.SYSTEM_SETTINGS,
      blockchain.id,
      {},
      {
        code: blockchain.code,
        name: blockchain.name,
        isActive: blockchain.isActive
      },
      { entity: 'BlockchainNetwork', action: 'created' }
    );

    return NextResponse.json({
      success: true,
      data: blockchain
    }, { status: 201 });
  } catch (error) {
    console.error('Create blockchain error:', error);

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
        error: 'Failed to create blockchain network'
      },
      { status: 500 }
    );
  }
}

