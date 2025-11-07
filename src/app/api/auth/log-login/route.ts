/**
 * Login Logging API
 * 
 * POST: Update lastLogin timestamp and ensure login is logged
 * 
 * NOTE: Primary login logging happens in:
 * - auth-client.ts → securityAuditService.logSuccessfulLogin() → UserAuditLog
 * - auth-admin.ts → securityAuditService.logSuccessfulLogin() → AdminAuditLog
 * 
 * This endpoint ensures login is logged (in case it wasn't) and updates lastLogin.
 * It checks for recent logs to avoid duplicates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientSession } from '@/auth-client';
import { getAdminSession } from '@/auth-admin';
import { UAParser } from 'ua-parser-js';
import { userAuditLogService } from '@/lib/services/user-audit-log.service';
import { adminAuditLogService } from '@/lib/services/admin-audit-log.service';

export async function POST(request: NextRequest) {
  try {
    // Try to get client session first (for CLIENT users)
    let session = await getClientSession();
    let userRole: 'CLIENT' | 'ADMIN' = 'CLIENT';
    
    // If no client session, try admin session
    if (!session?.user) {
      session = await getAdminSession();
      userRole = 'ADMIN';
    }
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
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
    // This is a backup - primary logging happens in auth handlers
    if (userRole === 'ADMIN' || session.user.role === 'ADMIN') {
      // Admin login → AdminAuditLog
      const admin = await prisma.admin.findUnique({
        where: { id: session.user.id },
        select: { workEmail: true, roleCode: true }
      });

      if (admin) {
        // Check if login was already logged (avoid duplicates)
        const recentLog = await prisma.adminAuditLog.findFirst({
          where: {
            adminId: session.user.id,
            action: 'LOGIN',
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        if (!recentLog) {
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
      }
    } else {
      // User login → UserAuditLog
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, role: true }
      });

      if (user) {
        // Check if login was already logged (avoid duplicates)
        const recentLog = await prisma.userAuditLog.findFirst({
          where: {
            userId: session.user.id,
            action: 'LOGIN',
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        if (!recentLog) {
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
    }

    // Update lastLogin
    if (userRole === 'ADMIN' || session.user.role === 'ADMIN') {
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

