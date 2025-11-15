// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Step-up MFA Challenge API
 * 
 * POST - Request Step-up MFA challenge
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { stepUpMfaService } from '@/lib/services/step-up-mfa.service';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const body = await request.json();
    const { action, resourceType, resourceId, metadata } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    // Check if action requires Step-up MFA
    if (!stepUpMfaService.requiresStepUp(action)) {
      return NextResponse.json(
        { success: false, error: 'Action does not require Step-up MFA' },
        { status: 400 }
      );
    }

    // Request challenge
    const challenge = await stepUpMfaService.requestChallenge(
      session.user.id, // ✅ Fixed: use session.user.id instead of session.adminId
      action,
      resourceType,
      resourceId
    );

    return NextResponse.json({
      success: true,
      challengeId: challenge.challengeId,
      options: challenge.options,
      expiresAt: challenge.expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Step-up MFA challenge error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

