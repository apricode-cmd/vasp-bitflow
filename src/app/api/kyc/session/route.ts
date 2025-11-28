// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * GET /api/kyc/session
 * 
 * Get current user's KYC session with all rejection data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getClientSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔍 [KYC SESSION] Fetching for user:', session.user.id);

    // 2. Get KYC session
    const kycSession = await prisma.kycSession.findUnique({
      where: { userId: session.user.id }
    });

    if (!kycSession) {
      return NextResponse.json(
        { error: 'KYC session not found' },
        { status: 404 }
      );
    }

    console.log('✅ [KYC SESSION] Found:', {
      id: kycSession.id,
      status: kycSession.status,
      reviewRejectType: kycSession.reviewRejectType,
      rejectLabelsCount: kycSession.rejectLabels?.length || 0
    });

    // 3. Return session data
    return NextResponse.json({
      success: true,
      sessionId: kycSession.id,
      id: kycSession.id,
      status: kycSession.status,
      reviewRejectType: kycSession.reviewRejectType,
      moderationComment: kycSession.moderationComment,
      clientComment: kycSession.clientComment,
      rejectLabels: kycSession.rejectLabels || [],
      buttonIds: kycSession.buttonIds || [],
      attempts: kycSession.attempts || 0,
      canResubmit: kycSession.canResubmit || false,
      kycProviderId: kycSession.kycProviderId,
      applicantId: kycSession.applicantId,
      submittedAt: kycSession.submittedAt,
      reviewedAt: kycSession.reviewedAt,
      completedAt: kycSession.reviewedAt,
      rejectionReason: kycSession.rejectionReason,
      problematicSteps: kycSession.problematicSteps || []
    });

  } catch (error: any) {
    console.error('❌ [KYC SESSION] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch KYC session' },
      { status: 500 }
    );
  }
}

