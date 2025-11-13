/**
 * Admin Statistics API Route
 * 
 * GET /api/admin/stats - Returns comprehensive platform statistics
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { auditService } from '@/lib/services/audit.service';

export async function GET(request: Request): Promise<NextResponse> {
  // Check admin authorization
  const authResult = await requireAdminAuth();
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { session } = authResult;

  try {
    // Get time range from query params
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || 'week';
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
    }
    // Get basic counts - OPTIMIZED: Use groupBy instead of multiple counts
    // This reduces 14 queries to 4 queries (75% reduction!)
    const [ordersByStatus, usersByRoleAndStatus, kycByStatus, payInByStatus, payOutByStatus] = await Promise.all([
      // Order counts grouped by status
      prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
      // User counts grouped by role and active status
      prisma.user.groupBy({
        by: ['role', 'isActive'],
        _count: true,
      }),
      // KYC counts grouped by status
      prisma.kycSession.groupBy({
        by: ['status'],
        _count: true,
      }),
      // PayIn counts grouped by status
      prisma.payIn.groupBy({
        by: ['status'],
        _count: true,
      }),
      // PayOut counts grouped by status
      prisma.payOut.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    // Transform groupBy results to individual counts
    const totalOrders = ordersByStatus.reduce((sum, item) => sum + item._count, 0);
    const pendingOrders = ordersByStatus.find(item => item.status === 'PENDING')?._count || 0;
    const paymentPendingOrders = ordersByStatus.find(item => item.status === 'PAYMENT_PENDING')?._count || 0;
    const processingOrders = ordersByStatus.find(item => item.status === 'PROCESSING')?._count || 0;
    const completedOrders = ordersByStatus.find(item => item.status === 'COMPLETED')?._count || 0;

    const totalUsers = usersByRoleAndStatus
      .filter(item => item.role === 'CLIENT')
      .reduce((sum, item) => sum + item._count, 0);
    const activeUsers = usersByRoleAndStatus
      .find(item => item.role === 'CLIENT' && item.isActive)?._count || 0;

    const pendingKyc = kycByStatus.find(item => item.status === 'PENDING')?._count || 0;
    const approvedKyc = kycByStatus.find(item => item.status === 'APPROVED')?._count || 0;
    const rejectedKyc = kycByStatus.find(item => item.status === 'REJECTED')?._count || 0;

    const pendingPayIn = payInByStatus
      .filter(item => ['PENDING', 'RECEIVED'].includes(item.status))
      .reduce((sum, item) => sum + item._count, 0);
    const receivedPayIn = payInByStatus.find(item => item.status === 'RECEIVED')?._count || 0;

    const pendingPayOut = payOutByStatus
      .filter(item => ['PENDING', 'QUEUED'].includes(item.status))
      .reduce((sum, item) => sum + item._count, 0);
    const sentPayOut = payOutByStatus
      .filter(item => ['SENT', 'CONFIRMING'].includes(item.status))
      .reduce((sum, item) => sum + item._count, 0);

    // Get total volume (completed orders only)
    const volumeResult = await prisma.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { totalFiat: true, cryptoAmount: true }
    });

    // Get volume by currency
    const volumeByCurrency = await prisma.order.groupBy({
      by: ['currencyCode', 'fiatCurrencyCode'],
      where: { status: 'COMPLETED' },
      _sum: { totalFiat: true, cryptoAmount: true }
    });

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          include: { profile: true }
        },
        currency: true,
        fiatCurrency: true
      }
    });

    // Get recent KYC submissions
    const recentKyc = await prisma.kycSession.findMany({
      take: 5,
      where: { status: 'PENDING' },
      orderBy: { submittedAt: 'desc' },
      include: {
        user: {
          include: { profile: true }
        }
      }
    });

    // Get recent admin activity
    const recentActivity = await auditService.getRecentAdminActions(10);

    // Get system health indicators
    const [
      activeTradingPairs,
      activePaymentMethods,
      platformWallets,
      apiKeys
    ] = await Promise.all([
      prisma.tradingPair.count({ where: { isActive: true } }),
      prisma.paymentMethod.count({ where: { isActive: true } }),
      prisma.platformWallet.count({ where: { isActive: true } }),
      prisma.apiKey.count({ where: { isActive: true } })
    ]);

    // Get integrations status
    const integrations = await prisma.integrationSetting.findMany({
      select: {
        service: true,
        isEnabled: true,
        status: true,
        lastTested: true
      }
    });

    // Get daily volume data for charts (last 7 days)
    let dailyVolume: Array<{ date: Date; volume: number; orders: number }> = [];
    
    try {
      dailyVolume = await prisma.$queryRaw<Array<{ date: Date; volume: number; orders: number }>>`
        SELECT 
          DATE("createdAt") as date,
          COALESCE(SUM("totalFiat"), 0)::float as volume,
          COUNT(*)::int as orders
        FROM "Order"
        WHERE status = 'COMPLETED'
          AND "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY DATE("createdAt") ASC
      `;
    } catch (error) {
      console.error('Daily volume query error:', error);
      // Fallback to empty array if query fails
      dailyVolume = [];
    }

    // Format volume chart data
    const volumeChartData = dailyVolume.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
      volume: Number(d.volume),
      orders: Number(d.orders)
    }));

    // Get currency distribution
    const currencyStats = await prisma.order.groupBy({
      by: ['currencyCode'],
      where: { 
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      },
      _count: { id: true }
    });

    const totalCompletedInRange = currencyStats.reduce((sum, c) => sum + c._count.id, 0);
    const currencyChartData = currencyStats.map(stat => ({
      name: stat.currencyCode,
      value: totalCompletedInRange > 0 
        ? Math.round((stat._count.id / totalCompletedInRange) * 100) 
        : 0
    }));

    // Calculate trends (compare with previous period)
    const previousPeriodStart = new Date(startDate);
    const periodLength = now.getTime() - startDate.getTime();
    previousPeriodStart.setTime(startDate.getTime() - periodLength);

    const [previousOrders, previousUsers, previousKyc] = await Promise.all([
      prisma.order.count({ 
        where: { 
          createdAt: { gte: previousPeriodStart, lt: startDate }
        }
      }),
      prisma.user.count({ 
        where: { 
          role: 'CLIENT',
          createdAt: { gte: previousPeriodStart, lt: startDate }
        }
      }),
      prisma.kycSession.count({ 
        where: { 
          status: 'APPROVED',
          submittedAt: { gte: previousPeriodStart, lt: startDate }
        }
      })
    ]);

    const currentPeriodOrders = await prisma.order.count({
      where: { createdAt: { gte: startDate } }
    });

    const currentPeriodUsers = await prisma.user.count({
      where: { 
        role: 'CLIENT',
        createdAt: { gte: startDate }
      }
    });

    const currentPeriodKyc = await prisma.kycSession.count({
      where: { 
        status: 'APPROVED',
        submittedAt: { gte: startDate }
      }
    });

    // Calculate percentage changes
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const trends = {
      orders: calculateTrend(currentPeriodOrders, previousOrders),
      volume: calculateTrend(currentPeriodOrders, previousOrders), // Using orders as proxy
      users: calculateTrend(currentPeriodUsers, previousUsers),
      kyc: calculateTrend(currentPeriodKyc, previousKyc)
    };

    return NextResponse.json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          paymentPending: paymentPendingOrders,
          processing: processingOrders,
          completed: completedOrders,
          byStatus: {
            PENDING: pendingOrders,
            PAYMENT_PENDING: paymentPendingOrders,
            PROCESSING: processingOrders,
            COMPLETED: completedOrders
          }
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        kyc: {
          pending: pendingKyc,
          approved: approvedKyc,
          rejected: rejectedKyc,
          total: pendingKyc + approvedKyc + rejectedKyc
        },
        payIn: {
          pending: pendingPayIn,
          received: receivedPayIn,
          total: pendingPayIn + receivedPayIn
        },
        payOut: {
          pending: pendingPayOut,
          sent: sentPayOut,
          total: pendingPayOut + sentPayOut
        },
        volume: {
          totalFiat: volumeResult._sum.totalFiat || 0,
          totalCrypto: volumeResult._sum.cryptoAmount || 0,
          byCurrency: volumeByCurrency
        },
        systemHealth: {
          tradingPairs: activeTradingPairs,
          paymentMethods: activePaymentMethods,
          platformWallets: platformWallets,
          apiKeys: apiKeys,
          integrations: integrations.map(i => ({
            service: i.service,
            status: i.status,
            isEnabled: i.isEnabled,
            lastTested: i.lastTested
          }))
        },
        chartData: {
          volume: volumeChartData,
          currencies: currencyChartData
        },
        trends,
        recentOrders,
        recentKyc,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch statistics' 
      },
      { status: 500 }
    );
  }
}

