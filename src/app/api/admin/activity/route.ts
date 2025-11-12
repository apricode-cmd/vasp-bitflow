/**
 * Admin Activity API
 * 
 * GET: Fetch recent admin activities from AuditLog
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminId = session.user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get admin's audit logs
    const activities = await prisma.auditLog.findMany({
      where: {
        adminId,
      },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        oldValue: true,
        newValue: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Get total count
    const totalCount = await prisma.auditLog.count({
      where: { adminId },
    });

    // Get activity stats
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [recentCount, weeklyCount] = await Promise.all([
      prisma.auditLog.count({
        where: {
          adminId,
          createdAt: { gte: last24Hours },
        },
      }),
      prisma.auditLog.count({
        where: {
          adminId,
          createdAt: { gte: last7Days },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      activities,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      stats: {
        last24Hours: recentCount,
        last7Days: weeklyCount,
        total: totalCount,
      },
    });
  } catch (error) {
    console.error('❌ Get admin activity error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}

