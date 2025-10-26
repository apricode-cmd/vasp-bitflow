/**
 * Admin User Wallets API
 * 
 * GET /api/admin/user-wallets - List all user wallets
 * POST /api/admin/user-wallets - Create new user wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const createUserWalletSchema = z.object({
  userId: z.string().cuid(),
  blockchainCode: z.string().min(2).max(20),
  currencyCode: z.string().min(2).max(10),
  address: z.string().min(26).max(100),
  label: z.string().min(1).max(100).optional(),
  isVerified: z.boolean().default(false),
  isDefault: z.boolean().default(false)
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const blockchainCode = searchParams.get('blockchainCode');
    const currencyCode = searchParams.get('currencyCode');

    // Build where clause
    const where: any = {};
    if (userId) where.userId = userId;
    if (blockchainCode) where.blockchainCode = blockchainCode;
    if (currencyCode) where.currencyCode = currencyCode;

    // Get all user wallets
    const wallets = await prisma.userWallet.findMany({
      where,
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
        blockchain: {
          select: {
            code: true,
            name: true,
            explorerUrl: true
          }
        },
        currency: {
          select: {
            code: true,
            name: true,
            symbol: true
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: wallets
    });
  } catch (error) {
    console.error('Get user wallets error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve user wallets'
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
    const validated = createUserWalletSchema.parse(body);

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

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: validated.userId }
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

    // Verify blockchain exists
    const blockchain = await prisma.blockchainNetwork.findUnique({
      where: { code: validated.blockchainCode }
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

    // Verify currency exists
    const currency = await prisma.currency.findUnique({
      where: { code: validated.currencyCode }
    });

    if (!currency) {
      return NextResponse.json(
        {
          success: false,
          error: 'Currency not found'
        },
        { status: 404 }
      );
    }

    // Check if wallet already exists
    const existing = await prisma.userWallet.findUnique({
      where: {
        userId_address: {
          userId: validated.userId,
          address: validated.address
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet with this address already exists for this user'
        },
        { status: 400 }
      );
    }

    // If isDefault is true, unset other default wallets for this user/currency
    if (validated.isDefault) {
      await prisma.userWallet.updateMany({
        where: {
          userId: validated.userId,
          currencyCode: validated.currencyCode,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    // Create user wallet
    const wallet = await prisma.userWallet.create({
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
      wallet.id,
      {},
      {
        userId: wallet.userId,
        address: wallet.address,
        blockchain: wallet.blockchainCode,
        currency: wallet.currencyCode
      },
      { entity: 'UserWallet', action: 'created' }
    );

    return NextResponse.json({
      success: true,
      data: wallet
    }, { status: 201 });
  } catch (error) {
    console.error('Create user wallet error:', error);

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
        error: 'Failed to create user wallet'
      },
      { status: 500 }
    );
  }
}

