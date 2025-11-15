// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Public API v1 - Order Details
 * 
 * GET /api/v1/orders/[id] - Get order status (requires API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey, logApiRequest } from '@/lib/middleware/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate API key
    const authResult = await requireApiKey(request, 'orders', 'read');

    if (!authResult.authorized) {
      return authResult.error!;
    }

    const { apiKey } = authResult;
    const { id } = await params;

    // Get order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        currency: true,
        fiatCurrency: true,
        paymentMethod: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10
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

    // Check if API key owner can access this order
    if (apiKey.userId && order.userId !== apiKey.userId) {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 403, responseTime, 'Access denied');

      return NextResponse.json(
        {
          success: false,
          error: 'Access denied',
          meta: {
            version: '1.0',
            responseTime: `${responseTime}ms`
          }
        },
        { status: 403 }
      );
    }

    const responseTime = Date.now() - startTime;
    await logApiRequest(apiKey.id, request, 200, responseTime);

    return NextResponse.json({
      success: true,
      data: order,
      meta: {
        version: '1.0',
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error) {
    console.error('API v1 get order error:', error);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve order',
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      },
      { status: 500 }
    );
  }
}

