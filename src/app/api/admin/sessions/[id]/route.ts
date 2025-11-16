/**
 * Single Admin Session Management API
 * 
 * DELETE - Terminate specific session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/auth-admin';
import { getAdminSessionData } from '@/lib/services/admin-session.service';
import { terminateSessionById } from '@/lib/services/admin-session-tracker.service';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/admin/sessions/[id]
 * Terminate specific session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Try Custom JWT (Passkey) first
    let adminId: string | null = null;
    let adminRole: string | null = null;

    const customSession = await getAdminSessionData();
    
    if (customSession) {
      adminId = customSession.adminId;
      adminRole = customSession.role;
    } else {
      // Try NextAuth (Password+TOTP)
      const nextAuthSession = await getAdminSession();
      
      if (nextAuthSession?.user?.id) {
        adminId = nextAuthSession.user.id;
        adminRole = nextAuthSession.user.role as string;
      }
    }

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.id;

    // Check if session exists and belongs to current admin
    // (or current admin is SUPER_ADMIN)
    const targetSession = await prisma.adminSession.findUnique({
      where: { id: sessionId },
      select: { adminId: true, isActive: true },
    });

    if (!targetSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!targetSession.isActive) {
      return NextResponse.json({ error: 'Session already terminated' }, { status: 400 });
    }

    // Only allow terminating own sessions (or any if SUPER_ADMIN)
    const isSuperAdmin = adminRole === 'SUPER_ADMIN';
    const isOwnSession = targetSession.adminId === adminId;

    if (!isSuperAdmin && !isOwnSession) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot terminate other admin sessions' },
        { status: 403 }
      );
    }

    // Terminate session by ID
    const success = await terminateSessionById(
      sessionId,
      'USER_LOGOUT_SINGLE_DEVICE',
      adminId
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to terminate session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session terminated successfully',
    });
  } catch (error) {
    console.error('❌ [SessionAPI] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to terminate session' },
      { status: 500 }
    );
  }
}

