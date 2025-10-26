/**
 * Login Logging API
 * 
 * POST: Log successful login to SystemLog
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { UAParser } from 'ua-parser-js'; // Changed: Named import instead of default

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';

    // Parse user agent
    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();

    // Log login to SystemLog
    await prisma.systemLog.create({
      data: {
        userId: session.user.id,
        action: 'LOGIN',
        path: '/api/auth/callback/credentials',
        ipAddress,
        userAgent,
        deviceType: uaResult.device.type || 'desktop',
        browser: uaResult.browser.name || 'Unknown',
        browserVersion: uaResult.browser.version,
        os: uaResult.os.name || 'Unknown',
        osVersion: uaResult.os.version,
        isMobile: uaResult.device.type === 'mobile',
        isBot: false,
        metadata: {
          action: 'User logged in',
          role: session.user.role,
        },
      },
    });

    // Update lastLogin
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastLogin: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login logging error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log login' },
      { status: 500 }
    );
  }
}

