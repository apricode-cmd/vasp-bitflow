/**
 * Admin System Settings API
 * 
 * GET /api/admin/settings - Get all system settings
 * PATCH /api/admin/settings - Update multiple settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
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

    // Get all settings
    const settings = await prisma.systemSettings.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    // Convert array to object for easier frontend consumption
    const settingsObject: Record<string, any> = {};
    settings.forEach(setting => {
      // Convert value based on type
      let value: any = setting.value;
      
      if (setting.type === 'BOOLEAN') {
        value = setting.value === 'true';
      } else if (setting.type === 'NUMBER') {
        value = parseFloat(setting.value);
      } else if (setting.type === 'JSON') {
        try {
          value = JSON.parse(setting.value);
        } catch {
          value = setting.value;
        }
      }
      
      settingsObject[setting.key] = value;
    });

    // Also return raw settings for advanced usage
    return NextResponse.json({
      success: true,
      settings: settingsObject,
      raw: settings
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

    // Update or create settings (upsert)
    const updatePromises = validated.map(async (setting) => {
      // Determine category from key
      let category = 'general';
      if (setting.key.startsWith('brand') || setting.key === 'supportEmail' || setting.key === 'supportPhone' || setting.key === 'primaryColor') {
        category = 'brand';
      } else if (setting.key.startsWith('seo') || setting.key.startsWith('og')) {
        category = 'seo';
      } else if (setting.key.includes('maintenance') || setting.key.includes('registration') || setting.key.includes('kyc') || setting.key.includes('email')) {
        category = 'system';
      } else if (setting.key.includes('Fee') || setting.key.includes('Order') || setting.key.includes('min') || setting.key.includes('max')) {
        category = 'trading';
      }

      // Determine type from value
      let type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' = 'STRING';
      if (setting.value === 'true' || setting.value === 'false') {
        type = 'BOOLEAN';
      } else if (!isNaN(parseFloat(setting.value)) && setting.value !== '') {
        type = 'NUMBER';
      } else if (setting.value.startsWith('{') || setting.value.startsWith('[')) {
        type = 'JSON';
      }

      // Get old value for audit
      const oldSetting = await prisma.systemSettings.findUnique({
        where: { key: setting.key }
      });

      // Upsert setting
      const updated = await prisma.systemSettings.upsert({
        where: { key: setting.key },
        create: {
          key: setting.key,
          value: setting.value,
          type,
          category,
          updatedBy: adminId
        },
        update: {
          value: setting.value,
          type,
          category,
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

