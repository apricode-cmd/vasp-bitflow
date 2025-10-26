/**
 * PayIn API - GET /api/admin/pay-in
 * List all incoming payments with filtering
 * POST /api/admin/pay-in - Create new PayIn manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const payInFiltersSchema = z.object({
  status: z.string().optional(),
  orderId: z.string().optional(),
  userId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50)
});

const createPayInSchema = z.object({
  orderId: z.string(),
  userId: z.string(),
  amount: z.number().positive(),
  currency: z.string(),
  currencyType: z.enum(['FIAT', 'CRYPTO']),
  paymentMethodCode: z.string().optional(),
  networkCode: z.string().optional(),
  expectedAmount: z.number().positive().optional()
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Parse filters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      status: searchParams.get('status') || undefined,
      orderId: searchParams.get('orderId') || undefined,
      userId: searchParams.get('userId') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined
    };

    const validated = payInFiltersSchema.parse(params);

    // Build where clause
    const where: any = {};

    if (validated.status) {
      where.status = validated.status;
    }

    if (validated.orderId) {
      where.orderId = validated.orderId;
    }

    if (validated.userId) {
      where.userId = validated.userId;
    }

    if (validated.fromDate || validated.toDate) {
      where.createdAt = {};
      if (validated.fromDate) {
        where.createdAt.gte = new Date(validated.fromDate);
      }
      if (validated.toDate) {
        where.createdAt.lte = new Date(validated.toDate);
      }
    }

    // Get total count and data
    const [total, payIns] = await Promise.all([
      prisma.payIn.count({ where }),
      prisma.payIn.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              paymentReference: true,
              cryptoAmount: true,
              currencyCode: true,
              fiatCurrencyCode: true
            }
          },
          user: {
            select: {
              id: true,
              email: true
            }
          },
          fiatCurrency: {
            select: {
              code: true,
              name: true,
              symbol: true
            }
          },
          paymentMethod: {
            select: {
              code: true,
              name: true
            }
          },
          verifier: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (validated.page - 1) * validated.limit,
        take: validated.limit
      })
    ]);

    return NextResponse.json({
      success: true,
      data: payIns,
      pagination: {
        total,
        page: validated.page,
        limit: validated.limit,
        pages: Math.ceil(total / validated.limit)
      }
    });
  } catch (error) {
    console.error('Get PayIn error:', error);

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
        error: 'Failed to retrieve payments'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const body = await request.json();
    const validated = createPayInSchema.parse(body);

    // Create PayIn
    const payIn = await prisma.payIn.create({
      data: {
        orderId: validated.orderId,
        userId: validated.userId,
        amount: validated.amount,
        currency: validated.currency,
        currencyType: validated.currencyType,
        paymentMethodCode: validated.paymentMethodCode || null,
        networkCode: validated.networkCode || null,
        expectedAmount: validated.expectedAmount || validated.amount,
        status: 'PENDING',
        amountMismatch: false,
        confirmations: 0
      },
      include: {
        order: true,
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: payIn,
      message: 'PayIn created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Create PayIn error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create PayIn'
      },
      { status: 500 }
    );
  }
}

