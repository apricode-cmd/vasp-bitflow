/**
 * Notification Queue Monitoring API
 * 
 * GET: List queue items with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');
    const eventKey = searchParams.get('eventKey');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (eventKey) where.eventKey = eventKey;

    const [queueItems, totalCount, stats] = await Promise.all([
      prisma.notificationQueue.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset,
        include: {
          event: {
            select: {
              name: true,
              category: true,
              priority: true
            }
          },
          user: {
            select: {
              id: true,
              email: true
            }
          }
        }
      }),
      prisma.notificationQueue.count({ where }),
      prisma.notificationQueue.groupBy({
        by: ['status'],
        _count: true
      })
    ]);

    // Format stats
    const statusStats = stats.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      queueItems,
      totalCount,
      stats: {
        pending: statusStats.PENDING || 0,
        processing: statusStats.PROCESSING || 0,
        sent: statusStats.SENT || 0,
        failed: statusStats.FAILED || 0,
        cancelled: statusStats.CANCELLED || 0,
        skipped: statusStats.SKIPPED || 0,
      }
    });
  } catch (error: any) {
    console.error('❌ GET /api/admin/notification-queue error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch queue items' },
      { status: 500 }
    );
  }
}

