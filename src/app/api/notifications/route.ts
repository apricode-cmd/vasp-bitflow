// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Notifications API
 * 
 * GET: Get user's notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { notificationService } from '@/lib/services/notification.service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const eventKey = searchParams.get('eventKey') || undefined;
    const isRead = searchParams.get('isRead') === 'true' ? true : 
                   searchParams.get('isRead') === 'false' ? false : undefined;

    const notifications = await notificationService.getNotificationHistory(
      session.user.id,
      {
        limit,
        offset,
        eventKey,
        isRead,
      }
    );

    const unreadCount = await notificationService.getUnreadCount(session.user.id);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        limit,
        offset,
        hasMore: notifications.length === limit,
      },
    });
  } catch (error) {
    console.error('❌ GET /api/notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
