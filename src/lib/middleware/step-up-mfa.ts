/**
 * Step-up MFA Helpers for API Routes
 * 
 * Provides utilities for integrating Step-up MFA into API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { stepUpMfaService, type StepUpAction } from '@/lib/services/step-up-mfa.service';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

export interface StepUpMfaResult {
  requiresMfa: boolean;
  challengeId?: string;
  options?: any;
  verified?: boolean;
  error?: string;
}

/**
 * Check and handle Step-up MFA for critical actions
 * 
 * Usage in API route:
 * ```typescript
 * const body = await request.json();
 * const mfaResult = await handleStepUpMfa(body, adminId, 'APPROVE_PAYOUT');
 * if (mfaResult.requiresMfa) {
 *   return NextResponse.json(mfaResult);
 * }
 * if (!mfaResult.verified) {
 *   return NextResponse.json({ error: mfaResult.error }, { status: 403 });
 * }
 * // Proceed with action
 * ```
 */
export async function handleStepUpMfa(
  body: any,
  adminId: string,
  action: StepUpAction,
  resourceType?: string,
  resourceId?: string
): Promise<StepUpMfaResult> {
  try {
    // Check if action requires Step-up MFA
    if (!stepUpMfaService.requiresStepUp(action)) {
      return { requiresMfa: false, verified: true };
    }

    // If no MFA data provided, request challenge
    if (!body.mfaChallengeId || !body.mfaResponse) {
      const challenge = await stepUpMfaService.requestChallenge(
        adminId,
        action,
        resourceType,
        resourceId
      );

      return {
        requiresMfa: true,
        challengeId: challenge.challengeId,
        options: challenge.options,
      };
    }

    // Verify MFA response
    const verified = await stepUpMfaService.verifyChallenge(
      body.mfaChallengeId,
      body.mfaResponse as AuthenticationResponseJSON
    );

    if (!verified) {
      return {
        requiresMfa: false,
        verified: false,
        error: 'MFA verification failed',
      };
    }

    return {
      requiresMfa: false,
      verified: true,
    };
  } catch (error: any) {
    console.error('Step-up MFA error:', error);
    return {
      requiresMfa: false,
      verified: false,
      error: error.message || 'MFA verification failed',
    };
  }
}

/**
 * Middleware wrapper for Step-up MFA
 * 
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   return await withStepUpMfa(
 *     request,
 *     'APPROVE_PAYOUT',
 *     async (session) => {
 *       // Your actual logic here
 *       return NextResponse.json({ success: true });
 *     }
 *   );
 * }
 * ```
 */
export async function withStepUpMfa<T>(
  request: NextRequest,
  action: StepUpAction,
  handler: (session: any, body: any) => Promise<NextResponse<T>>,
  options?: {
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, any>;
  }
): Promise<NextResponse<T | StepUpMfaResult>> {
  try {
    // Get session (should be done by route first)
    const body = await request.json();
    
    // Extract adminId from session (assuming it's in headers or body)
    // This is a simplified version - actual implementation depends on your auth setup
    const adminId = body.adminId || (request as any).adminId;
    
    if (!adminId) {
      return NextResponse.json(
        { error: 'Unauthorized' } as any,
        { status: 401 }
      );
    }

    // Handle Step-up MFA
    const mfaResult = await handleStepUpMfa(
      request,
      adminId,
      action,
      options?.resourceType,
      options?.resourceId,
      options?.metadata
    );

    // If MFA is required, return challenge
    if (mfaResult.requiresMfa) {
      return NextResponse.json(mfaResult as any);
    }

    // If verification failed, return error
    if (!mfaResult.verified) {
      return NextResponse.json(
        { error: mfaResult.error || 'MFA verification failed' } as any,
        { status: 403 }
      );
    }

    // MFA verified, proceed with handler
    return await handler({ adminId }, body);
  } catch (error: any) {
    console.error('withStepUpMfa error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' } as any,
      { status: 500 }
    );
  }
}

/**
 * Simple check if body contains valid MFA verification
 */
export function hasMfaVerification(body: any): boolean {
  return !!(body.mfaChallengeId && body.mfaResponse);
}

/**
 * Extract MFA data from request body
 */
export function extractMfaData(body: any): {
  challengeId: string;
  response: AuthenticationResponseJSON;
} | null {
  if (!hasMfaVerification(body)) {
    return null;
  }

  return {
    challengeId: body.mfaChallengeId,
    response: body.mfaResponse,
  };
}

