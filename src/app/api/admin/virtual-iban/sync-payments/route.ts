/**
 * Admin API - Manual Sync Virtual IBAN Payments
 * 
 * POST /api/admin/virtual-iban/sync-payments
 * 
 * Manually trigger polling to check for missed payments
 * Same logic as cron job but can be triggered on-demand
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncVirtualIbanPayments } from '@/lib/cron/sync-virtual-iban-payments';

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`[Admin] Manual sync triggered by: ${session.user.email}`);

    // Run sync
    const result = await syncVirtualIbanPayments();

    return NextResponse.json({
      success: result.success,
      message: result.missed > 0 
        ? `Found and processed ${result.missed} missed payment(s)`
        : 'No missed payments found',
      ...result,
      triggeredBy: session.user.email,
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

