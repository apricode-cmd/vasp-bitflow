/**
 * Admin Sessions Management API
 * 
 * GET - List active sessions (own or all if SUPER_ADMIN)
 * DELETE - Terminate all sessions for current admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/auth-admin';
import {
  getAdminActiveSessions,
  getAllActiveSessions,
  terminateAllAdminSessions,
} from '@/lib/services/admin-session-tracker.service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/sessions
 * List active sessions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SUPER_ADMIN can see all sessions
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

    if (isSuperAdmin) {
      const allSessions = await getAllActiveSessions();
      return NextResponse.json({ sessions: allSessions });
    }

    // Regular admins see only their own sessions
    const sessions = await getAdminActiveSessions(session.user.id);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('❌ [SessionsAPI] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sessions
 * Terminate all sessions for current admin (force logout all devices)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await terminateAllAdminSessions(
      session.user.id,
      'USER_LOGOUT_ALL_DEVICES',
      session.user.id
    );

    return NextResponse.json({
      success: true,
      terminatedCount: count,
      message: `Terminated ${count} active session(s)`,
    });
  } catch (error) {
    console.error('❌ [SessionsAPI] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to terminate sessions' },
      { status: 500 }
    );
  }
}
