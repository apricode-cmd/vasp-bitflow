/**
 * Sessions API
 * 
 * GET: Get all active sessions for current admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.id;

    // Get recent system logs for this user (login activities)
    const recentLogins = await prisma.systemLog.findMany({
      where: {
        userId,
        action: 'LOGIN',
        timestamp: {
          // Sessions in the last 30 days
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // Transform to session format
    const sessions = recentLogins.map((log, index) => ({
      id: log.id,
      userId: log.userId,
      device: log.deviceType || 'Unknown Device',
      browser: log.browser || 'Unknown Browser',
      os: log.os || 'Unknown OS',
      ipAddress: log.ipAddress,
      lastActive: log.timestamp,
      isCurrent: index === 0, // Most recent is current
    }));

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

