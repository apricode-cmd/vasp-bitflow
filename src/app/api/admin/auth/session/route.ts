// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin Session API
 * 
 * Creates admin session after successful Passkey authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAdminSession } from '@/lib/services/admin-session.service';
import { createSessionRecord } from '@/lib/services/admin-session-tracker.service';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      );
    }

    console.log('🔐 Creating admin session with OTAT...');

    // Find and validate OTAT
    const otat = await prisma.oneTimeAuthToken.findUnique({
      where: { token },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            isSuspended: true,
          },
        },
      },
    });

    if (!otat) {
      console.error('❌ OTAT not found');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if already used
    if (otat.usedAt) {
      console.error('❌ OTAT already used');
      return NextResponse.json(
        { error: 'Token already used' },
        { status: 401 }
      );
    }

    // Check if expired
    if (otat.expiresAt < new Date()) {
      console.error('❌ OTAT expired');
      await prisma.oneTimeAuthToken.delete({ where: { id: otat.id } });
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 401 }
      );
    }

    // Check admin is active
    if (!otat.admin.isActive || otat.admin.isSuspended) {
      console.error('❌ Admin not active');
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 403 }
      );
    }

    console.log('✅ OTAT valid, creating session...');

    // Mark OTAT as used
    await prisma.oneTimeAuthToken.update({
      where: { id: otat.id },
      data: {
        usedAt: new Date(),
        usedFrom: 'session-api',
      },
    });

    // Create session (JWT cookie)
    const result = await createAdminSession(otat.admin.id, 'PASSKEY');

    if (!result.success) {
      console.error('❌ Failed to create session:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to create session' },
        { status: 500 }
      );
    }

    console.log('✅ Admin session created for:', otat.admin.email);

    // Create session record in database for tracking
    try {
      const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const country = request.geo?.country || null;
      const city = request.geo?.city || null;

      await createSessionRecord({
        adminId: otat.admin.id,
        sessionId: crypto.randomUUID(),
        ipAddress,
        userAgent,
        country,
        city,
        mfaMethod: 'PASSKEY',
      });

      console.log('✅ Session record created in database');
    } catch (error) {
      console.error('⚠️ Failed to create session record (non-critical):', error);
      // Don't fail the login if session tracking fails
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: otat.admin.id,
        email: otat.admin.email,
        role: otat.admin.role,
      },
    });
  } catch (error) {
    console.error('❌ Session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
