// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Orders Statistics API
 * GET /api/admin/orders/stats - Get order statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { CacheService } from '@/lib/services/cache.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check admin authorization
  const authResult = await requireAdminRole('ADMIN');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Try to get from cache
    const cacheKey = 'admin:orders:stats';
    const cached = await CacheService.get(cacheKey);
    
    if (cached) {
      return NextResponse.json({
        success: true,
        stats: cached,
        cached: true
      });
    }

    // Get current date for "today" calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parallel queries for better performance
    const [
      totalOrders,
      totalVolume,
      pendingCount,
      completedToday,
      processingCount,
      averageOrderValue
    ] = await Promise.all([
      // Total orders count
      prisma.order.count(),

      // Total volume (sum of all completed orders)
      prisma.order.aggregate({
        where: {
          status: 'COMPLETED'
        },
        _sum: {
          totalFiat: true
        }
      }),

      // Pending orders count
      prisma.order.count({
        where: {
          OR: [
            { status: 'PENDING' },
            { status: 'PAYMENT_PENDING' },
            { status: 'PAYMENT_RECEIVED' }
          ]
        }
      }),

      // Completed today
      prisma.order.count({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: today
          }
        }
      }),

      // Processing count
      prisma.order.count({
        where: {
          status: 'PROCESSING'
        }
      }),

      // Average order value
      prisma.order.aggregate({
        _avg: {
          totalFiat: true
        }
      })
    ]);

    const stats = {
      totalOrders,
      totalVolume: totalVolume._sum.totalFiat || 0,
      pendingCount,
      completedToday,
      processingCount,
      averageOrderValue: averageOrderValue._avg.totalFiat || 0
    };

    // Cache for 5 minutes
    await CacheService.set(cacheKey, stats, 300);

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('[Orders Stats API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order statistics' },
      { status: 500 }
    );
  }
}

