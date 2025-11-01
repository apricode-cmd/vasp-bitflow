/**
 * Admin Suspend API
 * 
 * POST: Suspend admin account (SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminRole('SUPER_ADMIN');
    if (session instanceof NextResponse) return session;

    const adminId = params.id;

    // Cannot suspend yourself
    if (adminId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot suspend your own account' },
        { status: 400 }
      );
    }

    // Get admin
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Cannot suspend another SUPER_ADMIN
    if (admin.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Cannot suspend another Super Admin' },
        { status: 403 }
      );
    }

    // Suspend admin
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        status: 'SUSPENDED',
        isSuspended: true,
        suspendedUntil: null, // Indefinite suspension
      },
    });

    // Terminate all active sessions
    await prisma.adminSession.updateMany({
      where: {
        adminId,
        isActive: true,
      },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminatedBy: session.user.id,
        terminationReason: 'ADMIN_SUSPENDED',
      },
    });

    // Log to audit
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        action: 'ADMIN_SUSPENDED',
        entity: 'ADMIN',
        entityId: adminId,
        oldValue: JSON.stringify({ status: 'ACTIVE' }),
        newValue: JSON.stringify({ status: 'SUSPENDED' }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin suspended successfully',
    });
  } catch (error) {
    console.error('❌ Suspend admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to suspend admin' },
      { status: 500 }
    );
  }
}

