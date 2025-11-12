/**
 * Order Status History API Route
 * 
 * GET /api/admin/orders/[id]/history - Get order status history
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  // Check admin authorization
  const authResult = await requireAdminRole('ADMIN');
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { session } = authResult;

  try {
    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: params.id }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Fetch status history
    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: params.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Failed to fetch order history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

