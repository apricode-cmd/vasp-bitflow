/**
 * Passkey Authentication Verification API
 * 
 * Verifies passkey and creates admin session
 */

import { NextRequest, NextResponse } from 'next/server';
import { PasskeyService } from '@/lib/services/passkey.service';
import { adminSignIn } from '@/auth-admin';

export async function POST(request: NextRequest) {
  try {
    const { response, email } = await request.json();

    const result = await PasskeyService.verifyPasskeyAuthentication(response, email);

    if (!result.verified || !result.admin) {
      return NextResponse.json(
        { error: result.error || 'Verification failed' },
        { status: 401 }
      );
    }

    // Create admin session using NextAuth
    // Note: We'll need to integrate this with adminSignIn
    
    return NextResponse.json({
      success: true,
      admin: {
        id: result.admin.id,
        email: result.admin.email,
        role: result.admin.role,
        name: `${result.admin.firstName} ${result.admin.lastName}`,
      },
    });
  } catch (error) {
    console.error('Passkey verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify authentication' },
      { status: 500 }
    );
  }
}

