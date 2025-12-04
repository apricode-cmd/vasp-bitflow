/**
 * Admin API - Manual Validate Virtual IBAN Balance
 * 
 * POST /api/admin/virtual-iban/validate-balance
 * 
 * Manually trigger balance validation
 * Same logic as cron job but can be triggered on-demand
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateVirtualIbanBalance } from '@/lib/cron/validate-virtual-iban-balance';

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

    console.log(`[Admin] Manual validation triggered by: ${session.user.email}`);

    // Run validation
    const result = await validateVirtualIbanBalance();

    return NextResponse.json({
      success: result.success,
      message: result.isValid 
        ? 'Balance validation passed - all accounts balanced'
        : `Balance mismatch detected: €${result.difference?.toFixed(2)} difference`,
      ...result,
      triggeredBy: session.user.email,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Admin] Manual validation failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

