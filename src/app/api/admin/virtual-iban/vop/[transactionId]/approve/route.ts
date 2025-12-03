/**
 * Admin API - Approve VOP Transaction
 * POST /api/admin/virtual-iban/vop/[transactionId]/approve
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { virtualIbanReconciliationService } from '@/lib/services/virtual-iban-reconciliation.service';
import { topUpRequestService } from '@/lib/services/topup-request.service';

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

    // Update transaction - mark as approved and change status to COMPLETED
    await prisma.virtualIbanTransaction.update({
      where: { id: transactionId },
      data: {
        vopApproved: true,
        vopReviewedBy: adminId,
        vopReviewedAt: new Date(),
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    });

    console.log('[VOP Approve] Transaction approved:', {
      transactionId,
      adminId,
      vopStatus: transaction.vopStatus,
    });

    // Now try to match with TopUp Request or Order
    try {
      // Try TopUp Request first
      const matchedRequest = await topUpRequestService.matchPaymentToRequest(
        transaction.virtualIbanId,
        transaction.reference,
        transaction.amount
      );

      if (matchedRequest) {
        await topUpRequestService.completeRequest(matchedRequest.id, transaction.id);
        console.log('[VOP Approve] Matched with TopUp request:', matchedRequest.id);
      } else {
        // Try Order matching
        await virtualIbanReconciliationService.reconcileTransaction(transaction.id);
        console.log('[VOP Approve] Attempting order reconciliation');
      }
    } catch (matchError) {
      console.warn('[VOP Approve] Matching failed (will require manual):', matchError);
      // Transaction is still approved, just not matched automatically
    }

    return NextResponse.json({
      success: true,
      message: 'VOP approved - transaction will be processed',
    });
  } catch (error) {
    console.error('[ADMIN API] Approve VOP failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to approve VOP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

