import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/services/cache.service';
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
  currencyType: z.enum(['FIAT', 'CRYPTO']),
  fiatCurrencyCode: z.string().optional(),
  cryptocurrencyCode: z.string().optional(),
  expectedAmount: z.number().positive(),
  receivedAmount: z.number().positive(),
  paymentMethodCode: z.string().optional(),
  networkCode: z.string().optional(),
  senderName: z.string().optional(),
  senderAccount: z.string().optional(),
  senderBank: z.string().optional(),
  reference: z.string().optional(),
  transactionId: z.string().optional(),
  verificationNotes: z.string().optional(),
  status: z.enum(['PENDING', 'RECEIVED', 'VERIFIED', 'PARTIAL', 'MISMATCH', 'RECONCILED', 'FAILED', 'REFUNDED', 'EXPIRED']).optional()
});

// Generate cache key for pay-in list
function generateCacheKey(filters: any): string {
  const parts = ['pay-in-list'];
  if (filters.status) parts.push(`status:${filters.status}`);
  if (filters.orderId) parts.push(`order:${filters.orderId}`);
  if (filters.userId) parts.push(`user:${filters.userId}`);
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

    const { searchParams } = new URL(request.url);
    const filters = payInFiltersSchema.parse(Object.fromEntries(searchParams.entries()));

    const { status, orderId, userId, fromDate, toDate, page, limit } = filters;

    // Try to get from cache
    const cacheKey = generateCacheKey(filters);
    
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

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (orderId) {
      where.orderId = orderId;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    // Optimized query with select to reduce data transfer
    const [payIns, total] = await Promise.all([
      prisma.payIn.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderId: true,
          userId: true,
          amount: true,
          fiatCurrencyCode: true,
          cryptocurrencyCode: true,
          currencyType: true,
          paymentMethodCode: true,
          networkCode: true,
          status: true,
          expectedAmount: true,
          receivedAmount: true,
          amountMismatch: true,
          senderName: true,
          transactionId: true,
          verifiedBy: true,
          verifiedAt: true,
          paymentDate: true,
          createdAt: true,
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
          fiatCurrency: {
            select: {
              code: true,
              name: true,
              symbol: true
            }
          },
          cryptocurrency: {
            select: {
              code: true,
              name: true,
              symbol: true
            }
          },
          network: {
            select: {
              code: true,
              name: true
            }
          },
          paymentMethod: {
            select: {
              code: true,
              name: true
            }
          }
        }
      }),
      prisma.payIn.count({ where })
    ]);

    const response = {
      success: true,
      data: payIns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    // Cache the result for 2 minutes (shorter TTL for financial data)
    try {
      await redis.setex(cacheKey, 120, JSON.stringify(response));
      console.log(`📦 [Redis] Cached: ${cacheKey} (TTL: 120s)`);
    } catch (cacheError) {
      console.error('Redis set error:', cacheError);
      // Continue without caching
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get PayIns error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch PayIns'
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
    const { session } = sessionOrError;

    const body = await request.json();
    const validated = createPayInSchema.parse(body);

    console.log('🔍 Creating PayIn with data:', validated);

    // Validate order exists and get order details
    const order = await prisma.order.findUnique({
      where: { id: validated.orderId },
      select: { 
        id: true, 
        userId: true,
        fiatCurrencyCode: true,
        currencyCode: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Calculate amount mismatch (stored as boolean in DB)
    const amountMismatch = Math.abs(validated.receivedAmount - validated.expectedAmount) > 0.01;

    // Determine auto-status based on amount
    let autoStatus = validated.status || 'RECEIVED';
    if (amountMismatch) {
      if (validated.receivedAmount < validated.expectedAmount) {
        autoStatus = 'PARTIAL';
      } else if (validated.receivedAmount > validated.expectedAmount) {
        autoStatus = 'MISMATCH';
      }
    }

    // Prepare data based on currency type
    const payInData: any = {
      order: { connect: { id: validated.orderId } },
      user: { connect: { id: order.userId } },
      amount: validated.receivedAmount, // Main amount field (required by schema)
      expectedAmount: validated.expectedAmount,
      receivedAmount: validated.receivedAmount,
      currencyType: validated.currencyType,
      status: autoStatus,
      amountMismatch,
      confirmations: 0,
      senderName: validated.senderName,
      senderAccount: validated.senderAccount,
      senderBank: validated.senderBank,
      reference: validated.reference,
      transactionId: validated.transactionId,
      verificationNotes: validated.verificationNotes,
      initiatedBy: session.user.id,
      initiatedAt: new Date(),
      // Auto-verify if status is RECEIVED and amounts match
      ...(autoStatus === 'RECEIVED' && !amountMismatch ? {
        verifiedBy: session.user.id,
        verifiedAt: new Date()
      } : {})
    };

    // Connect currency relations explicitly based on type
    if (validated.currencyType === 'FIAT') {
      const fiatCode = validated.fiatCurrencyCode || order.fiatCurrencyCode;
      
      // Verify fiat currency exists
      const fiatCurrency = await prisma.fiatCurrency.findUnique({
        where: { code: fiatCode },
        select: { code: true }
      });
      
      if (!fiatCurrency) {
        return NextResponse.json(
          { success: false, error: `Fiat currency '${fiatCode}' not found` },
          { status: 404 }
        );
      }
      
      payInData.fiatCurrency = { connect: { code: fiatCode } };
      
      // Connect payment method only if provided and exists
      if (validated.paymentMethodCode) {
        const paymentMethodExists = await prisma.paymentMethod.findUnique({
          where: { code: validated.paymentMethodCode },
          select: { code: true }
        });
        if (paymentMethodExists) {
          payInData.paymentMethod = { connect: { code: validated.paymentMethodCode } };
        }
      }
    }
    
    // Always add cryptocurrency from order
    if (validated.cryptocurrencyCode || order.currencyCode) {
      const cryptoCode = validated.cryptocurrencyCode || order.currencyCode;
      
      const cryptocurrency = await prisma.currency.findUnique({
        where: { code: cryptoCode },
        select: { code: true }
      });
      
      if (cryptocurrency) {
        payInData.cryptocurrency = { connect: { code: cryptoCode } };
      }
    }
    
    // Connect blockchain network if provided
    if (validated.networkCode) {
      const networkExists = await prisma.blockchainNetwork.findUnique({
        where: { code: validated.networkCode },
        select: { code: true }
      });
      if (networkExists) {
        payInData.network = { connect: { code: validated.networkCode } };
      }
    }

    // Create PayIn
    const payIn = await prisma.payIn.create({
      data: payInData,
      include: {
        order: true,
        user: {
          select: {
            id: true,
            email: true
          }
        },
        fiatCurrency: true,
        cryptocurrency: true,
        network: true,
        paymentMethod: true
      }
    });

    // Invalidate cache for pay-in list
    try {
      const pattern = 'pay-in-list:*';
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`📦 [Redis] Invalidated ${keys.length} cache keys`);
      }
    } catch (cacheError) {
      console.error('Redis cache invalidation error:', cacheError);
    }

    return NextResponse.json({
      success: true,
      data: payIn,
      message: 'PayIn created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Create PayIn error:', error);
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
        error: 'Failed to create PayIn',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
