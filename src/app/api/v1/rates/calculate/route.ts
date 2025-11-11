/**
 * Public API v1 - Rate Calculator
 * 
 * GET /api/v1/rates/calculate - Calculate exchange amount (requires API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey, logApiRequest } from '@/lib/middleware/api-auth';
import { rateManagementService } from '@/lib/services/rate-management.service';
import { calculateOrderTotal } from '@/lib/utils/order-calculations';
import { z } from 'zod';

const calculateSchema = z.object({
  from: z.enum(['EUR', 'PLN']),
  to: z.enum(['BTC', 'ETH', 'USDT', 'SOL']),
  amount: z.coerce.number().positive(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate API key
    const authResult = await requireApiKey(request, 'rates', 'read');

    if (!authResult.authorized) {
      return authResult.error!;
    }

    const { apiKey } = authResult;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const amount = searchParams.get('amount');

    // Validate parameters
    const validated = calculateSchema.parse({ from, to, amount });

    // Get current rate
    const rate = await rateManagementService.getCurrentRate(validated.to, validated.from);

    if (!rate) {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 404, responseTime, 'Rate not found');

      return NextResponse.json(
        {
          success: false,
          error: 'Rate not found',
          message: `Exchange rate for ${validated.to}/${validated.from} is not available`,
          meta: {
            version: '1.0',
            responseTime: `${responseTime}ms`
          }
        },
        { status: 404 }
      );
    }

    // Calculate amounts
    const cryptoAmount = validated.amount / rate;
    
    // Get platform fee (default 1.5%)
    const platformFeePercent = 1.5;
    const platformFee = validated.amount * (platformFeePercent / 100);
    const totalFiat = validated.amount + platformFee;
    const totalCrypto = totalFiat / rate;

    const responseTime = Date.now() - startTime;
    await logApiRequest(apiKey.id, request, 200, responseTime);

    return NextResponse.json({
      success: true,
      data: {
        from: {
          currency: validated.from,
          amount: validated.amount
        },
        to: {
          currency: validated.to,
          amount: cryptoAmount,
          amountWithFees: totalCrypto
        },
        rate: {
          value: rate,
          pair: `${validated.to}/${validated.from}`,
          timestamp: new Date().toISOString()
        },
        fees: {
          platform: {
            amount: platformFee,
            percentage: platformFeePercent,
            currency: validated.from
          }
        },
        total: {
          fiat: totalFiat,
          fiatCurrency: validated.from,
          crypto: totalCrypto,
          cryptoCurrency: validated.to
        },
        breakdown: {
          subtotal: validated.amount,
          platformFee: platformFee,
          total: totalFiat,
          currency: validated.from
        }
      },
      meta: {
        version: '1.0',
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error: any) {
    console.error('API v1 calculate rate error:', error);

    const responseTime = Date.now() - startTime;

    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Invalid parameters. Required: from (EUR|PLN), to (BTC|ETH|USDT|SOL), amount (positive number)',
          details: error.errors,
          meta: {
            version: '1.0',
            responseTime: `${responseTime}ms`
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate rate',
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      },
      { status: 500 }
    );
  }
}

