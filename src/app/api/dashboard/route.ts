/**
 * Dashboard API
 * 
 * GET /api/dashboard - Returns dashboard data for authenticated client
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getClientSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user data with KYC status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        kycSession: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's recent orders
    const recentOrders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        currency: true,
        fiatCurrency: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Get order statistics
    const totalOrders = await prisma.order.count({
      where: { userId: session.user.id }
    });

    const completedOrders = await prisma.order.count({
      where: { 
        userId: session.user.id,
        status: 'COMPLETED'
      }
    });

    const pendingOrders = await prisma.order.count({
      where: { 
        userId: session.user.id,
        status: { in: ['PENDING', 'PAYMENT_PENDING', 'PROCESSING'] }
      }
    });

    // Calculate total volume
    const orderVolume = await prisma.order.aggregate({
      where: {
        userId: session.user.id,
        status: 'COMPLETED'
      },
      _sum: {
        totalFiat: true
      }
    });

    const kycStatus = user.kycSession?.status || null;
    const isKycApproved = kycStatus === 'APPROVED';
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          profile: user.profile,
          kycStatus,
          isKycApproved
        },
        orders: recentOrders,
        statistics: {
          totalOrders,
          completedOrders,
          pendingOrders,
          completionRate,
          totalVolume: orderVolume._sum.totalFiat || 0
        }
      }
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

