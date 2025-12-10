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
  console.log('[Admin Sync API] Request received');
  
  try {
    // Check admin authentication
    const result = await requireAdminRole('ADMIN');
    if (result instanceof NextResponse) {
      console.log('[Admin Sync API] Auth failed');
      return result;
    }
    const { session } = result;

    console.log(`[Admin Sync API] Manual sync triggered by: ${session.email}`);

    // Run sync with timeout (2 minutes max)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Sync operation timeout after 2 minutes')), 120000);
    });

    const syncResult = await Promise.race([
      syncVirtualIbanPayments(),
      timeoutPromise
    ]) as any;

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

