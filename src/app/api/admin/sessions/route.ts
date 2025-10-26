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

    // Get current request info to identify the current session
    const currentIp = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const currentUserAgent = request.headers.get('user-agent') || 'unknown';
    
    // Parse current user agent to get device/browser info
    const getCurrentBrowser = (ua: string) => {
      if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
      if (ua.includes('Edg')) return 'Edge';
      return 'Unknown';
    };
    
    const getCurrentDevice = (ua: string) => {
      if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) return 'mobile';
      if (ua.includes('Tablet') || ua.includes('iPad')) return 'tablet';
      return 'desktop';
    };
    
    const currentBrowser = getCurrentBrowser(currentUserAgent);
    const currentDevice = getCurrentDevice(currentUserAgent);
    const currentSessionKey = `${currentIp}-${currentDevice}-${currentBrowser}`;

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
      .map((sess) => {
        // Determine if this is the current session by comparing sessionKey
        const sessKey = `${sess.ipAddress}-${sess.device}-${sess.browser}`;
        return {
          ...sess,
          isCurrent: sessKey === currentSessionKey,
        };
      });

    // If no sessions found, create one for current session
    if (sessions.length === 0) {
      // Log current session
      const currentLog = await prisma.systemLog.create({
        data: {
          userId,
          action: 'SESSION_VIEW',
          path: '/api/admin/sessions',
          ipAddress: currentIp,
          userAgent: currentUserAgent,
          deviceType: currentDevice,
          browser: currentBrowser,
          os: currentUserAgent.includes('Windows') ? 'Windows' :
              currentUserAgent.includes('Mac') ? 'macOS' :
              currentUserAgent.includes('Linux') ? 'Linux' : 'Unknown',
          metadata: { action: 'Viewing sessions page' },
        },
      });

      sessions.push({
        id: currentLog.id,
        userId,
        device: currentDevice,
        browser: currentBrowser,
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


