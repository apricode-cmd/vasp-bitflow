/**
 * Cron Job: Cleanup Expired Sessions
 * 
 * Run every hour to automatically terminate expired sessions
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-sessions",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/services/admin-session-tracker.service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🧹 [Cron] Starting session cleanup...');

    const count = await cleanupExpiredSessions();

    console.log(`✅ [Cron] Cleaned up ${count} expired session(s)`);

    return NextResponse.json({
      success: true,
      cleanedCount: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [Cron] Session cleanup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Session cleanup failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

