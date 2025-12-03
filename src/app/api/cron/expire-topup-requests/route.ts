/**
 * Cron Job: Expire Old TopUp Requests
 * 
 * This endpoint is called periodically (e.g., every hour) to mark
 * expired TopUp requests as EXPIRED.
 * 
 * Security:
 * - Requires CRON_SECRET header for authentication
 * - Should be called by Vercel Cron or external cron service
 */

import { NextRequest, NextResponse } from 'next/server';
import { topUpRequestService } from '@/lib/services/topup-request.service';

// Verify cron secret (set in Vercel environment)
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Check authorization
  const authHeader = req.headers.get('authorization');
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    console.log('[Cron] Unauthorized request to expire-topup-requests');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('[Cron] Running expire-topup-requests job...');
    
    const expiredCount = await topUpRequestService.expireOldRequests();

    console.log(`[Cron] Expired ${expiredCount} top-up requests`);

    return NextResponse.json({
      success: true,
      expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] expire-topup-requests failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Also support POST for flexibility
export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}

