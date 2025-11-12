/**
 * Admin Reactivate API
 * 
 * POST: Reactivate suspended admin account (SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('SUPER_ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const adminId = params.id;

    // Get admin
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, firstName: true, lastName: true, status: true },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Can only reactivate SUSPENDED admins
    if (admin.status !== 'SUSPENDED') {
      return NextResponse.json(
        { success: false, error: 'Only suspended admins can be reactivated' },
        { status: 400 }
      );
    }

    // Reactivate admin
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        status: 'ACTIVE',
        isActive: true,
        isSuspended: false,
        suspendedUntil: null,
      },
    });

    // Log to audit
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        action: 'ADMIN_REACTIVATED',
        entity: 'ADMIN',
        entityId: adminId,
        oldValue: JSON.stringify({ status: 'SUSPENDED' }),
        newValue: JSON.stringify({ status: 'ACTIVE' }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin reactivated successfully',
    });
  } catch (error) {
    console.error('❌ Reactivate admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reactivate admin' },
      { status: 500 }
    );
  }
}

