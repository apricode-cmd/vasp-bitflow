// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Terminate Session API
 * 
 * DELETE: Terminate a specific session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { revokeSession } from '@/lib/session-revocation-check';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { session } = authResult;

    const userId = session.user.id;
    const { sessionId } = params;

    // Verify the session log belongs to this user
    const sessionLog = await prisma.systemLog.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!sessionLog) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Log session termination
    await prisma.systemLog.create({
      data: {
        userId,
        action: 'SESSION_TERMINATED',
        path: `/api/admin/sessions/${sessionId}`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        deviceType: 'Admin Panel',
        browser: 'Admin',
        metadata: { terminatedSessionId: sessionId },
      },
    });

    // Revoke session (DATABASE-BACKED, SECURE, Edge-compatible)
    const sessionKey = `${sessionLog.ipAddress}-${sessionLog.deviceType}-${sessionLog.browser}`;
    
    await revokeSession(
      sessionKey,
      sessionLog.userId!,
      userId,
      'Manual session termination by administrator'
    );

    return NextResponse.json({
      success: true,
      message: 'Session terminated successfully. User will be logged out on next page load.',
    });
  } catch (error) {
    console.error('Terminate session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to terminate session' },
      { status: 500 }
    );
  }
}

