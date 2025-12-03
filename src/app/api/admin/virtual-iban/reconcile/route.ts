/**
 * Admin API - Manual Reconciliation
 * 
 * POST /api/admin/virtual-iban/reconcile - Manually reconcile transaction with order
 * POST /api/admin/virtual-iban/reconcile/batch - Auto-reconcile all unreconciled transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { virtualIbanReconciliationService } from '@/lib/services/virtual-iban-reconciliation.service';
import { z } from 'zod';

// ==========================================
// POST - Manual Reconciliation
// ==========================================

const ManualReconcileSchema = z.object({
  transactionId: z.string().cuid(),
  orderId: z.string().cuid(),
});

export async function POST(req: NextRequest) {
  try {
    // Check admin permission
    const result = await requireAdminRole('ADMIN');
    if (result instanceof NextResponse) {
      return result;
    }
    const { session } = result;

    // Check if this is batch reconciliation
    const { searchParams } = new URL(req.url);
    const batch = searchParams.get('batch') === 'true';

    if (batch) {
      // Batch auto-reconciliation
      const batchResult = await virtualIbanReconciliationService.reconcileAll();

      return NextResponse.json({
        success: true,
        data: batchResult,
        message: `Batch reconciliation complete: ${batchResult.reconciled}/${batchResult.total} reconciled`,
      });
    }

    // Single manual reconciliation
    const body = await req.json();
    const validation = ManualReconcileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { transactionId, orderId } = validation.data;

    // Manual reconcile
    const reconcileResult = await virtualIbanReconciliationService.manualReconcile(
      transactionId,
      orderId,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      data: reconcileResult,
      message: 'Transaction reconciled successfully',
    });
  } catch (error) {
    console.error('[API] Virtual IBAN reconciliation failed:', error);
    return NextResponse.json(
      { error: 'Failed to reconcile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

