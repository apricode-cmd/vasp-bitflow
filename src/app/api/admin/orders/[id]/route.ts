/**
 * Admin Order Management API Route
 * 
 * PATCH /api/admin/orders/[id] - Update order status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { updateOrderStatusSchema } from '@/lib/validations/order';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  // Check admin authorization
  const authResult = await requireAdminRole('ADMIN');
  if (authResult instanceof NextResponse) {
    return authResult;
  const { session } = authResult;
  }

  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = updateOrderStatusSchema.parse(body);

    // Check if order exists with full data
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        payIn: true,
        payOut: true,
        currency: true,
        fiatCurrency: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const oldStatus = order.status;
    const newStatus = validatedData.status;

    // Smart status transition logic
    const requiresPayIn = oldStatus === 'PENDING' && newStatus === 'PAYMENT_PENDING';
    const requiresPayOut = oldStatus === 'PROCESSING' && newStatus === 'COMPLETED';

    // Validate required data for transitions
    if (requiresPayIn && !validatedData.payInData) {
      return NextResponse.json(
        { 
          error: 'PayIn data required',
          requiresPayIn: true,
          message: 'Please provide payment information to move order to Payment Received'
        },
        { status: 400 }
      );
    }

    if (requiresPayOut && !validatedData.payOutData) {
      return NextResponse.json(
        { 
          error: 'PayOut data required',
          requiresPayOut: true,
          message: 'Please provide payout information to complete the order'
        },
        { status: 400 }
      );
    }

    // Update order with transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Create PayIn if transitioning to PAYMENT_PENDING
      if (requiresPayIn && validatedData.payInData) {
        const payInExists = await tx.payIn.findUnique({
          where: { orderId: params.id }
        });

        if (!payInExists) {
          await tx.payIn.create({
            data: {
              orderId: params.id,
              userId: order.userId,
              amount: validatedData.payInData.amount,
              fiatCurrencyCode: validatedData.payInData.fiatCurrencyCode || order.fiatCurrencyCode,
              cryptocurrencyCode: validatedData.payInData.cryptocurrencyCode,
              currencyType: validatedData.payInData.currencyType,
              paymentMethodCode: validatedData.payInData.paymentMethodCode,
              expectedAmount: validatedData.payInData.expectedAmount || validatedData.payInData.amount,
              senderName: validatedData.payInData.senderName,
              senderAccount: validatedData.payInData.senderAccount,
              reference: validatedData.payInData.reference,
              status: 'RECEIVED'
            }
          });
        }
      }

      // Create PayOut if transitioning to COMPLETED
      if (requiresPayOut && validatedData.payOutData) {
        const payOutExists = await tx.payOut.findUnique({
          where: { orderId: params.id }
        });

        if (!payOutExists) {
          await tx.payOut.create({
            data: {
              orderId: params.id,
              userId: order.userId,
              amount: validatedData.payOutData.amount,
              fiatCurrencyCode: validatedData.payOutData.fiatCurrencyCode,
              cryptocurrencyCode: validatedData.payOutData.cryptocurrencyCode || order.currencyCode,
              currencyType: validatedData.payOutData.currencyType,
              networkCode: validatedData.payOutData.networkCode || order.blockchainCode,
              destinationAddress: validatedData.payOutData.destinationAddress || order.walletAddress,
              transactionHash: validatedData.payOutData.transactionHash,
              paymentMethodCode: validatedData.payOutData.paymentMethodCode,
              status: 'SENT',
              processedBy: session.user.id,
              processedAt: new Date()
            }
          });
        }
      }

      // Update order
      const updated = await tx.order.update({
        where: { id: params.id },
        data: {
          status: newStatus,
          adminNotes: validatedData.adminNotes,
          transactionHash: validatedData.transactionHash || validatedData.payOutData?.transactionHash,
          processedBy: session.user.id,
          processedAt: newStatus === 'COMPLETED' ? new Date() : order.processedAt
        },
        include: {
          user: {
            include: { profile: true }
          },
          currency: true,
          fiatCurrency: true,
          payIn: {
            include: {
              fiatCurrency: true,
              cryptocurrency: true,
              paymentMethod: true
            }
          },
          payOut: {
            include: {
              fiatCurrency: true,
              cryptocurrency: true,
              paymentMethod: true,
              network: true
            }
          }
        }
      });

      // Create status history entry
      if (oldStatus !== newStatus) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: params.id,
            oldStatus,
            newStatus,
            changedBy: session.user.id,
            note: validatedData.adminNotes
          }
        });
      }

      return updated;
    });

    // Log admin action
    await auditService.logAdminAction(
      session.user.id,
      AUDIT_ACTIONS.ORDER_STATUS_CHANGED,
      AUDIT_ENTITIES.ORDER,
      params.id,
      {
        status: oldStatus,
        adminNotes: order.adminNotes,
        transactionHash: order.transactionHash
      },
      {
        status: newStatus,
        adminNotes: validatedData.adminNotes,
        transactionHash: validatedData.transactionHash
      },
      {
        paymentReference: order.paymentReference,
        userId: order.userId
      }
    );

    // TODO: Send email notification to user about status change

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Admin update order error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    // Check admin authorization
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    const { session } = authResult;
    }

    const { id } = params;

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        paymentReference: true,
        userId: true,
        status: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Delete order (cascade will delete related PayIn, PayOut, StatusHistory, PaymentProofs)
    await prisma.order.delete({
      where: { id }
    });

    // Log admin action
    await auditService.logAdminAction(
      session.user.id,
      AUDIT_ACTIONS.ORDER_DELETED,
      AUDIT_ENTITIES.ORDER,
      id,
      order,
      {},
      {
        paymentReference: order.paymentReference,
        userId: order.userId
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Delete order error:', error);

    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}

