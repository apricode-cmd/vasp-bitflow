// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * User Wallets API Routes
 * 
 * POST /api/wallets - Add new wallet
 * GET /api/wallets - Get user's wallets
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { validateWalletAddress, normalizeWalletAddress } from '@/lib/validators/wallet-address';
import { z } from 'zod';

const createWalletSchema = z.object({
  currencyCode: z.string().min(1),
  blockchainCode: z.string().min(1),
  address: z.string().min(1).max(100), // Extended max length
  label: z.string().max(50).optional()
});

/**
 * POST - Add new wallet
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const validatedData = createWalletSchema.parse(body);

    // 1. Validate address format
    const validation = validateWalletAddress(validatedData.address, validatedData.blockchainCode);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 2. Normalize address
    const normalizedAddress = normalizeWalletAddress(validatedData.address, validatedData.blockchainCode);

    // 3. Check if currency exists
    const currency = await prisma.currency.findUnique({
      where: { code: validatedData.currencyCode }
    });

    if (!currency) {
      return NextResponse.json(
        { error: 'Invalid currency' },
        { status: 400 }
      );
    }

    // 4. Check if blockchain exists
    const blockchain = await prisma.blockchainNetwork.findUnique({
      where: { code: validatedData.blockchainCode }
    });

    if (!blockchain) {
      return NextResponse.json(
        { error: 'Invalid blockchain network' },
        { status: 400 }
      );
    }

    // 5. Check if address is already registered with ANOTHER user
    const existingWallet = await prisma.userWallet.findFirst({
      where: {
        address: normalizedAddress,
        currencyCode: validatedData.currencyCode,
        blockchainCode: validatedData.blockchainCode,
        userId: {
          not: session.user.id
        }
      }
    });

    if (existingWallet) {
      return NextResponse.json(
        { 
          error: 'This wallet address is already registered with another user. Please use a different address or contact support if this is your wallet.'
        },
        { status: 400 }
      );
    }

    // 6. Check if wallet already exists for current user
    const ownExistingWallet = await prisma.userWallet.findFirst({
      where: {
        userId: session.user.id,
        currencyCode: validatedData.currencyCode,
        blockchainCode: validatedData.blockchainCode,
        address: normalizedAddress
      }
    });

    if (ownExistingWallet) {
      return NextResponse.json(
        { error: 'This wallet address is already saved in your account' },
        { status: 400 }
      );
    }

    // 7. Create wallet
    const wallet = await prisma.userWallet.create({
      data: {
        userId: session.user.id,
        currencyCode: validatedData.currencyCode,
        blockchainCode: validatedData.blockchainCode,
        address: normalizedAddress, // Use normalized address
        label: validatedData.label
      },
      include: {
        currency: true,
        blockchain: true
      }
    });

    return NextResponse.json(wallet, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create wallet error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get user's wallets
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const wallets = await prisma.userWallet.findMany({
      where: { userId: session.user.id },
      include: {
        currency: true,
        blockchain: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ wallets });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


