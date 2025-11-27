/**
 * GET /api/kyc/problematic-documents
 * 
 * Fetches detailed information about problematic documents from Sumsub
 * Called when user opens resubmit-documents page
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { prisma } from '@/lib/prisma';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getClientSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    console.log('🔍 [PROBLEMATIC-DOCS] Fetching for user:', userId);

    // Get user's KYC session
    const kycSession = await prisma.kycSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!kycSession) {
      return NextResponse.json(
        { error: 'No KYC session found' },
        { status: 404 }
      );
    }

    // Check if rejection allows resubmission
    if (kycSession.status !== 'REJECTED' || !kycSession.canResubmit) {
      return NextResponse.json(
        { error: 'KYC session is not in resubmittable state' },
        { status: 400 }
      );
    }

    const applicantId = kycSession.applicantId;
    if (!applicantId) {
      console.error('❌ [PROBLEMATIC-DOCS] No applicantId found in session:', {
        sessionId: kycSession.id,
        status: kycSession.status,
        hasApplicantId: !!kycSession.applicantId
      });
      return NextResponse.json(
        { error: 'Applicant ID not found' },
        { status: 400 }
      );
    }

    console.log('📋 [PROBLEMATIC-DOCS] Session:', {
      sessionId: kycSession.id,
      applicantId,
      status: kycSession.status,
      reviewRejectType: kycSession.reviewRejectType,
      rejectLabels: kycSession.rejectLabels
    });

    // Get KYC provider (Sumsub)
    const providerId = kycSession.kycProviderId || 'sumsub';
    const provider = await integrationFactory.getProviderByService(providerId);
    
    if (!provider) {
      return NextResponse.json(
        { error: 'KYC provider not found' },
        { status: 500 }
      );
    }

    console.log('🔍 [PROBLEMATIC-DOCS] Calling Sumsub API...');

    // Call getProblematicDocuments
    const sumsubAdapter = provider as any;
    if (!sumsubAdapter.getProblematicDocuments) {
      console.error('❌ [PROBLEMATIC-DOCS] Provider does not support getProblematicDocuments');
      
      // Fallback: return general rejectLabels
      return NextResponse.json({
        success: true,
        problematicDocuments: [],
        fallback: true,
        generalLabels: kycSession.rejectLabels || [],
        moderationComment: kycSession.moderationComment
      });
    }

    // Fetch detailed problematic documents from Sumsub
    const problematicDocs = await sumsubAdapter.getProblematicDocuments(applicantId);

    console.log('✅ [PROBLEMATIC-DOCS] Found:', problematicDocs.length, 'problematic images');

    // Optionally: Update kycSession with fresh data
    if (problematicDocs.length > 0) {
      await prisma.kycSession.update({
        where: { id: kycSession.id },
        data: {
          problematicSteps: problematicDocs as any,
          updatedAt: new Date()
        }
      });
      console.log('✅ [PROBLEMATIC-DOCS] Updated kycSession with fresh data');
    }

    return NextResponse.json({
      success: true,
      problematicDocuments: problematicDocs,
      fallback: false,
      sessionInfo: {
        status: kycSession.status,
        reviewRejectType: kycSession.reviewRejectType,
        rejectLabels: kycSession.rejectLabels,
        moderationComment: kycSession.moderationComment
      }
    });

  } catch (error: any) {
    console.error('❌ [PROBLEMATIC-DOCS] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch problematic documents',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

