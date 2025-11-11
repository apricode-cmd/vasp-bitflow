/**
 * Process Notification Queue
 * 
 * Manually process pending notifications in the queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { notificationService } from '@/lib/services/notification.service';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminRole('ADMIN');
    if (session instanceof NextResponse) return session;

    console.log('🔄 Processing notification queue...');

    // Process pending notifications
    await notificationService.processPendingNotifications();

    console.log('✅ Queue processing completed');

    return NextResponse.json({
      success: true,
      message: 'Queue processed successfully'
    });
  } catch (error: any) {
    console.error('❌ POST /api/admin/notifications/process-queue error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process queue' },
      { status: 500 }
    );
  }
}

