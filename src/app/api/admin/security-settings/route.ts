/**
 * Security Settings API
 * 
 * PUT: Update security settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { z } from 'zod';

const securitySettingsSchema = z.object({
  sessionTimeout: z.enum(['15', '30', '60', '120', '480', '1440']),
  twoFactorEnabled: z.boolean(),
  loginNotifications: z.boolean(),
});

export async function PUT(request: NextRequest) {
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
    const body = await request.json();

    // Validate input
    const validatedData = securitySettingsSchema.parse(body);

    // Update or create settings
    await prisma.adminSettings.upsert({
      where: { userId },
      update: {
        sessionTimeout: parseInt(validatedData.sessionTimeout),
        twoFactorEnabled: validatedData.twoFactorEnabled,
        loginNotifications: validatedData.loginNotifications,
      },
      create: {
        userId,
        sessionTimeout: parseInt(validatedData.sessionTimeout),
        twoFactorEnabled: validatedData.twoFactorEnabled,
        loginNotifications: validatedData.loginNotifications,
      },
    });

    // Log settings change
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SETTINGS_UPDATED',
        entity: 'ADMIN_SETTINGS',
        entityId: userId,
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

