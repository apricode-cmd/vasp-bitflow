// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Retry Failed Notification API
 * 
 * POST: Retry a failed notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    // Get queue item
    const queueItem = await prisma.notificationQueue.findUnique({
      where: { id: params.id }
    });

    if (!queueItem) {
      return NextResponse.json(
        { success: false, error: 'Queue item not found' },
        { status: 404 }
      );
    }

    // Only allow retry for failed items
    if (queueItem.status !== 'FAILED') {
      return NextResponse.json(
        { success: false, error: 'Can only retry failed notifications' },
        { status: 400 }
      );
    }

    // Check if max attempts reached
    if (queueItem.attempts >= queueItem.maxAttempts) {
      return NextResponse.json(
        { success: false, error: 'Max retry attempts reached' },
        { status: 400 }
      );
    }

    // Reset to pending for retry
    await prisma.notificationQueue.update({
      where: { id: params.id },
      data: {
        status: 'PENDING',
        scheduledFor: new Date(),
        error: null,
        errorDetails: null,
        failedAt: null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Notification queued for retry'
    });
  } catch (error: any) {
    console.error('❌ POST /api/admin/notification-queue/[id]/retry error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retry notification' },
      { status: 500 }
    );
  }
}

