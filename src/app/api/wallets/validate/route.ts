// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Wallet Validation API
 * 
 * POST /api/wallets/validate - Validate wallet address
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { validateWalletAddress, normalizeWalletAddress } from '@/lib/validators/wallet-address';
import { z } from 'zod';

const validateSchema = z.object({
  address: z.string().min(1),
  blockchainCode: z.string().min(1),
  currencyCode: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { address, blockchainCode, currencyCode } = validateSchema.parse(body);

    // 1. Validate address format
    const validation = validateWalletAddress(address, blockchainCode);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          isValid: false, 
          error: validation.error,
          type: 'format'
        },
        { status: 400 }
      );
    }

    // 2. Normalize address
    const normalizedAddress = normalizeWalletAddress(address, blockchainCode);

    // 3. Check if address is already registered with ANOTHER user
    const existingWallet = await prisma.userWallet.findFirst({
      where: {
        address: normalizedAddress,
        currencyCode,
        blockchainCode,
        userId: {
          not: session.user.id // Not the current user
        }
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (existingWallet) {
      return NextResponse.json(
        {
          isValid: false,
          error: `This wallet address is already registered with another user. Please use a different address or contact support if this is your wallet.`,
          type: 'duplicate',
          registeredAt: existingWallet.createdAt
        },
        { status: 400 }
      );
    }

    // 4. Check if current user already has this address saved
    const ownWallet = await prisma.userWallet.findFirst({
      where: {
        userId: session.user.id,
        address: normalizedAddress,
        currencyCode,
        blockchainCode
      }
    });

    return NextResponse.json({
      isValid: true,
      normalizedAddress,
      alreadySaved: !!ownWallet,
      walletId: ownWallet?.id,
      message: ownWallet 
        ? 'This address is already saved in your wallets'
        : 'Address is valid and available'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { isValid: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Wallet validation error:', error);
    return NextResponse.json(
      { isValid: false, error: 'Failed to validate wallet address' },
      { status: 500 }
    );
  }
}

