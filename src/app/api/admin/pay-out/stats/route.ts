/**
 * PayOut Statistics API
 * GET /api/admin/pay-out/stats - Get PayOut statistics
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
    const cacheKey = 'payout-stats';
    
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

    // Get all PayOuts with aggregations
    const [
      totalPayOuts,
      pendingCount,
      queuedCount,
      sentCount,
      confirmedCount,
      failedCount,
      totalAmountResult,
      recentPayOuts,
    ] = await Promise.all([
      // Total count
      prisma.payOut.count(),
      
      // Pending count
      prisma.payOut.count({
        where: { status: 'PENDING' }
      }),
      
      // Queued count
      prisma.payOut.count({
        where: { status: 'QUEUED' }
      }),
      
      // Sent count
      prisma.payOut.count({
        where: { status: { in: ['SENT', 'CONFIRMING'] } }
      }),
      
      // Confirmed count
      prisma.payOut.count({
        where: { status: 'CONFIRMED' }
      }),
      
      // Failed count
      prisma.payOut.count({
        where: { status: 'FAILED' }
      }),
      
      // Total confirmed amount (aggregate)
      prisma.payOut.aggregate({
        where: {
          status: 'CONFIRMED',
          currencyType: 'CRYPTO' // Focus on CRYPTO for PayOut
        },
        _sum: {
          amount: true
        }
      }),
      
      // Recent PayOuts (last 24h)
      prisma.payOut.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
    ]);

    // Calculate processing time would require a computed field
    // For now, we skip this complex calculation
    // const processingTimeResult = await prisma.payOut.aggregate(...);

    const result = {
      success: true,
      data: {
        stats: [
          {
            label: 'Pending',
            value: (pendingCount + queuedCount).toString(),
            description: queuedCount > 0 ? `${queuedCount} queued` : '0% needs attention',
            color: 'amber' as const,
          },
          {
            label: 'In Transit',
            value: sentCount.toString(),
            description: 'awaiting confirmation',
            color: 'blue' as const,
          },
          {
            label: 'Confirmed',
            value: confirmedCount.toString(),
            description: `${totalAmountResult._sum.amount?.toFixed(4) || '0'} crypto sent`,
            color: 'green' as const,
          },
          {
            label: 'Failed',
            value: failedCount.toString(),
            description: failedCount > 0 ? `${((failedCount / (totalPayOuts || 1)) * 100).toFixed(0)}% failure rate` : '0% failures',
            color: (failedCount > 0 ? 'red' : 'gray') as const,
          },
        ],
        totals: {
          total: totalPayOuts,
          pending: pendingCount + queuedCount,
          sent: sentCount,
          confirmed: confirmedCount,
          failed: failedCount,
          totalAmount: totalAmountResult._sum.amount || 0,
        },
      },
    };

    // Cache for 5 minutes
    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
    } catch (cacheError) {
      console.error('Redis set error:', cacheError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get PayOut stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch PayOut statistics'
      },
      { status: 500 }
    );
  }
}

