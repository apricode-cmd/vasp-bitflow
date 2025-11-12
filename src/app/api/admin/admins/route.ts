/**
 * Admin Management API
 * 
 * GET: List all administrators (SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';

export async function GET(request: NextRequest) {
  try {
    // Only SUPER_ADMIN can list all admins
    const authResult = await requireAdminRole('SUPER_ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    // Get all admins with their details
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        workEmail: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        department: true,
        employeeId: true,
        role: true,
        status: true,
        isActive: true,
        isSuspended: true,
        lastLogin: true,
        authMethod: true,
        createdAt: true,
        createdBy: true,
        invitedBy: true,
        invitedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      admins,
    });
  } catch (error) {
    console.error('❌ List admins error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list admins' },
      { status: 500 }
    );
  }
}

