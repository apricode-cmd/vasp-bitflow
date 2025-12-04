/**
 * Admin API - Get User Orders
 * 
 * GET /api/admin/users/[userId]/orders - Get orders for a specific user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check admin permission
    const result = await requireAdminRole('ADMIN');
    if (result instanceof NextResponse) {
      return result;
    }

    const { userId } = params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // Build where clause
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    // Get orders
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalFiat: true,
        currency: true,
        cryptoCurrency: true,
        cryptoAmount: true,
        paymentReference: true,
        createdAt: true,
      },
      take: 50, // Limit to recent 50 orders
    });

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('[API] Get user orders failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user orders', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

