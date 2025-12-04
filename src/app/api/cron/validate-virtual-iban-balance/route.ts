/**
 * Cron API Route - Validate Virtual IBAN Balance
 * 
 * GET /api/cron/validate-virtual-iban-balance
 * 
 * Validates Σ(local balances) === BCB total
 * Should be called every hour by:
 * - Vercel Cron (vercel.json)
 * - External scheduler
 * - Manual trigger for testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateVirtualIbanBalance } from '@/lib/cron/validate-virtual-iban-balance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

export async function GET(req: NextRequest) {
  console.log('[API] Cron job triggered: validate-virtual-iban-balance');

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

    // Run validation
    const result = await validateVirtualIbanBalance();

    // Return appropriate status code
    const statusCode = result.success && result.isValid !== false ? 200 : 500;

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    }, { status: statusCode });

  } catch (error) {
    console.error('[API] Cron job failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

