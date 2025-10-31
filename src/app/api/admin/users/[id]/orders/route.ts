/**
 * User Orders API
 * 
 * GET /api/admin/users/[id]/orders - Get user's orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ordersQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20)
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id: userId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query
    const query = {
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined
    };

    const validated = ordersQuerySchema.parse(query);

    // Build where clause
    const where: Record<string, unknown> = { userId };
    if (validated.status) {
      where.status = validated.status;
    }

    // Calculate pagination
    const skip = (validated.page - 1) * validated.limit;

    // Fetch orders
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          currency: true,
          fiatCurrency: true,
          paymentMethod: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: validated.limit
      }),
      prisma.order.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages: Math.ceil(total / validated.limit)
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve user orders'
      },
      { status: 500 }
    );
  }
}

