/**
 * Cron API Route - Sync Virtual IBAN Payments
 * 
 * GET /api/cron/sync-virtual-iban-payments
 * 
 * Triggers polling fallback to catch missed webhooks
 * Should be called every 5 minutes by:
 * - Vercel Cron (vercel.json)
 * - External scheduler (cron-job.org, etc.)
 * - Manual trigger for testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncVirtualIbanPayments } from '@/lib/cron/sync-virtual-iban-payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

export async function GET(req: NextRequest) {
  console.log('[API] Cron job triggered: sync-virtual-iban-payments');

  try {
    // Verify cron secret (security)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[API] Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run sync
    const result = await syncVirtualIbanPayments();

    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      ...result,
    });

  } catch (error) {
    console.error('[API] Cron job failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

