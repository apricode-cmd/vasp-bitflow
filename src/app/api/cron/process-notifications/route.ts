// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Cron Job: Process Pending/Failed Notifications
 * 
 * Run every 5 minutes to:
 * 1. Process PENDING notifications (in case auto-process failed)
 * 2. Retry FAILED notifications (with exponential backoff)
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-notifications",
 *     "schedule": "every 5 minutes"
 *   }]
 * }
 * 
 * Or run manually: GET /api/cron/process-notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notificationService } from '@/lib/services/notification.service';

const MAX_RETRIES = 3;
const RETRY_DELAY_MINUTES = [5, 15, 60]; // 5min, 15min, 1hour

export async function GET(request: NextRequest) {
  try {
    // Verify authorization (check for cron secret or admin auth)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Check if request is from Vercel Cron (x-vercel-signature header) or has valid auth
    const isVercelCron = request.headers.get('x-vercel-signature');
    const isAuthorized = 
      isVercelCron || 
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      process.env.NODE_ENV === 'development'; // Allow in dev mode

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 [CRON] Starting notification processing...');

    let processedCount = 0;
    let retriedCount = 0;
    let failedCount = 0;

    // 1. Process PENDING notifications (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const pendingNotifications = await prisma.notificationQueue.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: fiveMinutesAgo }, // Older than 5 minutes
      },
      take: 50, // Process max 50 per run
      orderBy: { createdAt: 'asc' },
    });

    console.log(`📬 [CRON] Found ${pendingNotifications.length} pending notifications`);

    for (const notification of pendingNotifications) {
      try {
        await notificationService.processQueueItem(notification.id);
        processedCount++;
      } catch (error) {
        console.error(`❌ [CRON] Failed to process notification ${notification.id}:`, error);
        failedCount++;
      }
    }

    // 2. Retry FAILED notifications (with exponential backoff)
    const failedNotifications = await prisma.notificationQueue.findMany({
      where: {
        status: 'FAILED',
        attempts: { lt: MAX_RETRIES },
      },
      take: 50,
      orderBy: { failedAt: 'asc' },
    });

    console.log(`🔄 [CRON] Found ${failedNotifications.length} failed notifications to retry`);

    for (const notification of failedNotifications) {
      // Calculate retry delay based on attempts
      const attempts = notification.attempts || 0;
      const delayMinutes = RETRY_DELAY_MINUTES[attempts] || RETRY_DELAY_MINUTES[RETRY_DELAY_MINUTES.length - 1];
      const retryAfter = new Date(
        (notification.failedAt || notification.createdAt).getTime() + delayMinutes * 60 * 1000
      );

      // Check if enough time has passed
      if (new Date() < retryAfter) {
        continue; // Skip, not yet time to retry
      }

      try {
        // Reset status to PENDING for retry
        await prisma.notificationQueue.update({
          where: { id: notification.id },
          data: {
            status: 'PENDING',
            attempts: attempts + 1,
            error: null,
          },
        });

        // Process notification
        await notificationService.processQueueItem(notification.id);
        retriedCount++;
      } catch (error) {
        console.error(`❌ [CRON] Failed to retry notification ${notification.id}:`, error);
        
        // Mark as permanently failed if max retries reached
        if (attempts + 1 >= MAX_RETRIES) {
          await prisma.notificationQueue.update({
            where: { id: notification.id },
            data: {
              status: 'FAILED',
              error: `Max retries (${MAX_RETRIES}) reached. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          });
        }
        
        failedCount++;
      }
    }

    console.log('✅ [CRON] Notification processing complete:', {
      processed: processedCount,
      retried: retriedCount,
      failed: failedCount,
    });

    return NextResponse.json({
      success: true,
      message: 'Notification processing complete',
      stats: {
        pending: processedCount,
        retried: retriedCount,
        failed: failedCount,
        total: processedCount + retriedCount,
      },
    });
  } catch (error) {
    console.error('❌ [CRON] Notification processing error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

