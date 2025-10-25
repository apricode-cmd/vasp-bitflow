/**
 * Public API v1 - Currencies
 * 
 * GET /api/v1/currencies - Get available currencies (requires API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey, logApiRequest } from '@/lib/middleware/api-auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate API key
    const authResult = await requireApiKey(request, 'currencies', 'read');

    if (!authResult.authorized) {
      return authResult.error!;
    }

    const { apiKey } = authResult;

    // Get active currencies
    const [cryptoCurrencies, fiatCurrencies] = await Promise.all([
      prisma.currency.findMany({
        where: { isActive: true },
        orderBy: { priority: 'asc' }
      }),
      prisma.fiatCurrency.findMany({
        where: { isActive: true },
        orderBy: { priority: 'asc' }
      })
    ]);

    const responseTime = Date.now() - startTime;
    await logApiRequest(apiKey.id, request, 200, responseTime);

    return NextResponse.json({
      success: true,
      data: {
        crypto: cryptoCurrencies,
        fiat: fiatCurrencies
      },
      meta: {
        version: '1.0',
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error) {
    console.error('API v1 get currencies error:', error);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve currencies',
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      },
      { status: 500 }
    );
  }
}

