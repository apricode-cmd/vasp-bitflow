/**
 * Step-up MFA Verification API
 * 
 * POST - Verify Step-up MFA response
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { stepUpMfaService } from '@/lib/services/step-up-mfa.service';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const body = await request.json();
    const { challengeId, response } = body;

    if (!challengeId || !response) {
      return NextResponse.json(
        { success: false, error: 'Challenge ID and response are required' },
        { status: 400 }
      );
    }

    // Verify challenge
    const verified = await stepUpMfaService.verifyChallenge(
      challengeId,
      response as AuthenticationResponseJSON
    );

    if (!verified) {
      return NextResponse.json(
        { success: false, error: 'Verification failed' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
    });
  } catch (error: any) {
    console.error('❌ Step-up MFA verification error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}

