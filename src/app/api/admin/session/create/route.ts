/**
 * Admin Session Creation Endpoint
 * 
 * Called after successful authentication to create session record in database
 * This is separate from NextAuth because we need access to request headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/auth-admin';
import { createSessionRecord } from '@/lib/services/admin-session-tracker.service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await getAdminSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request data
    const body = await request.json();
    const { sessionId, mfaMethod } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Extract request metadata
    const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const country = request.geo?.country || null;
    const city = request.geo?.city || null;

    // Create session record
    const sessionRecord = await createSessionRecord({
      adminId: session.user.id,
      sessionId,
      ipAddress,
      userAgent,
      country,
      city,
      mfaMethod: mfaMethod || null,
    });

    return NextResponse.json({
      success: true,
      sessionId: sessionRecord.id,
      expiresAt: sessionRecord.expiresAt,
      idleTimeout: sessionRecord.idleTimeout,
      maxDuration: sessionRecord.maxDuration,
    });
  } catch (error) {
    console.error('❌ [SessionCreate] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session record' },
      { status: 500 }
    );
  }
}

