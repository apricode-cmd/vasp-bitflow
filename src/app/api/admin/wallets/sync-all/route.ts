// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * API: Sync All Wallet Balances
 * POST /api/admin/wallets/sync-all
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { syncAllWalletBalances } from '@/lib/services/blockchain-provider.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check admin authorization
  const authResponse = await requireAdminRole('ADMIN');
  if (authResponse instanceof NextResponse) {
    return authResponse;
  }

  try {
    const result = await syncAllWalletBalances();

    return NextResponse.json({
      message: `Synced ${result.success} of ${result.total} wallets`,
      total: result.total,
      success: result.success,
      failed: result.failed,
      results: result.results
    });
  } catch (error: any) {
    console.error('❌ Bulk wallet sync error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to sync wallet balances' },
      { status: 500 }
    );
  }
}

