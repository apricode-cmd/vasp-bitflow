/**
 * Admin Terminate API
 * 
 * POST: Terminate admin account permanently (SUPER_ADMIN only)
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

    // Cannot terminate yourself
    if (adminId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot terminate your own account' },
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

    // Cannot terminate another SUPER_ADMIN
    if (admin.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Cannot terminate another Super Admin' },
        { status: 403 }
      );
    }

    // Terminate admin
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        status: 'TERMINATED',
        isActive: false,
        isSuspended: false,
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
        terminationReason: 'ADMIN_TERMINATED',
      },
    });

    // Deactivate all WebAuthn credentials
    await prisma.webAuthnCredential.updateMany({
      where: { adminId },
      data: { isActive: false },
    });

    // Log to audit
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        action: 'ADMIN_TERMINATED',
        entity: 'ADMIN',
        entityId: adminId,
        oldValue: JSON.stringify({ status: admin.role, isActive: true }),
        newValue: JSON.stringify({ status: 'TERMINATED', isActive: false }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin terminated successfully',
    });
  } catch (error) {
    console.error('❌ Terminate admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to terminate admin' },
      { status: 500 }
    );
  }
}

