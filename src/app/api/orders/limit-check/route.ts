/**
 * Order Limit Check API
 * 
 * GET /api/orders/limit-check
 * Returns user's 24h trading limits and KYC status
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { orderLimitService } from '@/lib/services/order-limit.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const summary = await orderLimitService.get24hSummary(session.user.id);

    return NextResponse.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Limit check error:', error);

    return NextResponse.json(
      { error: 'Failed to check limits' },
      { status: 500 }
    );
  }
}

