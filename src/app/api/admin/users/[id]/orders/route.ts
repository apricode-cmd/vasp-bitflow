// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[id]/orders
 * 
 * Fetch all orders for a specific user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
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
  const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id: userId } = params;

    const orders = await prisma.order.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        paymentReference: true,
        cryptoAmount: true,
        totalFiat: true,
        status: true,
        createdAt: true,
        currency: {
          select: {
            code: true,
            name: true,
          },
        },
        fiatCurrency: {
          select: {
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('❌ Failed to fetch user orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders',
      },
      { status: 500 }
    );
  }
}
