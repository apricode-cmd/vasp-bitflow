/**
 * Public API v1 - Exchange Rates
 * 
 * GET /api/v1/rates - Get current exchange rates (requires API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey, logApiRequest } from '@/lib/middleware/api-auth';
import { rateManagementService } from '@/lib/services/rate-management.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate API key
    const authResult = await requireApiKey(request, 'rates', 'read');

    if (!authResult.authorized) {
      return authResult.error!;
    }

    const { apiKey } = authResult;

    // Get all current rates
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

    const responseTime = Date.now() - startTime;

    // Log usage
    await logApiRequest(apiKey.id, request, 200, responseTime);

    return NextResponse.json({
      success: true,
      data: {
        rates: {
          BTC: { EUR: btcEur, PLN: btcPln },
          ETH: { EUR: ethEur, PLN: ethPln },
          USDT: { EUR: usdtEur, PLN: usdtPln },
          SOL: { EUR: solEur, PLN: solPln }
        },
        timestamp: new Date().toISOString()
      },
      meta: {
        version: '1.0',
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error) {
    console.error('API v1 rates error:', error);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve exchange rates',
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      },
      { status: 500 }
    );
  }
}






