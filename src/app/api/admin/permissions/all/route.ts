/**
 * All Permissions API
 * 
 * Get all permissions in the system
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { permissionService } from '@/lib/services/permission.service';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    // Get all permissions
    const permissions = await permissionService.getAllPermissions();

    return NextResponse.json({
      success: true,
      permissions,
    });
  } catch (error) {
    console.error('❌ Get all permissions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

