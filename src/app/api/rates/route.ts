/**
 * Exchange Rates API Route
 * 
 * GET /api/rates - Returns current cryptocurrency exchange rates (with manual overrides)
 */

import { NextResponse } from 'next/server';
import { rateManagementService } from '@/lib/services/rate-management.service';
import { PLATFORM_CONFIG } from '@/lib/constants';

export async function GET(): Promise<NextResponse> {
  try {
    // Get rates using rate management service (includes manual overrides)
    const [btcEur, btcPln, ethEur, ethPln, usdtEur, usdtPln, solEur, solPln] = await Promise.all([
      rateManagementService.getCurrentRate('BTC', 'EUR'),
      rateManagementService.getCurrentRate('BTC', 'PLN'),
      rateManagementService.getCurrentRate('ETH', 'EUR'),
      rateManagementService.getCurrentRate('ETH', 'PLN'),
      rateManagementService.getCurrentRate('USDT', 'EUR'),
      rateManagementService.getCurrentRate('USDT', 'PLN'),
      rateManagementService.getCurrentRate('SOL', 'EUR'),
      rateManagementService.getCurrentRate('SOL', 'PLN')
    ]);

    // Add platform fee to rates for display
    const ratesWithFee = {
      BTC: {
        EUR: btcEur * (1 + PLATFORM_CONFIG.FEE_PERCENTAGE),
        PLN: btcPln * (1 + PLATFORM_CONFIG.FEE_PERCENTAGE)
      },
      ETH: {
        EUR: ethEur * (1 + PLATFORM_CONFIG.FEE_PERCENTAGE),
        PLN: ethPln * (1 + PLATFORM_CONFIG.FEE_PERCENTAGE)
      },
      USDT: {
        EUR: usdtEur * (1 + PLATFORM_CONFIG.FEE_PERCENTAGE),
        PLN: usdtPln * (1 + PLATFORM_CONFIG.FEE_PERCENTAGE)
      },
      SOL: {
        EUR: solEur * (1 + PLATFORM_CONFIG.FEE_PERCENTAGE),
        PLN: solPln * (1 + PLATFORM_CONFIG.FEE_PERCENTAGE)
      },
      updatedAt: new Date().toISOString(),
      feePercentage: PLATFORM_CONFIG.FEE_PERCENTAGE
    };

    return NextResponse.json(ratesWithFee);
  } catch (error) {
    console.error('Error fetching rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}

