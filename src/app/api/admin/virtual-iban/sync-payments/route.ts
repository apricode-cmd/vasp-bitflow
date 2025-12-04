/**
 * Admin API - Manual Sync Virtual IBAN Payments
 * 
 * POST /api/admin/virtual-iban/sync-payments
 * 
 * Manually trigger polling to check for missed payments
 * Same logic as cron job but can be triggered on-demand
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { syncVirtualIbanPayments } from '@/lib/cron/sync-virtual-iban-payments';

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const result = await requireAdminRole('ADMIN');
    if (result instanceof NextResponse) {
      return result;
    }
    const { session } = result;

    console.log(`[Admin] Manual sync triggered by: ${session.email}`);

    // Run sync
    const syncResult = await syncVirtualIbanPayments();

    return NextResponse.json({
      success: syncResult.success,
      message: syncResult.missed > 0 
        ? `Found and processed ${syncResult.missed} missed payment(s)`
        : 'No missed payments found',
      ...syncResult,
      triggeredBy: session.email,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Admin] Manual sync failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

