/**
 * Payment Accounts API
 * GET: List all payment accounts
 * POST: Create new payment account
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { auditService } from '@/lib/services/audit.service';
import { z } from 'zod';

// Validation schema
const createPaymentAccountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['BANK_ACCOUNT', 'CRYPTO_WALLET']),
  description: z.string().optional(),
  
  // Currency (one required based on type)
  fiatCurrencyCode: z.string().optional(),
  cryptocurrencyCode: z.string().optional(),
  blockchainCode: z.string().optional(),
  
  // Bank fields
  accountHolder: z.string().optional(),
  bankName: z.string().optional(),
  bankAddress: z.string().optional(),
  iban: z.string().optional(),
  accountNumber: z.string().optional(),
  swift: z.string().optional(),
  bic: z.string().optional(),
  routingNumber: z.string().optional(),
  
  // Crypto fields
  address: z.string().optional(),
  memo: z.string().optional(),
  tag: z.string().optional(),
  balance: z.number().optional(),
  minBalance: z.number().optional(),
  
  // Common
  referenceTemplate: z.string().optional(),
  instructions: z.string().optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  priority: z.number().default(1),
  alertsEnabled: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.type === 'BANK_ACCOUNT') {
      return !!data.fiatCurrencyCode;
    } else {
      return !!data.cryptocurrencyCode && !!data.blockchainCode;
    }
  },
  {
    message: 'Bank accounts need fiatCurrencyCode, Crypto wallets need cryptocurrencyCode and blockchainCode',
  }
);

// GET: List payment accounts
export async function GET(request: NextRequest) {
  const authResult = await requireRole('ADMIN');
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'BANK_ACCOUNT' | 'CRYPTO_WALLET'
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (type) where.type = type;
    if (isActive !== null) where.isActive = isActive === 'true';

    const accounts = await prisma.paymentAccount.findMany({
      where,
      include: {
        fiatCurrency: {
          select: { code: true, name: true, symbol: true }
        },
        cryptocurrency: {
          select: { code: true, name: true, symbol: true }
        },
        blockchain: {
          select: { code: true, name: true }
        },
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      accounts,
      total: accounts.length,
    });
  } catch (error) {
    console.error('Error fetching payment accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment accounts' },
      { status: 500 }
    );
  }
}

// POST: Create payment account
export async function POST(request: NextRequest) {
  const authResult = await requireRole('ADMIN');
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  try {
    const body = await request.json();
    const validated = createPaymentAccountSchema.parse(body);

    // Prepare data for Prisma
    const { 
      fiatCurrencyCode, 
      cryptocurrencyCode, 
      blockchainCode,
      ...accountData 
    } = validated;

    const data: any = { ...accountData };

    // Connect relations
    if (fiatCurrencyCode) {
      data.fiatCurrency = { connect: { code: fiatCurrencyCode } };
    }
    if (cryptocurrencyCode) {
      data.cryptocurrency = { connect: { code: cryptocurrencyCode } };
    }
    if (blockchainCode) {
      data.blockchain = { connect: { code: blockchainCode } };
    }

    data.createdBy = session.user.id;

    const account = await prisma.paymentAccount.create({
      data,
      include: {
        fiatCurrency: true,
        cryptocurrency: true,
        blockchain: true,
      },
    });

    // Audit log
    await auditService.logAdminAction(
      session.user.id,
      'PAYMENT_ACCOUNT_CREATE',
      'PaymentAccount',
      account.id,
      null,
      account
    );

    return NextResponse.json({
      success: true,
      account,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating payment account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment account' },
      { status: 500 }
    );
  }
}

