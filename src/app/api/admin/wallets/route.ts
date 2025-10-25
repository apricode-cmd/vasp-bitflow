/**
 * Admin Platform Wallets API
 * 
 * GET /api/admin/wallets - List all platform wallets
 * POST /api/admin/wallets - Create new platform wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { createPlatformWalletSchema } from '@/lib/validations/wallet';
import { walletValidatorService } from '@/lib/services/wallet-validator.service';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Get all platform wallets
    const wallets = await prisma.platformWallet.findMany({
      include: {
        currency: true,
        blockchain: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: wallets
    });
  } catch (error) {
    console.error('Get platform wallets error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve platform wallets'
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
    const validated = createPlatformWalletSchema.parse(body);

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

    // Validate address format
    const addressValidation = walletValidatorService.validateAddress(
      validated.address,
      validated.currencyCode,
      validated.blockchainCode
    );

    if (!addressValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: addressValidation.error || 'Invalid wallet address'
        },
        { status: 400 }
      );
    }

    // Check if wallet with this address already exists
    const existing = await prisma.platformWallet.findUnique({
      where: { address: validated.address }
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet with this address already exists'
        },
        { status: 400 }
      );
    }

    // Verify currency and blockchain exist
    const [currency, blockchain] = await Promise.all([
      prisma.currency.findUnique({ where: { code: validated.currencyCode } }),
      prisma.blockchainNetwork.findUnique({ where: { code: validated.blockchainCode } })
    ]);

    if (!currency || !blockchain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid currency or blockchain'
        },
        { status: 400 }
      );
    }

    // Create platform wallet
    const wallet = await prisma.platformWallet.create({
      data: validated,
      include: {
        currency: true,
        blockchain: true
      }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.WALLET_ADDED,
      AUDIT_ENTITIES.PLATFORM_WALLET,
      wallet.id,
      {},
      {
        currencyCode: wallet.currencyCode,
        blockchainCode: wallet.blockchainCode,
        address: wallet.address,
        label: wallet.label
      }
    );

    return NextResponse.json({
      success: true,
      data: wallet
    }, { status: 201 });
  } catch (error) {
    console.error('Create platform wallet error:', error);

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
        error: 'Failed to create platform wallet'
      },
      { status: 500 }
    );
  }
}

