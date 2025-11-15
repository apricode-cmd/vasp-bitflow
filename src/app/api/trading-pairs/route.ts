// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Public Trading Pairs API
 * 
 * GET /api/trading-pairs - Get active trading pairs (public access)
 * Query params:
 *   - cryptoCode: filter by crypto (e.g., BTC)
 *   - fiatCode: filter by fiat (e.g., EUR)
 * 
 * Caching: 10 minutes TTL in Redis
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CacheService } from '@/lib/services/cache.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const cryptoCode = searchParams.get('cryptoCode');
    const fiatCode = searchParams.get('fiatCode');

    // Normalize filters
    const filters = {
      cryptoCode: cryptoCode?.toUpperCase(),
      fiatCode: fiatCode?.toUpperCase(),
    };

    // Try Redis cache first
    const cached = await CacheService.getTradingPairs(filters);
    if (cached !== null) {
      // If specific pair requested, return single object
      if (filters.cryptoCode && filters.fiatCode && cached.length === 1) {
        return NextResponse.json({
          success: true,
          pair: cached[0],
          cached: true
        });
      }

      return NextResponse.json({
        success: true,
        pairs: cached,
        cached: true
      });
    }

    // Cache miss - fetch from database
    const where: any = {
      isActive: true // Only active pairs
    };

    if (filters.cryptoCode) {
      where.cryptoCode = filters.cryptoCode;
    }

    if (filters.fiatCode) {
      where.fiatCode = filters.fiatCode;
    }

    // Get trading pairs
    const pairs = await prisma.tradingPair.findMany({
      where,
      include: {
        crypto: {
          select: {
            code: true,
            name: true,
            symbol: true,
            decimals: true
          }
        },
        fiat: {
          select: {
            code: true,
            name: true,
            symbol: true
          }
        }
      },
      orderBy: { priority: 'asc' }
    });

    // Cache the result (10 minutes TTL)
    await CacheService.setTradingPairs(pairs, filters, 600);

    // If specific pair requested, return single object
    if (filters.cryptoCode && filters.fiatCode && pairs.length === 1) {
      return NextResponse.json({
        success: true,
        pair: pairs[0],
        cached: false
      });
    }

    return NextResponse.json({
      success: true,
      pairs,
      cached: false
    });
  } catch (error) {
    console.error('Get trading pairs error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve trading pairs'
      },
      { status: 500 }
    );
  }
}

