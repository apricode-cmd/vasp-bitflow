// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * KYC Submit for Review API
 * 
 * POST /api/kyc/submit-review - Submit KYC applicant for final review after uploading all documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { prisma } from '@/lib/prisma';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getClientSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    console.log('🚀 Submit for review request:', { userId });

    // Get KYC session
    const kycSession = await prisma.kycSession.findUnique({
      where: { userId }
    });

    if (!kycSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC session not found. Please start KYC verification first.'
        },
        { status: 400 }
      );
    }

    // Check if already submitted or approved
    if (kycSession.status === 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC already approved'
        },
        { status: 400 }
      );
    }

    if (kycSession.status === 'IN_PROGRESS') {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC verification already in progress'
        },
        { status: 400 }
      );
    }

    // Extract applicant ID from session metadata
    const metadata = kycSession.metadata as any;
    const applicantId = metadata?.applicant?.id || metadata?.applicantId;

    if (!applicantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No applicant ID found. Please restart KYC verification.'
        },
        { status: 400 }
      );
    }

    // Get KYC provider (Sumsub/KYCAID)
    const kycProvider = await integrationFactory.getKycProvider();

    // Check if provider supports submit for review
    if (!kycProvider.submitForReview) {
      // Fallback: Update status to IN_PROGRESS manually
      await prisma.kycSession.update({
        where: { id: kycSession.id },
        data: {
          status: 'IN_PROGRESS',
          submittedAt: new Date()
        }
      });

      console.log('⚠️ Provider does not support submitForReview, marked as IN_PROGRESS manually');

      return NextResponse.json({
        success: true,
        message: 'KYC marked as submitted'
      });
    }

    // Check required documents (optional)
    if (kycProvider.checkRequiredDocuments) {
      console.log('🔍 Checking required documents...');
      const docsCheck = await kycProvider.checkRequiredDocuments(applicantId);
      
      if (!docsCheck.ready && docsCheck.missing.length > 0) {
        console.warn('⚠️ Missing required documents:', docsCheck.missing);
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required documents',
            missing: docsCheck.missing
          },
          { status: 400 }
        );
      }
    }

    // Submit to provider
    console.log('📡 Submitting to KYC provider:', kycProvider.providerId);
    const submitResult = await kycProvider.submitForReview(applicantId);

    if (!submitResult.success) {
      console.error('❌ Provider submit failed:', submitResult.error);
      return NextResponse.json(
        {
          success: false,
          error: submitResult.error || 'Failed to submit for review'
        },
        { status: 500 }
      );
    }

    console.log('✅ Submitted for review successfully');

    // Update KYC session status
    await prisma.kycSession.update({
      where: { id: kycSession.id },
      data: {
        status: 'IN_PROGRESS',
        submittedAt: new Date(),
        metadata: {
          ...metadata,
          submittedForReviewAt: new Date().toISOString(),
          provider: kycProvider.providerId
        }
      }
    });

    // Log user action
    await auditService.logUserAction(
      userId,
      AUDIT_ACTIONS.KYC_SUBMITTED,
      AUDIT_ENTITIES.KYC_SESSION,
      kycSession.id,
      {
        applicantId,
        provider: kycProvider.providerId
      }
    );

    return NextResponse.json({
      success: true,
      message: 'KYC submitted for review successfully'
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Submit for review error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit for review'
      },
      { status: 500 }
    );
  }
}

