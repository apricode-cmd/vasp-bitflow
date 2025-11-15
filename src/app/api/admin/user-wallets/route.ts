// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin User Wallets API
 * 
 * GET /api/admin/user-wallets - List all user wallets
 * POST /api/admin/user-wallets - Create new user wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/services/cache.service';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const createUserWalletSchema = z.object({
  userId: z.string().cuid(),
  blockchainCode: z.string().min(2).max(20),
  currencyCode: z.string().min(2).max(10),
  address: z.string().min(26).max(100),
  label: z.string().min(1).max(100).optional(),
  isVerified: z.boolean().default(false),
  isDefault: z.boolean().default(false)
});

// Generate cache key for wallets list
function generateCacheKey(filters: any): string {
  const parts = ['user-wallets-list'];
  if (filters.userId) parts.push(`user:${filters.userId}`);
  if (filters.blockchainCode) parts.push(`blockchain:${filters.blockchainCode}`);
  if (filters.currencyCode) parts.push(`currency:${filters.currencyCode}`);
  if (filters.isVerified !== undefined) parts.push(`verified:${filters.isVerified}`);
  if (filters.isDefault !== undefined) parts.push(`default:${filters.isDefault}`);
  if (filters.search) parts.push(`search:${filters.search}`);
  parts.push(`page:${filters.page || 1}`);
  parts.push(`limit:${filters.limit || 50}`);
  return parts.join(':');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      userId: searchParams.get('userId') || undefined,
      blockchainCode: searchParams.get('blockchainCode') || undefined,
      currencyCode: searchParams.get('currencyCode') || undefined,
      isVerified: searchParams.get('isVerified') === 'true' ? true : searchParams.get('isVerified') === 'false' ? false : undefined,
      isDefault: searchParams.get('isDefault') === 'true' ? true : searchParams.get('isDefault') === 'false' ? false : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50')
    };

    // Try cache first
    const cacheKey = generateCacheKey(filters);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`📦 [Redis] Cache HIT: ${cacheKey}`);
        return NextResponse.json(JSON.parse(cached));
      }
    } catch (cacheError) {
      console.error('Redis get error:', cacheError);
    }

    console.log(`📦 [Redis] Cache MISS: ${cacheKey}`);

    // Build where clause
    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.blockchainCode) where.blockchainCode = filters.blockchainCode;
    if (filters.currencyCode) where.currencyCode = filters.currencyCode;
    if (filters.isVerified !== undefined) where.isVerified = filters.isVerified;
    if (filters.isDefault !== undefined) where.isDefault = filters.isDefault;
    
    // Search by address or user email
    if (filters.search) {
      where.OR = [
        { address: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { label: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // Get total count and wallets in parallel
    const [total, wallets] = await Promise.all([
      prisma.userWallet.count({ where }),
      prisma.userWallet.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          blockchain: {
            select: {
              code: true,
              name: true,
              explorerUrl: true
            }
          },
          currency: {
            select: {
              code: true,
              name: true,
              symbol: true
            }
          },
          _count: {
            select: {
              orders: true
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' }
        ],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit
      })
    ]);

    const result = {
      success: true,
      data: wallets,
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        pages: Math.ceil(total / filters.limit)
      }
    };

    // Cache for 5 minutes
    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
    } catch (cacheError) {
      console.error('Redis set error:', cacheError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get user wallets error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve user wallets'
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

    // Validate
    const validated = createUserWalletSchema.parse(body);

    // Get admin ID
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: validated.userId }
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    // Verify blockchain exists
    const blockchain = await prisma.blockchainNetwork.findUnique({
      where: { code: validated.blockchainCode }
    });

    if (!blockchain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blockchain network not found'
        },
        { status: 404 }
      );
    }

    // Verify currency exists
    const currency = await prisma.currency.findUnique({
      where: { code: validated.currencyCode }
    });

    if (!currency) {
      return NextResponse.json(
        {
          success: false,
          error: 'Currency not found'
        },
        { status: 404 }
      );
    }

    // Check if wallet already exists
    const existing = await prisma.userWallet.findUnique({
      where: {
        userId_address: {
          userId: validated.userId,
          address: validated.address
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet with this address already exists for this user'
        },
        { status: 400 }
      );
    }

    // If isDefault is true, unset other default wallets for this user/currency
    if (validated.isDefault) {
      await prisma.userWallet.updateMany({
        where: {
          userId: validated.userId,
          currencyCode: validated.currencyCode,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    // Create user wallet
    const wallet = await prisma.userWallet.create({
      data: validated,
      include: {
        user: {
          select: {
            email: true
          }
        },
        blockchain: true,
        currency: true
      }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.SYSTEM_SETTINGS,
      wallet.id,
      {},
      {
        userId: wallet.userId,
        address: wallet.address,
        blockchain: wallet.blockchainCode,
        currency: wallet.currencyCode
      },
      { entity: 'UserWallet', action: 'created' }
    );

    // Invalidate cache
    try {
      const keys = await redis.keys('user-wallets-*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`🗑️ [Redis] Invalidated ${keys.length} wallet cache keys`);
      }
    } catch (cacheError) {
      console.error('Redis cache invalidation error:', cacheError);
    }

    return NextResponse.json({
      success: true,
      data: wallet
    }, { status: 201 });
  } catch (error) {
    console.error('Create user wallet error:', error);

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
        error: 'Failed to create user wallet'
      },
      { status: 500 }
    );
  }
}

