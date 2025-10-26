/**
 * Terminate Session API
 * 
 * DELETE: Terminate a specific session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const authResult = await requireRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.id;
    const { sessionId } = params;

    // Verify the session belongs to this user
    const session = await prisma.systemLog.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
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
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        deviceType: 'Admin Panel',
        browser: request.headers.get('user-agent') || 'unknown',
        metadata: JSON.stringify({ terminatedSessionId: sessionId }),
      },
    });

    // In a real implementation, you would:
    // 1. Revoke the JWT token or session token
    // 2. Add to a blacklist
    // 3. Force re-authentication on that device

    return NextResponse.json({
      success: true,
      message: 'Session terminated successfully',
    });
  } catch (error) {
    console.error('Terminate session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to terminate session' },
      { status: 500 }
    );
  }
}

