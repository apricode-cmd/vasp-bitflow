// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[id]/orders
 *
 * Fetch orders for a specific user (with optional status filter).
 * Used by:
 * - Admin Users → Orders tab
 * - Virtual IBAN manual reconciliation dialog
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
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    // Authorization
    const auth = await requireAdminRole('ADMIN');
    if (auth instanceof NextResponse) {
      return auth;
    }

    const { id: userId } = params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: { userId: string; status?: string } = { userId };
    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50, // limit to recent orders
      select: {
        id: true,
        status: true,
        totalFiat: true,
        cryptoAmount: true,
        currencyCode: true, // Crypto currency code
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
        paymentReference: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('[API] Get user orders failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
