/**
 * Current Admin Sessions API
 * 
 * GET: List all active sessions for current admin
 * DELETE: Terminate a specific session
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessions = await prisma.adminSession.findMany({
      where: {
        adminId: session.user.id,
        isValid: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        sessionToken: true,
        ipAddress: true,
        device: true,
        browser: true,
        os: true,
        location: true,
        lastActive: true,
        createdAt: true,
      },
      orderBy: {
        lastActive: 'desc',
      },
    });

    // Get current session token from cookie
    const cookies = request.cookies;
    const currentSessionToken = cookies.get('next-auth.session-token.admin')?.value;

    // Mark current session
    const sessionsWithCurrent = sessions.map(s => ({
      ...s,
      isCurrent: s.sessionToken === currentSessionToken,
    }));

    return NextResponse.json({
      success: true,
      sessions: sessionsWithCurrent,
    });
  } catch (error) {
    console.error('❌ Get sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const targetSession = await prisma.adminSession.findFirst({
      where: {
        id: sessionId,
        adminId: session.user.id,
      },
    });

    if (!targetSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Invalidate session
    await prisma.adminSession.update({
      where: { id: sessionId },
      data: {
        isValid: false,
        terminatedAt: new Date(),
        terminationReason: 'USER_REVOKED',
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        action: 'SESSION_TERMINATED',
        entity: 'ADMIN_SESSION',
        entityId: sessionId,
        oldValue: JSON.stringify({
          ipAddress: targetSession.ipAddress,
          device: targetSession.device,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Session terminated successfully',
    });
  } catch (error) {
    console.error('❌ Terminate session error:', error);
    return NextResponse.json(
      { error: 'Failed to terminate session' },
      { status: 500 }
    );
  }
}

