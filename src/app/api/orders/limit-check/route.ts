/**
 * Order Limit Check API
 * 
 * GET /api/orders/limit-check
 * Returns user's 24h trading limits and KYC status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { orderLimitService } from '@/lib/services/order-limit.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔍 [limit-check] Starting...');
    
    const session = await getClientSession();
    console.log('🔍 [limit-check] Session:', session?.user?.id);

    if (!session?.user?.id) {
      console.log('❌ [limit-check] Unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔍 [limit-check] Calling get24hSummary for user:', session.user.id);
    const summary = await orderLimitService.get24hSummary(session.user.id);
    console.log('✅ [limit-check] Summary:', summary);

    return NextResponse.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('❌ [limit-check] Error:', error);
    console.error('❌ [limit-check] Stack:', error instanceof Error ? error.stack : 'No stack');

    return NextResponse.json(
      { error: 'Failed to check limits' },
      { status: 500 }
    );
  }
}

