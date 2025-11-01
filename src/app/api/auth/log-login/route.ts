/**
 * Login Logging API
 * 
 * POST: Log successful login to UserAuditLog (for users) or AdminAuditLog (for admins)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { UAParser } from 'ua-parser-js';
import { userAuditLogService } from '@/lib/services/user-audit-log.service';
import { adminAuditLogService } from '@/lib/services/admin-audit-log.service';

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

    const context = {
      ipAddress,
      userAgent,
      deviceType: uaResult.device.type || 'desktop',
      browser: uaResult.browser.name || 'Unknown',
      browserVersion: uaResult.browser.version,
      os: uaResult.os.name || 'Unknown',
      osVersion: uaResult.os.version,
      isMobile: uaResult.device.type === 'mobile',
      isBot: false
    };

    // Log to appropriate audit log based on role
    if (session.user.role === 'ADMIN') {
      // Admin login → AdminAuditLog
      const admin = await prisma.admin.findUnique({
        where: { id: session.user.id },
        select: { workEmail: true, roleCode: true }
      });

      if (admin) {
        await adminAuditLogService.createLog({
          adminId: session.user.id,
          adminEmail: admin.workEmail,
          adminRole: admin.roleCode,
          action: 'LOGIN',
          entityType: 'Admin',
          entityId: session.user.id,
          context
        });
      }
    } else {
      // User login → UserAuditLog
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, role: true }
      });

      if (user) {
        await userAuditLogService.createLog({
          userId: session.user.id,
          userEmail: user.email,
          action: 'LOGIN',
          entityType: 'User',
          entityId: session.user.id,
          context
        });
      }
    }

    // Update lastLogin
    if (session.user.role === 'ADMIN') {
      await prisma.admin.update({
        where: { id: session.user.id },
        data: { lastLogin: new Date() }
      });
    } else {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { lastLogin: new Date() }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login logging error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log login' },
      { status: 500 }
    );
  }
}

