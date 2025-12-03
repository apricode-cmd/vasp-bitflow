/**
 * Admin API - Reject VOP Transaction
 * POST /api/admin/virtual-iban/vop/[transactionId]/reject
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { transactionId: string } }
): Promise<NextResponse> {
  try {
    const { error, session } = await requireAdminAuth();
    if (error) return error;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = session.user.id;
    const transactionId = params.transactionId;

    // Get transaction
    const transaction = await prisma.virtualIbanTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.status !== 'VOP_HELD') {
      return NextResponse.json({ error: 'Transaction is not in VOP_HELD status' }, { status: 400 });
    }

    // Update transaction - mark as rejected and change status to FAILED
    await prisma.virtualIbanTransaction.update({
      where: { id: transactionId },
      data: {
        vopApproved: false,
        vopReviewedBy: adminId,
        vopReviewedAt: new Date(),
        status: 'FAILED',
      },
    });

    console.log('[VOP Reject] Transaction rejected:', {
      transactionId,
      adminId,
      vopStatus: transaction.vopStatus,
      amount: transaction.amount,
      currency: transaction.currency,
    });

    // TODO: In production, BCB will automatically return the payment to sender
    // No need to call BCB API - they handle rejected VOP transactions

    return NextResponse.json({
      success: true,
      message: 'VOP rejected - payment will be returned to sender',
    });
  } catch (error) {
    console.error('[ADMIN API] Reject VOP failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to reject VOP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

