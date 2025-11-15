/**
 * User Wallets Statistics API
 * GET /api/admin/user-wallets/stats - Get wallet statistics
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

    // Try cache first
    const cacheKey = 'user-wallets-stats';
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

    // Get statistics in parallel
    const [
      totalWallets,
      verifiedCount,
      unverifiedCount,
      defaultWallets,
      walletsByCurrency,
      walletsByNetwork,
      recentWallets,
      walletsWithOrders
    ] = await Promise.all([
      // Total wallets
      prisma.userWallet.count(),
      
      // Verified wallets
      prisma.userWallet.count({
        where: { isVerified: true }
      }),
      
      // Unverified wallets
      prisma.userWallet.count({
        where: { isVerified: false }
      }),
      
      // Default wallets
      prisma.userWallet.count({
        where: { isDefault: true }
      }),
      
      // Wallets by currency
      prisma.userWallet.groupBy({
        by: ['currencyCode'],
        _count: true,
        orderBy: { _count: { currencyCode: 'desc' } },
        take: 5
      }),
      
      // Wallets by network
      prisma.userWallet.groupBy({
        by: ['blockchainCode'],
        _count: true,
        orderBy: { _count: { blockchainCode: 'desc' } },
        take: 5
      }),
      
      // Recent wallets (last 7 days)
      prisma.userWallet.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Wallets with orders
      prisma.userWallet.count({
        where: {
          orders: {
            some: {}
          }
        }
      })
    ]);

    // Calculate verification rate
    const verificationRate = totalWallets > 0 
      ? ((verifiedCount / totalWallets) * 100).toFixed(1)
      : '0';

    // Build stats array
    const stats = [
      {
        label: 'Total Wallets',
        value: totalWallets.toString(),
        description: `${recentWallets} added this week`,
        color: 'blue'
      },
      {
        label: 'Verified',
        value: verifiedCount.toString(),
        description: `${verificationRate}% verification rate`,
        color: 'green'
      },
      {
        label: 'Unverified',
        value: unverifiedCount.toString(),
        description: 'Require verification',
        color: 'amber'
      },
      {
        label: 'Active Wallets',
        value: walletsWithOrders.toString(),
        description: 'Used in orders',
        color: 'purple'
      }
    ];

    const result = {
      success: true,
      data: {
        stats,
        totals: {
          total: totalWallets,
          verified: verifiedCount,
          unverified: unverifiedCount,
          default: defaultWallets,
          withOrders: walletsWithOrders,
          recent: recentWallets
        },
        byCurrency: walletsByCurrency,
        byNetwork: walletsByNetwork
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
    console.error('User Wallets stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wallet statistics' },
      { status: 500 }
    );
  }
}

