/**
 * PayIn Statistics API
 * GET /api/admin/pay-in/stats - Get PayIn statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/services/cache.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Generate cache key
    const cacheKey = 'payin-stats';
    
    // Try to get from cache
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

    // Get all PayIns with aggregations
    const [
      totalPayIns,
      pendingCount,
      receivedCount,
      verifiedCount,
      failedCount,
      totalAmountResult,
      recentPayIns,
    ] = await Promise.all([
      // Total count
      prisma.payIn.count(),
      
      // Pending count
      prisma.payIn.count({
        where: { status: 'PENDING' }
      }),
      
      // Received count
      prisma.payIn.count({
        where: { status: 'RECEIVED' }
      }),
      
      // Verified count
      prisma.payIn.count({
        where: { status: 'VERIFIED' }
      }),
      
      // Failed count
      prisma.payIn.count({
        where: { status: 'FAILED' }
      }),
      
      // Total verified amount (aggregate)
      prisma.payIn.aggregate({
        where: {
          status: { in: ['VERIFIED', 'RECONCILED'] },
          currencyType: 'FIAT' // Focus on FIAT for now
        },
        _sum: {
          amount: true
        }
      }),
      
      // Recent PayIns (last 24h)
      prisma.payIn.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Calculate amounts mismatch
    const amountMismatches = await prisma.payIn.count({
      where: { amountMismatch: true }
    });

    // Calculate success rate
    const successRate = totalPayIns > 0 
      ? ((verifiedCount / totalPayIns) * 100).toFixed(1)
      : '0.0';

    const response = {
      success: true,
      data: {
        total: totalPayIns,
        pending: pendingCount,
        received: receivedCount,
        verified: verifiedCount,
        failed: failedCount,
        totalAmount: totalAmountResult._sum.amount || 0,
        recentCount: recentPayIns,
        amountMismatches,
        successRate: parseFloat(successRate),
      }
    };

    // Cache for 2 minutes
    try {
      await redis.setex(cacheKey, 120, JSON.stringify(response));
      console.log(`📦 [Redis] Cached: ${cacheKey} (TTL: 120s)`);
    } catch (cacheError) {
      console.error('Redis set error:', cacheError);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get PayIn stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch PayIn statistics'
      },
      { status: 500 }
    );
  }
}

