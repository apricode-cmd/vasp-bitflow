/**
 * Admin API - Sync Virtual IBAN Account
 * 
 * POST /api/admin/virtual-iban/:id/sync - Sync account details and transactions from provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin permission
    const result = await requireAdminRole('ADMIN');
    if (result instanceof NextResponse) {
      return result;
    }
    const { session } = result;

    const accountId = params.id;

    // Sync account details
    const account = await virtualIbanService.syncAccountDetails(accountId);

    // Sync transactions (last 30 days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const syncResult = await virtualIbanService.syncTransactions(
      accountId,
      startDate
    );

    return NextResponse.json({
      success: true,
      data: {
        account,
        transactions: syncResult,
      },
      message: `Account synced: ${syncResult.new} new transactions, ${syncResult.synced} total`,
    });
  } catch (error) {
    console.error('[API] Sync Virtual IBAN account failed:', error);
    return NextResponse.json(
      { error: 'Failed to sync account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

