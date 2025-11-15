// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Cleanup Expired Session Revocations
 * 
 * Cron job to delete expired session revocations from database.
 * Should be run periodically (e.g., daily via Vercel Cron or external scheduler).
 * 
 * Usage:
 * - Vercel Cron: Add to vercel.json
 * - Manual: Call /api/cron/cleanup-revocations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Security: Check if request is from authorized source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();

    // Delete expired revocations
    const result = await prisma.sessionRevocation.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    console.log(`🧹 Cleaned up ${result.count} expired session revocations`);

    return NextResponse.json({
      success: true,
      cleaned: result.count,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cleanup' },
      { status: 500 }
    );
  }
}

