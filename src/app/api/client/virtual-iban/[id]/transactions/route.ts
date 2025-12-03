/**
 * Client API - Get Virtual IBAN transactions
 * 
 * GET /api/client/virtual-iban/:id/transactions - Get account transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { virtualIbanBalanceService } from '@/lib/services/virtual-iban-balance.service';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check client auth
    const { error, session } = await requireAuth();
    if (error) return error;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = params.id;

    // Get account and verify ownership
    const account = await virtualIbanService.getAccountById(accountId);

    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    // Check ownership
    if (account.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get transactions
    const transactions = await virtualIbanBalanceService.getTransactionHistory(accountId, 100);

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error('[API] Get Virtual IBAN transactions failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transactions', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}





