/**
 * Admin Exchange Rates API
 * 
 * GET /api/admin/rates - Get current rates with comparison
 * POST /api/admin/rates/manual - Set manual rate override
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { rateManagementService } from '@/lib/services/rate-management.service';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const setManualRateSchema = z.object({
  cryptoCode: z.string().min(2).max(10),
  fiatCode: z.string().min(2).max(10),
  rate: z.number().positive(),
  validTo: z.string().datetime().optional(),
  reason: z.string().optional()
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Get active manual rates
    const manualRates = await rateManagementService.getActiveManualRates();

    // Get comparison for common pairs
    const comparisons = await Promise.all([
      rateManagementService.compareRates('BTC', 'EUR'),
      rateManagementService.compareRates('BTC', 'PLN'),
      rateManagementService.compareRates('ETH', 'EUR'),
      rateManagementService.compareRates('ETH', 'PLN'),
      rateManagementService.compareRates('USDT', 'EUR'),
      rateManagementService.compareRates('USDT', 'PLN'),
      rateManagementService.compareRates('SOL', 'EUR'),
      rateManagementService.compareRates('SOL', 'PLN')
    ]);

    return NextResponse.json({
      success: true,
      data: {
        manualRates,
        comparisons: {
          'BTC/EUR': comparisons[0],
          'BTC/PLN': comparisons[1],
          'ETH/EUR': comparisons[2],
          'ETH/PLN': comparisons[3],
          'USDT/EUR': comparisons[4],
          'USDT/PLN': comparisons[5],
          'SOL/EUR': comparisons[6],
          'SOL/PLN': comparisons[7]
        }
      }
    });
  } catch (error) {
    console.error('Get rates error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve rates'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const body = await request.json();

    // Validate
    const validated = setManualRateSchema.parse(body);

    // Get admin ID
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Set manual rate
    const manualRate = await rateManagementService.setManualRate(
      validated.cryptoCode,
      validated.fiatCode,
      validated.rate,
      adminId,
      validated.validTo ? new Date(validated.validTo) : undefined,
      validated.reason
    );

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.MANUAL_RATE_SET,
      AUDIT_ENTITIES.MANUAL_RATE,
      manualRate.id,
      {},
      {
        cryptoCode: validated.cryptoCode,
        fiatCode: validated.fiatCode,
        rate: validated.rate,
        validTo: validated.validTo
      },
      {
        reason: validated.reason
      }
    );

    return NextResponse.json({
      success: true,
      data: manualRate
    }, { status: 201 });
  } catch (error) {
    console.error('Set manual rate error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to set manual rate'
      },
      { status: 500 }
    );
  }
}





