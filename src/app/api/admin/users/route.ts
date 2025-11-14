/**
 * Admin Users Management API
 * 
 * GET /api/admin/users - List all users with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/services/cache.service';
import { z } from 'zod';

const usersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['CLIENT', 'ADMIN']).optional(),
  isActive: z.coerce.boolean().optional(),
  kycStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20)
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      kycStatus: searchParams.get('kycStatus') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined
    };

    // Validate
    const validated = usersQuerySchema.parse(params);

    // Generate cache key (не кешируем если есть поиск - динамично)
    const cacheKey = validated.search 
      ? null 
      : `users-list:${validated.role || 'all'}:${validated.isActive ?? 'all'}:${validated.kycStatus || 'all'}:${validated.page}:${validated.limit}`;
    
    // Try to get from cache (only if no search query)
    if (cacheKey) {
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
    }

    // Build where clause
    const where: Record<string, unknown> = {};

    if (validated.search) {
      where.OR = [
        { email: { contains: validated.search, mode: 'insensitive' } },
        {
          profile: {
            OR: [
              { firstName: { contains: validated.search, mode: 'insensitive' } },
              { lastName: { contains: validated.search, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }

    if (validated.role) {
      where.role = validated.role;
    }

    if (validated.isActive !== undefined) {
      where.isActive = validated.isActive;
    }

    if (validated.kycStatus) {
      where.kycSession = {
        status: validated.kycStatus
      };
    }

    // Calculate pagination
    const skip = (validated.page - 1) * validated.limit;

    // Optimized query with select instead of include
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              phoneNumber: true,
              country: true,
            }
          },
          kycSession: {
            select: {
              status: true,
              submittedAt: true,
              reviewedAt: true
            }
          },
          orders: {
            select: {
              totalFiat: true,
              status: true
            }
          },
          _count: {
            select: {
              orders: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: validated.limit
      }),
      prisma.user.count({ where })
    ]);

    // Calculate totalSpent for each user
    const usersWithStats = users.map(user => {
      const totalSpent = user.orders
        .filter(order => order.status === 'COMPLETED')
        .reduce((sum, order) => sum + Number(order.totalFiat), 0);

      const { orders, ...userWithoutOrders } = user;

      return {
        ...userWithoutOrders,
        totalSpent,
      };
    });

    const response = {
      success: true,
      data: usersWithStats,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages: Math.ceil(total / validated.limit)
      }
    };

    // Cache the result for 2 minutes (only if no search query)
    if (cacheKey) {
      try {
        await redis.setex(cacheKey, 120, JSON.stringify(response));
        console.log(`📦 [Redis] Cached: ${cacheKey} (TTL: 120s)`);
      } catch (cacheError) {
        console.error('Redis set error:', cacheError);
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get users error:', error);

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
        error: 'Failed to retrieve users'
      },
      { status: 500 }
    );
  }
}

