/**
 * Public API v1 - Orders
 * 
 * POST /api/v1/orders - Create new order (requires API key)
 * GET /api/v1/orders - List orders (requires API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey, logApiRequest } from '@/lib/middleware/api-auth';
import prisma from '@/lib/prisma';
import { createOrderSchema } from '@/lib/validations/order';
import { rateManagementService } from '@/lib/services/rate-management.service';
import { calculateOrderTotal, validateOrderLimits } from '@/lib/utils/order-calculations';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

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

    // Extend validation to require userEmail for API-created orders
    const extendedSchema = createOrderSchema.extend({
      userEmail: z.string().email()
    });

    const validated = extendedSchema.parse(body);

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
      validated.amount,
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
      validated.amount,
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
        cryptoAmount: validated.amount,
        fiatAmount: calculation.fiatAmount,
        rate: calculation.rate,
        feePercent: tradingPair.feePercent,
        feeAmount: calculation.fee,
        totalFiat: calculation.totalFiat,
        walletAddress: validated.walletAddress,
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
  } catch (error) {
    console.error('API v1 create order error:', error);

    const responseTime = Date.now() - startTime;

    if (error instanceof z.ZodError) {
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

