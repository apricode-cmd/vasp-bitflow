// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * PayOut API - GET /api/admin/pay-out
 * List all outgoing payments with filtering
 * POST /api/admin/pay-out - Create new PayOut manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { CacheService, redis } from '@/lib/services/cache.service';
import { z } from 'zod';
import { syncOrderOnPayOutCreate, type PayOutStatus } from '@/lib/services/order-status-sync.service';

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
  amount: z.number().positive(),
  destinationAddress: z.string().min(1),
  networkFee: z.number().optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'QUEUED', 'PROCESSING']).optional().default('PENDING'),
  destinationTag: z.string().optional(),
  explorerUrl: z.string().optional(),
  transactionHash: z.string().optional(),
  paymentMethodCode: z.string().optional()
});

// Generate cache key for pay-out list
function generateCacheKey(filters: any): string {
  const parts = ['pay-out-list'];
  if (filters.status) parts.push(`status:${filters.status}`);
  if (filters.orderId) parts.push(`order:${filters.orderId}`);
  if (filters.userId) parts.push(`user:${filters.userId}`);
  if (filters.currency) parts.push(`currency:${filters.currency}`);
  if (filters.networkCode) parts.push(`network:${filters.networkCode}`);
  if (filters.fromDate) parts.push(`from:${filters.fromDate}`);
  if (filters.toDate) parts.push(`to:${filters.toDate}`);
  parts.push(`page:${filters.page}`);
  parts.push(`limit:${filters.limit}`);
  return parts.join(':');
}

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

    // Try to get from cache
    const cacheKey = generateCacheKey(validated);
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`📦 [Redis] Cache HIT: ${cacheKey}`);
        return NextResponse.json(JSON.parse(cached));
      }
    } catch (cacheError) {
      console.error('Redis get error:', cacheError);
      // Continue without cache
    }

    console.log(`📦 [Redis] Cache MISS: ${cacheKey}`);

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

    const result = {
      success: true,
      data: payOuts,
      pagination: {
        total,
        page: validated.page,
        limit: validated.limit,
        pages: Math.ceil(total / validated.limit)
      }
    };

    // Cache for 5 minutes
    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
    } catch (cacheError) {
      console.error('Redis set error:', cacheError);
      // Continue without caching
    }

    return NextResponse.json(result);
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

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: validated.orderId },
      include: {
        user: true,
        currency: true,
        blockchain: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if PayOut already exists for this order
    const existingPayOut = await prisma.payOut.findUnique({
      where: { orderId: validated.orderId }
    });

    if (existingPayOut) {
      return NextResponse.json(
        { success: false, error: 'PayOut already exists for this order' },
        { status: 400 }
      );
    }

    // Get current admin session for tracking
    const session = sessionOrError as any;
    const adminId = session?.user?.id;

    // Prepare PayOut data (for BUY orders - sending crypto to customer)
    const payOutData: any = {
      order: { connect: { id: validated.orderId } },
      user: { connect: { id: order.userId } },
      amount: validated.amount,
      currencyType: 'CRYPTO', // Currently only crypto payouts
      cryptocurrency: { connect: { code: order.currencyCode } },
      network: order.blockchainCode ? { connect: { code: order.blockchainCode } } : undefined,
      destinationAddress: validated.destinationAddress,
      destinationTag: validated.destinationTag || undefined,
      transactionHash: validated.transactionHash || undefined,
      networkFee: validated.networkFee || 0,
      explorerUrl: validated.explorerUrl || undefined,
      processingNotes: validated.notes, // Correct field name from schema
      paymentMethod: validated.paymentMethodCode ? { connect: { code: validated.paymentMethodCode } } : undefined,
      status: validated.status || 'PENDING',
      retryCount: 0,
      confirmations: 0,
      initiatedAt: new Date(),
      initiatedBy: adminId || undefined,
      approvalRequired: true, // Manual approval required
      requiresStepUpMfa: false
    };

    // Remove undefined fields
    Object.keys(payOutData).forEach(key => {
      if (payOutData[key] === undefined) {
        delete payOutData[key];
      }
    });

    // Create PayOut and update Order status in a transaction
    const payOut = await prisma.$transaction(async (tx) => {
      // Create PayOut
      const newPayOut = await tx.payOut.create({
        data: payOutData,
        include: {
          order: {
            select: {
              id: true,
              paymentReference: true,
              cryptoAmount: true,
              currencyCode: true
            }
          },
          user: {
            select: {
              id: true,
              email: true
            }
          },
          cryptocurrency: true,
          network: true
        }
      });

      // Order status will be synced outside the transaction

      // Create audit log if admin ID is available
      if (adminId) {
        await tx.auditLog.create({
          data: {
            adminId,
            action: 'PAYOUT_CREATED',
            entity: 'PAYOUT',
            entityId: newPayOut.id,
            changes: {
              orderId: validated.orderId,
              amount: validated.amount,
              destinationAddress: validated.destinationAddress,
              status: validated.status || 'PENDING'
            },
            metadata: {
              orderReference: order.paymentReference,
              userEmail: order.user.email
            }
          }
        });
      }

      return newPayOut;
    });

    // Sync Order status based on PayOut status
    try {
      await syncOrderOnPayOutCreate(validated.orderId, (validated.status || 'PENDING') as PayOutStatus);
    } catch (syncError) {
      console.error('Order status sync error:', syncError);
      // Continue even if sync fails
    }

    // Invalidate cache
    await CacheService.clearAdminStats();
    await CacheService.deletePattern('admin:pay-out:*');
    await CacheService.deletePattern('admin:orders:*'); // Orders depend on PayOut

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

