/**
 * PayOut API - GET /api/admin/pay-out
 * List all outgoing payments with filtering
 * POST /api/admin/pay-out - Create new PayOut manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const payOutFiltersSchema = z.object({
  status: z.string().optional(),
  orderId: z.string().optional(),
  userId: z.string().optional(),
  currency: z.string().optional(),
  networkCode: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50)
});

const createPayOutSchema = z.object({
  orderId: z.string(),
  userId: z.string(),
  amount: z.number().positive(),
  currency: z.string(),
  currencyType: z.enum(['FIAT', 'CRYPTO']),
  networkCode: z.string().optional(),
  destinationAddress: z.string().optional(),
  paymentMethodCode: z.string().optional(),
  recipientAccount: z.string().optional(),
  recipientName: z.string().optional()
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Parse filters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      status: searchParams.get('status') || undefined,
      orderId: searchParams.get('orderId') || undefined,
      userId: searchParams.get('userId') || undefined,
      currency: searchParams.get('currency') || undefined,
      networkCode: searchParams.get('networkCode') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined
    };

    const validated = payOutFiltersSchema.parse(params);

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

    if (validated.currency) {
      // Support filtering by either fiat or crypto currency
      where.OR = [
        { fiatCurrencyCode: validated.currency },
        { cryptocurrencyCode: validated.currency }
      ];
    }

    if (validated.networkCode) {
      where.networkCode = validated.networkCode;
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
    const [total, payOuts] = await Promise.all([
      prisma.payOut.count({ where }),
      prisma.payOut.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              paymentReference: true,
              cryptoAmount: true,
              fiatAmount: true,
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
          cryptocurrency: {
            select: {
              code: true,
              name: true,
              symbol: true
            }
          },
          fiatCurrency: {
            select: {
              code: true,
              name: true,
              symbol: true
            }
          },
          network: {
            select: {
              code: true,
              name: true,
              explorerUrl: true
            }
          },
          processor: {
            select: {
              id: true,
              email: true
            }
          },
          platformWallet: {
            select: {
              id: true,
              label: true,
              address: true
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
      data: payOuts,
      pagination: {
        total,
        page: validated.page,
        limit: validated.limit,
        pages: Math.ceil(total / validated.limit)
      }
    });
  } catch (error) {
    console.error('Get PayOut error:', error);

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
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const body = await request.json();
    const validated = createPayOutSchema.parse(body);

    // Prepare data based on currency type
    const payOutData: any = {
      order: { connect: { id: validated.orderId } },
      user: { connect: { id: validated.userId } },
      amount: validated.amount,
      currencyType: validated.currencyType,
      status: 'PENDING',
      retryCount: 0,
      confirmations: 0
    };

    // Connect currency relations explicitly based on type
    if (validated.currencyType === 'FIAT') {
      payOutData.fiatCurrency = { connect: { code: validated.currency } };
      if (validated.paymentMethodCode) {
        // Check if payment method exists
        const paymentMethodExists = await prisma.paymentMethod.findUnique({
          where: { code: validated.paymentMethodCode },
          select: { code: true }
        });
        if (paymentMethodExists) {
          payOutData.paymentMethod = { connect: { code: validated.paymentMethodCode } };
        }
      }
      if (validated.recipientAccount) {
        payOutData.recipientAccount = validated.recipientAccount;
      }
      if (validated.recipientName) {
        payOutData.recipientName = validated.recipientName;
      }
    } else {
      payOutData.cryptocurrency = { connect: { code: validated.currency } };
      if (validated.networkCode) {
        // Check if network exists
        const networkExists = await prisma.blockchainNetwork.findUnique({
          where: { code: validated.networkCode },
          select: { code: true }
        });
        if (networkExists) {
          payOutData.network = { connect: { code: validated.networkCode } };
        }
      }
      if (validated.destinationAddress) {
        payOutData.destinationAddress = validated.destinationAddress;
      }
    }

    // Create PayOut
    const payOut = await prisma.payOut.create({
      data: payOutData,
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
      data: payOut,
      message: 'PayOut created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Create PayOut error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));

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
        error: 'Failed to create PayOut',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

