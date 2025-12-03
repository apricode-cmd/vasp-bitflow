// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

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
import { virtualIbanService } from '@/lib/services/virtual-iban.service';
import { virtualIbanBalanceService } from '@/lib/services/virtual-iban-balance.service';
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

    // Find existing UserWallet by address and currency (case-insensitive)
    const userWallet = await prisma.userWallet.findFirst({
      where: {
        userId,
        address: {
          equals: validatedData.walletAddress,
          mode: 'insensitive'
        },
        currencyCode: validatedData.currencyCode
      }
    });

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
        userWalletId: userWallet?.id, // ✅ Link to existing wallet
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

    // Clear caches (new order created)
    await CacheService.clearAdminStats();
    await CacheService.deletePattern('admin:orders:*'); // Clear orders list cache
    
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

    // ==========================================
    // VIRTUAL_IBAN PAYMENT PROCESSING
    // ==========================================
    if (validatedData.paymentMethodCode === 'virtual_iban_balance') {
      try {
        console.log(`[ORDER] Processing Virtual IBAN payment for order ${order.id}`);
        
        // 1. Get user's Virtual IBAN account
        const virtualIbanAccounts = await virtualIbanService.getUserAccounts(userId);
        console.log(`[ORDER] Found ${virtualIbanAccounts.length} Virtual IBAN accounts for user ${userId}`);
        
        if (virtualIbanAccounts.length === 0) {
          // Rollback: Delete the order
          await prisma.order.delete({ where: { id: order.id } });
          console.error('[ORDER] No Virtual IBAN account found');
          return NextResponse.json({ 
            error: 'Virtual IBAN account not found. Please create one first.' 
          }, { status: 400 });
        }
        const account = virtualIbanAccounts[0];

        // 2. Check sufficient balance (with small tolerance for floating point precision)
        const requiredAmount = calculation.totalFiat;
        const availableBalance = account.balance; // Float
        const tolerance = 0.01; // 1 cent tolerance for floating point errors
        
        console.log(`[ORDER] Balance check: Required=${requiredAmount}, Available=${availableBalance}`);
        
        if (availableBalance < (requiredAmount - tolerance)) {
          // Rollback: Delete the order
          await prisma.order.delete({ where: { id: order.id } });
          console.error(`[ORDER] Insufficient balance: ${availableBalance} < ${requiredAmount}`);
          return NextResponse.json({ 
            error: 'Insufficient balance',
            required: requiredAmount,
            available: availableBalance,
            message: `Insufficient balance. Required: €${requiredAmount.toFixed(2)}, Available: €${availableBalance.toFixed(2)}`
          }, { status: 400 });
        }

        console.log(`[ORDER] Deducting ${requiredAmount} from account ${account.id}`);

        // 3. Deduct balance atomically
        const { transaction } = await virtualIbanBalanceService.deductBalance(
          account.id,
          requiredAmount,
          order.id,
          `Payment for order ${order.paymentReference || order.id}`
        );

        console.log(`[ORDER] Balance deducted, transaction created: ${transaction.id}`);

        // 4. Create PayIn record (instant - already reconciled)
        await prisma.payIn.create({
          data: {
            orderId: order.id,
            userId,
            amount: requiredAmount,
            expectedAmount: requiredAmount,
            receivedAmount: requiredAmount,
            fiatCurrencyCode: validatedData.fiatCurrencyCode,
            currencyType: 'FIAT',
            status: 'RECONCILED', // Already matched to order
            paymentMethodCode: 'virtual_iban_balance',
            transactionId: transaction.id,
            reference: order.paymentReference,
            paymentDate: new Date(),
            receivedDate: new Date(),
            reconciledAt: new Date(),
            reconciledBy: userId, // Reconciled by user (automatic)
            // initiatedBy and initiatedAt omitted - this is automatic payment, not admin-initiated
          }
        });

        // 5. Update Order status to PAYMENT_RECEIVED (ready for processing)
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: { 
            status: 'PAYMENT_RECEIVED',
            processedAt: new Date()
          },
          include: {
            currency: true,
            fiatCurrency: true,
            paymentMethod: true
          }
        });

        console.log(`[ORDER] Virtual IBAN payment completed instantly for order ${order.id}`);

        // Emit PAYMENT_COMPLETED event
        await eventEmitter.emit('PAYMENT_COMPLETED', {
          userId,
          recipientEmail: session.user.email || undefined,
          orderId: updatedOrder.id,
          amount: requiredAmount,
          currency: updatedOrder.fiatCurrencyCode,
          paymentMethod: 'VIRTUAL_IBAN',
        });

        return NextResponse.json({
          ...updatedOrder,
          paymentMethod: 'VIRTUAL_IBAN',
          balanceDeducted: requiredAmount,
          message: 'Payment completed instantly from your Virtual IBAN balance'
        }, { status: 201 });

      } catch (error) {
        console.error('[ORDER] Virtual IBAN payment failed:', error);
        
        // Rollback: Delete the order if it still exists
        try {
          await prisma.order.delete({ where: { id: order.id } });
        } catch (e) {
          // Order might already be deleted
        }
        
        return NextResponse.json({ 
          error: 'Payment processing failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Regular payment (bank transfer) - return pending order
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

