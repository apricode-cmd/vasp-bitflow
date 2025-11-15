// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[id]/pay-in
 * 
 * Fetch all Pay-In (incoming fiat payments) for a specific user
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

    const payIns = await prisma.payIn.findMany({
      where: {
        order: {
          userId,
        },
      },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        verifiedAt: true,
        fiatCurrency: {
          select: {
            code: true,
          },
        },
        order: {
          select: {
            id: true,
            paymentReference: true,
          },
        },
        paymentMethod: {
          select: {
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: payIns,
    });
  } catch (error) {
    console.error('❌ Failed to fetch user pay-in:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pay-in data',
      },
      { status: 500 }
    );
  }
}

