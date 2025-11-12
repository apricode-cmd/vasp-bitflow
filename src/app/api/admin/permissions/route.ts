/**
 * Admin Permissions API
 * 
 * Returns current admin's permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { permissionService } from '@/lib/services/permission.service';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    // Get admin permissions
    const permissions = await permissionService.getAdminPermissions(session.user.id);
    const permissionsDetailed = await permissionService.getAdminPermissionsDetailed(session.user.id);

    return NextResponse.json({
      success: true,
      permissions, // Array of permission codes
      permissionsDetailed, // Array of permission objects with full info
    });
  } catch (error) {
    console.error('❌ Get permissions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

