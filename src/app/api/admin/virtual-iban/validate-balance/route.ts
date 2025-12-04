/**
 * Admin API - Manual Validate Virtual IBAN Balance
 * 
 * POST /api/admin/virtual-iban/validate-balance
 * 
 * Manually trigger balance validation
 * Same logic as cron job but can be triggered on-demand
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { validateVirtualIbanBalance } from '@/lib/cron/validate-virtual-iban-balance';

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const result = await requireAdminRole('ADMIN');
    if (result instanceof NextResponse) {
      return result;
    }
    const { session } = result;

    console.log(`[Admin] Manual validation triggered by: ${session.email}`);

    // Run validation
    const validationResult = await validateVirtualIbanBalance();

    return NextResponse.json({
      success: validationResult.success,
      message: validationResult.isValid 
        ? 'Balance validation passed - all accounts balanced'
        : `Balance mismatch detected: €${validationResult.difference?.toFixed(2)} difference`,
      ...validationResult,
      triggeredBy: session.email,
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

