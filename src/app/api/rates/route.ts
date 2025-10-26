/**
 * Exchange Rates API Route
 * 
 * GET /api/rates - Returns current cryptocurrency exchange rates (with manual overrides)
 * GET /api/rates?force=true - Forces fresh fetch from CoinGecko (bypasses cache)
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateManagementService } from '@/lib/services/rate-management.service';
import { coinGeckoService } from '@/lib/services/coingecko';
import { PLATFORM_CONFIG } from '@/lib/constants';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if force refresh is requested
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('force') === 'true';

    if (forceRefresh) {
      console.log('🔄 Force refresh requested - clearing cache');
      coinGeckoService.clearCache();
    }

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

    // Return real market rates (fee is applied during order calculation, not to the rate itself)
    const rates = {
      BTC: {
        EUR: btcEur,
        PLN: btcPln
      },
      ETH: {
        EUR: ethEur,
        PLN: ethPln
      },
      USDT: {
        EUR: usdtEur,
        PLN: usdtPln
      },
      SOL: {
        EUR: solEur,
        PLN: solPln
      },
      updatedAt: new Date().toISOString(),
      feePercentage: PLATFORM_CONFIG.FEE_PERCENTAGE
    };

    return NextResponse.json(rates);
  } catch (error) {
    console.error('Error fetching rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}

