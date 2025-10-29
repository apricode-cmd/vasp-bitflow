/**
 * Public Trading Pairs API
 * 
 * GET /api/trading-pairs - Get active trading pairs (public access)
 * Query params:
 *   - cryptoCode: filter by crypto (e.g., BTC)
 *   - fiatCode: filter by fiat (e.g., EUR)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const cryptoCode = searchParams.get('cryptoCode');
    const fiatCode = searchParams.get('fiatCode');

    // Build where clause
    const where: any = {
      isActive: true // Only active pairs
    };

    if (cryptoCode) {
      where.cryptoCode = cryptoCode.toUpperCase();
    }

    if (fiatCode) {
      where.fiatCode = fiatCode.toUpperCase();
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

    // If specific pair requested, return single object
    if (cryptoCode && fiatCode && pairs.length === 1) {
      return NextResponse.json({
        success: true,
        pair: pairs[0]
      });
    }

    return NextResponse.json({
      success: true,
      pairs
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

