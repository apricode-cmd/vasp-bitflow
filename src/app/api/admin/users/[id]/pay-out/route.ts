// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[id]/pay-out
 * 
 * Fetch all Pay-Out (outgoing crypto payments) for a specific user
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

    const payOuts = await prisma.payOut.findMany({
      where: {
        order: {
          userId,
        },
      },
      select: {
        id: true,
        amount: true,
        cryptocurrencyCode: true,
        destinationAddress: true,
        status: true,
        transactionHash: true,
        createdAt: true,
        processedAt: true,
        confirmedAt: true,
        networkCode: true,
        order: {
          select: {
            id: true,
            paymentReference: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: payOuts,
    });
  } catch (error) {
    console.error('❌ Failed to fetch user pay-out:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pay-out data',
      },
      { status: 500 }
    );
  }
}

