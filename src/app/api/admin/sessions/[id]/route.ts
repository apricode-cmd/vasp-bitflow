/**
 * Single Admin Session Management API
 * 
 * DELETE - Terminate specific session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/auth-admin';
import { terminateSession } from '@/lib/services/admin-session-tracker.service';
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
    const session = await getAdminSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.id;

    // Check if session exists and belongs to current admin
    // (or current admin is SUPER_ADMIN)
    const targetSession = await prisma.adminSession.findUnique({
      where: { id: sessionId },
      select: { adminId: true, sessionKey: true },
    });

    if (!targetSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Only allow terminating own sessions (or any if SUPER_ADMIN)
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const isOwnSession = targetSession.adminId === session.user.id;

    if (!isSuperAdmin && !isOwnSession) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot terminate other admin sessions' },
        { status: 403 }
      );
    }

    // Terminate session
    const success = await terminateSession(
      targetSession.sessionKey,
      'USER_LOGOUT_SINGLE_DEVICE',
      session.user.id
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

