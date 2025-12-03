/**
 * Client API - My Virtual IBAN Account Details
 * 
 * GET /api/client/virtual-iban/:id - Get specific account details (only if owned by user)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
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

    // Get account
    const account = await virtualIbanService.getAccountById(accountId);

    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    // Check ownership
    if (account.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get transactions (last 90 days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const transactions = await virtualIbanService.getAccountTransactions(
      accountId,
      startDate
    );

    return NextResponse.json({
      success: true,
      data: {
        account,
        transactions,
      },
    });
  } catch (error) {
    console.error('[API] Get Virtual IBAN account details failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

