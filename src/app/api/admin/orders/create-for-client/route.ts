/**
 * Admin Order Creation API
 * 
 * POST /api/admin/orders/create-for-client - Create order on behalf of client
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createAdminOrderSchema } from '@/lib/validations/admin-order';
import { rateManagementService } from '@/lib/services/rate-management.service';
import { calculateOrderTotal } from '@/lib/utils/order-calculations';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const body = await request.json();

    // Validate
    const validated = createAdminOrderSchema.parse(body);

    // Get admin ID
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validated.userEmail },
      include: {
        kycSession: true
      }
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    // Check KYC status
    if (!user.kycSession || user.kycSession.status !== 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'User must have approved KYC'
        },
        { status: 400 }
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
      return NextResponse.json(
        {
          success: false,
          error: 'Trading pair not available'
        },
        { status: 400 }
      );
    }

    // Get exchange rate (use custom rate if provided, otherwise get current rate)
    const rate = validated.customRate || 
                 await rateManagementService.getCurrentRate(
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

    // Calculate expiry (24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create order with history entry in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          currencyCode: validated.currencyCode,
          fiatCurrencyCode: validated.fiatCurrencyCode,
          paymentReference,
          cryptoAmount: validated.cryptoAmount,
          fiatAmount: calculation.fiatAmount,
          rate: calculation.rate,
          feePercent: tradingPair.feePercent,
          feeAmount: calculation.fee,
          totalFiat: calculation.totalFiat,
          walletAddress: validated.walletAddress,
          blockchainCode: validated.blockchainCode,
          paymentMethodCode: validated.paymentMethodCode,
          status: 'PENDING',
          createdByAdmin: true,
          adminNotes: validated.adminNotes,
          expiresAt
        },
        include: {
          currency: true,
          fiatCurrency: true,
          paymentMethod: true,
          blockchain: true,
          user: {
            include: {
              profile: true
            }
          }
        }
      });

      // Create initial status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          oldStatus: 'PENDING', // Initial status
          newStatus: 'PENDING',
          changedBy: adminId,
          note: `Order created by admin${validated.adminNotes ? `: ${validated.adminNotes}` : ''}`
        }
      });

      return newOrder;
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.ORDER_CREATED,
      AUDIT_ENTITIES.ORDER,
      order.id,
      {},
      {
        paymentReference: order.paymentReference,
        userId: user.id,
        userEmail: user.email,
        cryptoAmount: order.cryptoAmount,
        totalFiat: order.totalFiat,
        createdByAdmin: true
      }
    );

    // TODO: Send email notification to user

    return NextResponse.json({
      success: true,
      data: order
    }, { status: 201 });
  } catch (error) {
    console.error('Create admin order error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create order'
      },
      { status: 500 }
    );
  }
}

