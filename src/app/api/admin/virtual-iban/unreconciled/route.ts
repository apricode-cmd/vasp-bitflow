/**
 * Admin API - Unreconciled Transactions
 * 
 * GET /api/admin/virtual-iban/unreconciled - Get transactions that need manual reconciliation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';

export async function GET(req: NextRequest) {
  try {
    // Check admin permission
    const result = await requireAdminRole('ADMIN');
    if (result instanceof NextResponse) {
      return result;
    }
    const { session } = result;

    // Get unreconciled transactions
    const transactions = await virtualIbanService.getUnreconciledTransactions();

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error('[API] Get unreconciled transactions failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unreconciled transactions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

