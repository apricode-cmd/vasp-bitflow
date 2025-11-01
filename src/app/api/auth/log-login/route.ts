/**
 * Login Logging API
 * 
 * POST: Log successful login to SystemLog
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { UAParser } from 'ua-parser-js';
import { systemLogService } from '@/lib/services/system-log.service';

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

    // Log login to SystemLog with NEW schema
    await systemLogService.createLog({
      source: 'NODE',
      eventType: 'LOGIN',
      level: 'INFO',
      endpoint: '/api/auth/callback/credentials',
      method: 'POST',
      statusCode: 200,
      metadata: {
        userId: session.user.id,
        role: session.user.role,
        ipAddress,
        userAgent,
        deviceType: uaResult.device.type || 'desktop',
        browser: uaResult.browser.name || 'Unknown',
        browserVersion: uaResult.browser.version,
        os: uaResult.os.name || 'Unknown',
        osVersion: uaResult.os.version,
        isMobile: uaResult.device.type === 'mobile',
        isBot: false
      }
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

