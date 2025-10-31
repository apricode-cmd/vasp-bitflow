/**
 * Passkey Registration Verification API
 * 
 * Verifies and saves WebAuthn credential
 * Works both for first-time setup (no session) and adding additional passkeys (with session)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/auth-admin';
import { PasskeyService } from '@/lib/services/passkey.service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { response, deviceName, email } = body;

    console.log('🔐 Passkey verify request:', {
      email,
      deviceName,
      hasResponse: !!response,
      responseKeys: response ? Object.keys(response) : [],
    });

    // Try to get session (for adding additional passkeys)
    const session = await getAdminSession();
    
    let adminId: string;

    if (session?.user) {
      // Existing logged-in admin adding another passkey
      adminId = session.user.id;
      console.log('✅ Using session admin:', adminId);
    } else if (email) {
      // First-time setup - no session yet
      const admin = await prisma.admin.findUnique({
        where: { email },
        select: { id: true, isActive: true }
      });

      if (!admin || !admin.isActive) {
        console.error('❌ Admin not found:', email);
        return NextResponse.json(
          { error: 'Admin not found or inactive' },
          { status: 404 }
        );
      }

      adminId = admin.id;
      console.log('✅ Found admin by email:', adminId);
    } else {
      console.error('❌ No email and no session');
      return NextResponse.json(
        { error: 'Email required for first-time setup' },
        { status: 400 }
      );
    }

    console.log('🔍 Calling PasskeyService.verifyPasskeyRegistration...');
    const result = await PasskeyService.verifyPasskeyRegistration(
      adminId,
      response,
      deviceName
    );

    console.log('📊 Verification result:', {
      verified: result.verified,
      error: result.error,
      credentialId: result.credentialId,
    });

    if (!result.verified) {
      return NextResponse.json(
        { error: result.error || 'Verification failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      credentialId: result.credentialId,
    });
  } catch (error) {
    console.error('❌ Passkey registration verify error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify registration' },
      { status: 500 }
    );
  }
}

