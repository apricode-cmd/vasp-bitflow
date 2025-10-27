/**
 * Public Payment Methods API
 * 
 * GET /api/payment-methods - Get available payment methods for a currency
 */

import { NextRequest, NextResponse } from 'next/server';
import { paymentMethodService } from '@/lib/services/payment-method.service';
import { z } from 'zod';

const querySchema = z.object({
  currency: z.string().min(2).max(10)
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currency = searchParams.get('currency');

    if (!currency) {
      return NextResponse.json(
        {
          success: false,
          error: 'Currency parameter is required'
        },
        { status: 400 }
      );
    }

    // Validate
    const validated = querySchema.parse({ currency });

    // Get active payment methods for currency
    const methods = await paymentMethodService.getActiveMethods(validated.currency);

    // Remove sensitive config data from public response
    const publicMethods = methods.map(({ config, ...method }) => method);

    return NextResponse.json({
      success: true,
      data: publicMethods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve payment methods'
      },
      { status: 500 }
    );
  }
}



