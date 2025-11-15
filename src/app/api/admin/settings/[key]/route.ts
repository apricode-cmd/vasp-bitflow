// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin System Setting Management API
 * 
 * GET /api/admin/settings/[key] - Get specific setting
 * PATCH /api/admin/settings/[key] - Update specific setting
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';
import { clearAdminAuthFeaturesCache } from '@/lib/features/admin-auth-features';

const updateSettingSchema = z.object({
  value: z.string()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { key } = await params;

    // Get setting
    const setting = await prisma.systemSettings.findUnique({
      where: { key }
    });

    if (!setting) {
      return NextResponse.json(
        {
          success: false,
          error: 'Setting not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Get setting error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve setting'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { key } = await params;
    const body = await request.json();

    // Validate
    const validated = updateSettingSchema.parse(body);

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

    // ⚠️ CRITICAL: Security settings can only be changed by SUPER_ADMIN
    const PROTECTED_SECURITY_KEYS = ['adminPasswordAuthEnabled', 'adminPasswordAuthForRoles'];
    if (PROTECTED_SECURITY_KEYS.includes(key)) {
      const { session } = sessionOrError;
      if (session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden: Only SUPER_ADMIN can modify authentication security settings'
          },
          { status: 403 }
        );
      }
    }

    // Get old value
    const oldSetting = await prisma.systemSettings.findUnique({
      where: { key }
    });

    if (!oldSetting) {
      return NextResponse.json(
        {
          success: false,
          error: 'Setting not found'
        },
        { status: 404 }
      );
    }

    // Update setting
    const updated = await prisma.systemSettings.update({
      where: { key },
      data: {
        value: validated.value,
        updatedBy: adminId
      }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.SYSTEM_SETTINGS,
      key,
      { value: oldSetting.value },
      { value: validated.value },
      { category: updated.category }
    );

    // ✅ Clear admin auth features cache if security setting changed
    if (key === 'adminPasswordAuthEnabled' || key === 'adminPasswordAuthForRoles') {
      clearAdminAuthFeaturesCache();
      console.log('🔄 [Settings] Admin auth features cache cleared for key:', key);
    }

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Update setting error:', error);

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
        error: 'Failed to update setting'
      },
      { status: 500 }
    );
  }
}

