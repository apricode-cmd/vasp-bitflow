/**
 * Public API v1 - Cancel Order
 * 
 * POST /api/v1/orders/[id]/cancel - Cancel an order (requires API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey, logApiRequest } from '@/lib/middleware/api-auth';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const cancelOrderSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate API key
    const authResult = await requireApiKey(request, 'orders', 'cancel');

    if (!authResult.authorized) {
      return authResult.error!;
    }

    const { apiKey } = authResult;
    const { id: orderId } = await params;

    const body = await request.json().catch(() => ({}));
    const validated = cancelOrderSchema.parse(body);

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    if (!order) {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 404, responseTime, 'Order not found');

      return NextResponse.json(
        {
          success: false,
          error: 'Order not found',
          meta: {
            version: '1.0',
            responseTime: `${responseTime}ms`
          }
        },
        { status: 404 }
      );
    }

    // Check if API key owner can cancel this order
    if (apiKey.userId && order.userId !== apiKey.userId) {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 403, responseTime, 'Access denied');

      return NextResponse.json(
        {
          success: false,
          error: 'Access denied',
          message: 'You do not have permission to cancel this order',
          meta: {
            version: '1.0',
            responseTime: `${responseTime}ms`
          }
        },
        { status: 403 }
      );
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['PENDING', 'AWAITING_PAYMENT'];
    if (!cancellableStatuses.includes(order.status)) {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 400, responseTime, 'Order cannot be cancelled');

      return NextResponse.json(
        {
          success: false,
          error: 'Order cannot be cancelled',
          message: `Orders with status "${order.status}" cannot be cancelled. Only PENDING and AWAITING_PAYMENT orders can be cancelled.`,
          meta: {
            version: '1.0',
            responseTime: `${responseTime}ms`
          }
        },
        { status: 400 }
      );
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        statusHistory: {
          create: {
            status: 'CANCELLED',
            note: validated.reason || 'Cancelled via API',
            changedBy: 'API'
          }
        }
      },
      include: {
        currency: true,
        fiatCurrency: true
      }
    });

    // Audit log
    await auditService.logUserAction(
      order.userId,
      AUDIT_ACTIONS.ORDER_CANCELLED,
      AUDIT_ENTITIES.ORDER,
      orderId,
      {
        reason: validated.reason,
        apiKeyId: apiKey.id,
        previousStatus: order.status
      }
    );

    const responseTime = Date.now() - startTime;
    await logApiRequest(apiKey.id, request, 200, responseTime);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        cancelledAt: new Date().toISOString(),
        reason: validated.reason,
        message: 'Order cancelled successfully'
      },
      meta: {
        version: '1.0',
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error: any) {
    console.error('API v1 cancel order error:', error);

    const responseTime = Date.now() - startTime;

    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
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
        error: 'Failed to cancel order',
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      },
      { status: 500 }
    );
  }
}

