/**
 * Security Settings API
 * 
 * PUT: Update security settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { z } from 'zod';

const securitySettingsSchema = z.object({
  // Session Management
  idleTimeout: z.number().min(5).max(120).optional(), // minutes
  maxSessionDuration: z.number().min(1).max(24).optional(), // hours
  sessionTimeout: z.enum(['15', '30', '60', '120', '480', '1440']).optional(),
  rememberDevice: z.boolean().optional(),
  
  // MFA Settings
  twoFactorEnabled: z.boolean().optional(),
  requireMfaAlways: z.boolean().optional(),
  requireStepUpFor: z.array(z.string()).optional(),
  
  // Security
  loginNotifications: z.boolean().optional(),
  activityDigest: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  allowedIPs: z.array(z.string()).optional(),
  blockUnknownDevices: z.boolean().optional(),
  
  // Audit
  logAllActions: z.boolean().optional(),
  retainLogsFor: z.number().min(30).max(365).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { session } = authResult;

    const adminId = session.user.id;

    // Get settings or return defaults
    const settings = await prisma.adminSettings.findUnique({
      where: { adminId },
    });

    return NextResponse.json({
      success: true,
      data: settings || {
        idleTimeout: 15,
        maxSessionDuration: 8,
        sessionTimeout: 30,
        rememberDevice: false,
        twoFactorEnabled: false,
        requireMfaAlways: false,
        requireStepUpFor: [],
        loginNotifications: true,
        activityDigest: false,
        securityAlerts: true,
        allowedIPs: [],
        blockUnknownDevices: false,
        logAllActions: true,
        retainLogsFor: 90,
      },
    });
  } catch (error) {
    console.error('Get security settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch security settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { session } = authResult;

    const adminId = session.user.id;
    const body = await request.json();

    // Validate input
    const validatedData = securitySettingsSchema.parse(body);

    // Prepare update data
    const updateData: any = {};
    if (validatedData.idleTimeout !== undefined) updateData.idleTimeout = validatedData.idleTimeout;
    if (validatedData.maxSessionDuration !== undefined) updateData.maxSessionDuration = validatedData.maxSessionDuration;
    if (validatedData.sessionTimeout !== undefined) updateData.sessionTimeout = parseInt(validatedData.sessionTimeout);
    if (validatedData.rememberDevice !== undefined) updateData.rememberDevice = validatedData.rememberDevice;
    if (validatedData.twoFactorEnabled !== undefined) updateData.twoFactorEnabled = validatedData.twoFactorEnabled;
    if (validatedData.requireMfaAlways !== undefined) updateData.requireMfaAlways = validatedData.requireMfaAlways;
    if (validatedData.requireStepUpFor !== undefined) updateData.requireStepUpFor = validatedData.requireStepUpFor;
    if (validatedData.loginNotifications !== undefined) updateData.loginNotifications = validatedData.loginNotifications;
    if (validatedData.activityDigest !== undefined) updateData.activityDigest = validatedData.activityDigest;
    if (validatedData.securityAlerts !== undefined) updateData.securityAlerts = validatedData.securityAlerts;
    if (validatedData.allowedIPs !== undefined) updateData.allowedIPs = validatedData.allowedIPs;
    if (validatedData.blockUnknownDevices !== undefined) updateData.blockUnknownDevices = validatedData.blockUnknownDevices;
    if (validatedData.logAllActions !== undefined) updateData.logAllActions = validatedData.logAllActions;
    if (validatedData.retainLogsFor !== undefined) updateData.retainLogsFor = validatedData.retainLogsFor;

    // Update or create settings
    await prisma.adminSettings.upsert({
      where: { adminId },
      update: updateData,
      create: {
        adminId,
        ...updateData,
      },
    });

    // Log settings change
    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'SETTINGS_UPDATED',
        entity: 'ADMIN_SETTINGS',
        entityId: adminId,
        newValue: JSON.stringify(validatedData),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Security settings updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update security settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update security settings' },
      { status: 500 }
    );
  }
}

