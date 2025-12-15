/**
 * Admin API - Get Pending VOP Transactions
 * GET /api/admin/virtual-iban/vop/pending
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering (uses headers for auth)
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { error } = await requireAdminAuth();
    if (error) return error;

    // Get all transactions with VOP status that require review
    const transactions = await prisma.virtualIbanTransaction.findMany({
      where: {
        status: 'VOP_HELD',
        vopStatus: {
          in: ['CLOSE_MATCH', 'NO_MATCH', 'IMPOSSIBLE_MATCH'],
        },
        vopApproved: null, // Not yet reviewed
      },
      include: {
        virtualIban: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error('[ADMIN API] Get pending VOP transactions failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch VOP transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

