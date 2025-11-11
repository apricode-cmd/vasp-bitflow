/**
 * Public API v1 - Orders
 * 
 * POST /api/v1/orders - Create new order (requires API key)
 * GET /api/v1/orders - List orders (requires API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey, logApiRequest } from '@/lib/middleware/api-auth';
import { prisma } from '@/lib/prisma';
import { rateManagementService } from '@/lib/services/rate-management.service';
import { calculateOrderTotal, validateOrderLimits } from '@/lib/utils/order-calculations';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

// API-specific order schema (extends base schema with userEmail)
const apiCreateOrderSchema = z.object({
  userEmail: z.string().email('Invalid email address'),
  currencyCode: z.enum(['BTC', 'ETH', 'USDT', 'SOL'], {
    required_error: 'Cryptocurrency is required'
  }),
  fiatCurrencyCode: z.enum(['EUR', 'PLN'], {
    required_error: 'Fiat currency is required'
  }),
  cryptoAmount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number'
    })
    .positive('Amount must be positive')
    .max(1000000, 'Amount is too large'),
  walletAddress: z
    .string()
    .min(26, 'Invalid wallet address')
    .max(62, 'Invalid wallet address')
    .regex(/^[a-zA-Z0-9]+$/, 'Wallet address can only contain alphanumeric characters'),
  paymentMethodCode: z
    .string({
      required_error: 'Payment method is required'
    })
    .min(1, 'Payment method is required'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate API key
    const authResult = await requireApiKey(request, 'orders', 'create');

    if (!authResult.authorized) {
      return authResult.error!;
    }

    const { apiKey } = authResult;

    const body = await request.json();

    // Validate request body
    const validated = apiCreateOrderSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validated.userEmail },
      include: { kycSession: true }
    });

    if (!user) {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 404, responseTime, 'User not found');

      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
          meta: { version: '1.0', responseTime: `${responseTime}ms` }
        },
        { status: 404 }
      );
    }

    // Check KYC
    if (!user.kycSession || user.kycSession.status !== 'APPROVED') {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 403, responseTime, 'KYC not approved');

      return NextResponse.json(
        {
          success: false,
          error: 'User must have approved KYC',
          meta: { version: '1.0', responseTime: `${responseTime}ms` }
        },
        { status: 403 }
      );
    }

    // Get trading pair
    const tradingPair = await prisma.tradingPair.findUnique({
      where: {
        cryptoCode_fiatCode: {
          cryptoCode: validated.currencyCode,
          fiatCode: validated.fiatCurrencyCode
        }
      }
    });

    if (!tradingPair || !tradingPair.isActive) {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 400, responseTime, 'Trading pair not available');

      return NextResponse.json(
        {
          success: false,
          error: 'Trading pair not available',
          meta: { version: '1.0', responseTime: `${responseTime}ms` }
        },
        { status: 400 }
      );
    }

    // Validate limits
    const limitsCheck = validateOrderLimits(
      validated.cryptoAmount,
      tradingPair.minCryptoAmount,
      tradingPair.maxCryptoAmount
    );

    if (!limitsCheck.valid) {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 400, responseTime, limitsCheck.error);

      return NextResponse.json(
        {
          success: false,
          error: limitsCheck.error,
          meta: { version: '1.0', responseTime: `${responseTime}ms` }
        },
        { status: 400 }
      );
    }

    // Get exchange rate
    const rate = await rateManagementService.getCurrentRate(
      validated.currencyCode,
      validated.fiatCurrencyCode
    );

    // Calculate order total
    const calculation = calculateOrderTotal(
      validated.cryptoAmount,
      rate,
      tradingPair.feePercent / 100
    );

    // Generate payment reference
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const paymentReference = `APR-${timestamp}-${random}`;

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create order
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        currencyCode: validated.currencyCode,
        fiatCurrencyCode: validated.fiatCurrencyCode,
        paymentReference,
        cryptoAmount: validated.cryptoAmount,
        fiatAmount: calculation.fiatAmount,
        rate: rate, // Use the rate from rateManagementService
        feePercent: tradingPair.feePercent,
        feeAmount: calculation.fee, // fee from calculation
        totalFiat: calculation.totalFiat,
        walletAddress: validated.walletAddress,
        paymentMethodCode: validated.paymentMethodCode,
        status: 'PENDING',
        expiresAt
      },
      include: {
        currency: true,
        fiatCurrency: true
      }
    });

    // Log order creation
    await auditService.logUserAction(
      user.id,
      AUDIT_ACTIONS.ORDER_CREATED,
      AUDIT_ENTITIES.ORDER,
      order.id,
      {
        source: 'API',
        apiKeyId: apiKey.id,
        paymentReference: order.paymentReference
      }
    );

    const responseTime = Date.now() - startTime;
    await logApiRequest(apiKey.id, request, 201, responseTime);

    return NextResponse.json({
      success: true,
      data: order,
      meta: {
        version: '1.0',
        responseTime: `${responseTime}ms`
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API v1 POST /orders] Error:', error);
    console.error('[API v1 POST /orders] Error message:', error?.message);
    console.error('[API v1 POST /orders] Error stack:', error?.stack);

    const responseTime = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      console.error('[API v1 POST /orders] Zod validation error:', error.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
          meta: { version: '1.0', responseTime: `${responseTime}ms` }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create order',
        details: error?.message || 'Unknown error',
        meta: { version: '1.0', responseTime: `${responseTime}ms` }
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate API key
    const authResult = await requireApiKey(request, 'orders', 'read');

    if (!authResult.authorized) {
      return authResult.error!;
    }

    const { apiKey } = authResult;

    // Get orders (for API key owner if userId is set)
    const where: Record<string, unknown> = {};
    
    if (apiKey.userId) {
      where.userId = apiKey.userId;
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    // Fetch orders
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          currency: true,
          fiatCurrency: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    const responseTime = Date.now() - startTime;
    await logApiRequest(apiKey.id, request, 200, responseTime);

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      meta: {
        version: '1.0',
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error) {
    console.error('API v1 get orders error:', error);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve orders',
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      },
      { status: 500 }
    );
  }
}

