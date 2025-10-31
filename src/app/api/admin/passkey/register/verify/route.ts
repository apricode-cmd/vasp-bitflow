/**
 * Passkey Registration Verification API
 * 
 * Verifies and saves WebAuthn credential
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/auth-admin';
import { PasskeyService } from '@/lib/services/passkey.service';

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { response, deviceName } = await request.json();

    const result = await PasskeyService.verifyPasskeyRegistration(
      session.user.id,
      response,
      deviceName
    );

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
    console.error('Passkey registration verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify registration' },
      { status: 500 }
    );
  }
}

