/**
 * Roles API
 * 
 * Get all roles with their permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { permissionService } from '@/lib/services/permission.service';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    // Get all roles with counts
    const roles = await permissionService.getAllRoles();

    return NextResponse.json({
      success: true,
      roles,
    });
  } catch (error) {
    console.error('❌ Get roles error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

