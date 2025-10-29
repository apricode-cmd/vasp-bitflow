/**
 * Exchange Rates API Route
 * 
 * GET /api/rates - Returns current cryptocurrency exchange rates from active provider
 * GET /api/rates?force=true - Forces fresh fetch (bypasses cache)
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateProviderService } from '@/lib/services/rate-provider.service';
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

    // Get rates from active provider
    const rates = await rateProviderService.getAllRates();

    // Add metadata
    const response = {
      ...rates,
      feePercentage: PLATFORM_CONFIG.FEE_PERCENTAGE
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Error fetching rates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}

