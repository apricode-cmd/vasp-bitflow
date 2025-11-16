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
      console.log('🔐 [SessionAPI] DELETE - Custom JWT session:', { adminId, adminRole });
    } else {
      // Try NextAuth (Password+TOTP)
      const nextAuthSession = await getAdminSession();
      
      if (nextAuthSession?.user?.id) {
        adminId = nextAuthSession.user.id;
        adminRole = nextAuthSession.user.role as string;
        console.log('🔐 [SessionAPI] DELETE - NextAuth session:', { adminId, adminRole });
      }
    }

    if (!adminId) {
      console.error('❌ [SessionAPI] DELETE - Unauthorized (no adminId)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.id;
    console.log('🗑️ [SessionAPI] DELETE - Request to terminate session:', { sessionId, by: adminId });

    // Check if session exists and belongs to current admin
    // (or current admin is SUPER_ADMIN)
    const targetSession = await prisma.adminSession.findUnique({
      where: { id: sessionId },
      select: { adminId: true, isActive: true, sessionId: true },
    });

    console.log('🔍 [SessionAPI] DELETE - Target session found:', targetSession);

    if (!targetSession) {
      console.error('❌ [SessionAPI] DELETE - Session not found:', sessionId);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!targetSession.isActive) {
      console.warn('⚠️ [SessionAPI] DELETE - Session already terminated:', sessionId);
      return NextResponse.json({ error: 'Session already terminated' }, { status: 400 });
    }

    // Only allow terminating own sessions (or any if SUPER_ADMIN)
    const isSuperAdmin = adminRole === 'SUPER_ADMIN';
    const isOwnSession = targetSession.adminId === adminId;

    console.log('🔒 [SessionAPI] DELETE - Authorization check:', { isSuperAdmin, isOwnSession });

    if (!isSuperAdmin && !isOwnSession) {
      console.error('❌ [SessionAPI] DELETE - Forbidden (not owner and not super admin)');
      return NextResponse.json(
        { error: 'Forbidden: Cannot terminate other admin sessions' },
        { status: 403 }
      );
    }

    // Terminate session by ID
    console.log('⏳ [SessionAPI] DELETE - Calling terminateSessionById...');
    const success = await terminateSessionById(
      sessionId,
      'USER_LOGOUT_SINGLE_DEVICE',
      adminId
    );

    console.log('✅ [SessionAPI] DELETE - Termination result:', { success });

    if (!success) {
      console.error('❌ [SessionAPI] DELETE - Termination failed');
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

