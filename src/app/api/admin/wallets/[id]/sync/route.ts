/**
 * API: Sync Single Wallet Balance
 * POST /api/admin/wallets/[id]/sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { syncWalletBalance } from '@/lib/services/blockchain-provider.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Check admin authorization
  const authResponse = await requireAdminRole('ADMIN');
  if (authResponse instanceof NextResponse) {
    return authResponse;
  }

  const { id } = params;

  try {
    const result = await syncWalletBalance(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to sync wallet balance' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Wallet balance synced successfully',
      balance: result.balance
    });
  } catch (error: any) {
    console.error('❌ Wallet sync error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to sync wallet balance' },
      { status: 500 }
    );
  }
}

