/**
 * Admin System Settings API
 * 
 * GET /api/admin/settings - Get all system settings
 * PATCH /api/admin/settings - Update multiple settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const updateSettingsSchema = z.array(
  z.object({
    key: z.string(),
    value: z.string()
  })
);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Get query parameter for category filter
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    // Build where clause
    const where: Record<string, unknown> = {};
    if (category) {
      where.category = category;
    }

    // Get all settings
    const settings = await prisma.systemSettings.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    // Group by category
    const grouped: Record<string, any[]> = {};

    settings.forEach(setting => {
      if (!grouped[setting.category]) {
        grouped[setting.category] = [];
      }
      grouped[setting.category].push(setting);
    });

    return NextResponse.json({
      success: true,
      data: {
        settings,
        grouped
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve settings'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const body = await request.json();

    // Validate
    const validated = updateSettingsSchema.parse(body);

    // Get admin ID
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Update settings
    const updatePromises = validated.map(async (setting) => {
      // Get old value for audit
      const oldSetting = await prisma.systemSettings.findUnique({
        where: { key: setting.key }
      });

      // Update setting
      const updated = await prisma.systemSettings.update({
        where: { key: setting.key },
        data: {
          value: setting.value,
          updatedBy: adminId
        }
      });

      // Log change
      await auditService.logAdminAction(
        adminId,
        AUDIT_ACTIONS.SETTINGS_UPDATED,
        AUDIT_ENTITIES.SYSTEM_SETTINGS,
        setting.key,
        { value: oldSetting?.value },
        { value: setting.value },
        { category: updated.category }
      );

      return updated;
    });

    const updatedSettings = await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      data: updatedSettings
    });
  } catch (error) {
    console.error('Update settings error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update settings'
      },
      { status: 500 }
    );
  }
}

