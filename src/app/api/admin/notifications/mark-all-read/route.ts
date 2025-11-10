/**
 * Mark All Admin Notifications as Read API
 * 
 * POST: Mark all notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    // Get all unread notifications for this admin
    const unreadNotifications = await prisma.adminAuditLog.findMany({
      where: {
        severity: { in: ['WARNING', 'CRITICAL'] },
        readBy: {
          none: {
            adminId: session.user.id
          }
        }
      },
      select: {
        id: true
      }
    });

    // Mark all as read
    const readRecords = unreadNotifications.map(notification => ({
      adminId: session.user.id,
      auditLogId: notification.id
    }));

    if (readRecords.length > 0) {
      await prisma.adminNotificationRead.createMany({
        data: readRecords,
        skipDuplicates: true
      });
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${readRecords.length} notifications as read`
    });
  } catch (error: any) {
    console.error('❌ POST /api/admin/notifications/mark-all-read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}

