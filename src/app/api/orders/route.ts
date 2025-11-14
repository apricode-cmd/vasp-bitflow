/**
 * Orders API Routes
 * 
 * POST /api/orders - Create a new order
 * GET /api/orders - List user's orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createOrderSchema } from '@/lib/validations/order';
import { rateManagementService } from '@/lib/services/rate-management.service';
import { calculateOrderTotal, validateOrderLimits } from '@/lib/utils/order-calculations';
import { orderLimitService } from '@/lib/services/order-limit.service';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { userActivityService } from '@/lib/services/user-activity.service';
import { eventEmitter } from '@/lib/services/event-emitter.service';
import { CacheService } from '@/lib/services/cache.service';
import { z } from 'zod';

/**
 * POST - Create new order
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const { error, session } = await requireAuth();
  if (error) return error;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const userId = session.user.id;

    // Validate input
    const validatedData = createOrderSchema.parse(body);

    // Get trading pair with limits
    const tradingPair = await prisma.tradingPair.findUnique({
      where: {
        cryptoCode_fiatCode: {
          cryptoCode: validatedData.currencyCode,
          fiatCode: validatedData.fiatCurrencyCode
        }
      },
      include: {
        crypto: true,
        fiat: true
      }
    });

    if (!tradingPair || !tradingPair.isActive) {
      return NextResponse.json(
        { error: 'Trading pair not available' },
        { status: 400 }
      );
    }

    // Get current exchange rate (includes manual overrides)
    const rate = await rateManagementService.getCurrentRate(
      validatedData.currencyCode,
      validatedData.fiatCurrencyCode
    );

    // Calculate order total using trading pair fee
    const calculation = calculateOrderTotal(
      validatedData.cryptoAmount,
      rate,
      tradingPair.feePercent / 100 // Convert percentage to decimal
    );

    // Check order limits based on KYC status and 24h limit
    const limitCheck = await orderLimitService.checkOrderLimit(
      userId,
      calculation.totalFiat
    );

    if (!limitCheck.allowed) {
      return NextResponse.json(
        { 
          error: limitCheck.message,
          details: {
            used: limitCheck.used,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining
          }
        },
        { status: 403 }
      );
    }

    // Validate crypto amount limits
    const cryptoLimitsCheck = validateOrderLimits(
      validatedData.cryptoAmount,
      tradingPair.minCryptoAmount,
      tradingPair.maxCryptoAmount
    );

    if (!cryptoLimitsCheck.valid) {
      return NextResponse.json(
        { error: cryptoLimitsCheck.error },
        { status: 400 }
      );
    }

    // Generate unique payment reference
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const paymentReference = `APR-${timestamp}-${random}`;

    // Calculate expiry time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create order
    const order = await prisma.order.create({
      data: {
        userId,
        currencyCode: validatedData.currencyCode,
        fiatCurrencyCode: validatedData.fiatCurrencyCode,
        paymentReference,
        cryptoAmount: validatedData.cryptoAmount,
        fiatAmount: calculation.fiatAmount,
        rate: calculation.rate,
        feePercent: tradingPair.feePercent,
        feeAmount: calculation.fee,
        totalFiat: calculation.totalFiat,
        walletAddress: validatedData.walletAddress,
        paymentMethodCode: validatedData.paymentMethodCode,
        blockchainCode: validatedData.blockchainCode,
        status: 'PENDING',
        expiresAt
      },
      include: {
        currency: true,
        fiatCurrency: true
      }
    });

    // Clear admin stats cache (new order created)
    await CacheService.clearAdminStats();
    
    // Log order creation with FULL details
    await userActivityService.logOrderCreated(
      userId,
      session.user.email || 'unknown',
      order.id,
      {
        amount: order.cryptoAmount,
        currency: order.currencyCode,
        fiatCurrency: order.fiatCurrencyCode,
        paymentMethod: order.paymentMethodCode || undefined
      }
    );

    // Also log to old audit service for backward compatibility
    await auditService.logUserAction(
      userId,
      AUDIT_ACTIONS.ORDER_CREATED,
      AUDIT_ENTITIES.ORDER,
      order.id,
      {
        paymentReference: order.paymentReference,
        cryptoAmount: order.cryptoAmount,
        currencyCode: order.currencyCode,
        totalFiat: order.totalFiat,
        fiatCurrencyCode: order.fiatCurrencyCode
      }
    );

    // Emit ORDER_CREATED event for notifications
    await eventEmitter.emit('ORDER_CREATED', {
      userId,
      recipientEmail: session.user.email || undefined, // ✅ Add email for notification
      orderId: order.id,
      amount: order.totalFiat,
      currency: order.fiatCurrencyCode,
      cryptoAmount: order.cryptoAmount,
      cryptoCurrency: order.currencyCode,
      walletAddress: order.walletAddress,
      paymentReference: order.paymentReference,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

/**
 * GET - List user's orders
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const { error, session } = await requireAuth();
  if (error) return error;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get('status');

    // Build where clause
    const where: Record<string, unknown> = { userId };
    if (status) {
      where.status = status;
    }

    // Get orders
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

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

