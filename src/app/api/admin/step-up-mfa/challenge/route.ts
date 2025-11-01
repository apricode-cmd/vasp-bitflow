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
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

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
      session.adminId,
      action,
      resourceType,
      resourceId,
      metadata
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

