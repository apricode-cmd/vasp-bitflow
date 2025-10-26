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
    const { error, session } = await requireRole('ADMIN');
    if (error) {
      return error;
    }

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get recent system logs for this user (login and API activities)
    // Consider a session active if there was activity in the last 24 hours
    const recentActivity = await prisma.systemLog.findMany({
      where: {
        userId,
        createdAt: {
          // Activity in the last 24 hours
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by unique device/IP combinations to identify unique sessions
    const sessionMap = new Map<string, any>();

    for (const log of recentActivity) {
      const sessionKey = `${log.ipAddress}-${log.deviceType}-${log.browser}`;
      
      if (!sessionMap.has(sessionKey)) {
        sessionMap.set(sessionKey, {
          id: log.id,
          userId: log.userId,
          device: log.deviceType || 'Unknown Device',
          browser: log.browser || 'Unknown Browser',
          os: log.os || 'Unknown OS',
          ipAddress: log.ipAddress,
          lastActive: log.createdAt,
          firstSeen: log.createdAt,
          activityCount: 1,
        });
      } else {
        const sessionItem = sessionMap.get(sessionKey);
        sessionItem.activityCount++;
        // Update first seen if this log is older
        if (log.createdAt < sessionItem.firstSeen) {
          sessionItem.firstSeen = log.createdAt;
        }
      }
    }

    // Convert map to array and sort by last active
    const sessions = Array.from(sessionMap.values())
      .sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime())
      .map((session, index) => ({
        ...session,
        isCurrent: index === 0, // Most recent is current
      }));

    // If no sessions found, create one for current session
    if (sessions.length === 0) {
      const currentIp = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      // Log current session
      const currentLog = await prisma.systemLog.create({
        data: {
          userId,
          action: 'SESSION_VIEW',
          path: '/api/admin/sessions',
          ipAddress: currentIp,
          deviceType: 'Admin Panel',
          browser: userAgent.includes('Chrome') ? 'Chrome' : 
                   userAgent.includes('Firefox') ? 'Firefox' :
                   userAgent.includes('Safari') ? 'Safari' : 'Unknown',
          os: userAgent.includes('Windows') ? 'Windows' :
              userAgent.includes('Mac') ? 'macOS' :
              userAgent.includes('Linux') ? 'Linux' : 'Unknown',
          metadata: { action: 'Viewing sessions page' },
        },
      });

      sessions.push({
        id: currentLog.id,
        userId,
        device: 'Admin Panel',
        browser: currentLog.browser,
        os: currentLog.os,
        ipAddress: currentIp,
        lastActive: currentLog.createdAt,
        firstSeen: currentLog.createdAt,
        activityCount: 1,
        isCurrent: true,
      });
    }

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


