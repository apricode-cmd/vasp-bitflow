/**
 * POST /api/kyc/resubmit
 * 
 * Resubmit KYC application with corrected data
 * Simplified approach: update existing session, trigger new review
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';

// Maximum number of resubmission attempts allowed
const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const session = await getClientSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, formData } = body;

    console.log('📥 [RESUBMIT] Request:', {
      userId: session.user.id,
      sessionId,
      formDataKeys: Object.keys(formData || {})
    });

    // 1. Validate: session exists and belongs to user
    const kycSession = await prisma.kycSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    });

    if (!kycSession) {
      return NextResponse.json(
        { error: 'KYC session not found' },
        { status: 404 }
      );
    }

    // 2. Validate: can resubmit (REJECTED + under MAX_ATTEMPTS)
    const currentAttempt = kycSession.attempts || 1;
    
    if (kycSession.status !== 'REJECTED') {
      return NextResponse.json(
        { 
          error: 'Resubmission not allowed',
          reason: 'Session is not rejected' 
        },
        { status: 400 }
      );
    }

    if (currentAttempt >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { 
          error: 'Maximum attempts reached',
          reason: `You have used all ${MAX_ATTEMPTS} resubmission attempts. Please contact support.`,
          attempts: currentAttempt,
          maxAttempts: MAX_ATTEMPTS
        },
        { status: 400 }
      );
    }

    console.log(`✅ [RESUBMIT] Validation passed (attempt ${currentAttempt}/${MAX_ATTEMPTS}), updating session...`);

    // 3. Update KYC session
    await prisma.kycSession.update({
      where: { id: sessionId },
      data: {
        status: 'PENDING',
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
        // Clear rejection data
        reviewRejectType: null,
        moderationComment: null,
        clientComment: null,
        rejectLabels: [],
        canResubmit: false,
        metadata: {
          ...(kycSession.metadata as any),
          lastResubmit: new Date(),
          resubmitAttempt: (kycSession.attempts || 0) + 1
        }
      }
    });

    // 4. Update form data (delete old, insert new)
    await prisma.kycFormData.deleteMany({
      where: { kycSessionId: sessionId }
    });

    const formDataEntries = Object.entries(formData).map(([fieldName, fieldValue]) => ({
      kycSessionId: sessionId,
      fieldName,
      fieldValue: String(fieldValue)
    }));

    if (formDataEntries.length > 0) {
      await prisma.kycFormData.createMany({
        data: formDataEntries
      });
    }

    console.log('✅ [RESUBMIT] Form data updated:', formDataEntries.length, 'fields');

    // 5. Trigger review in SumSub (if using SumSub provider)
    if (kycSession.kycProviderId === 'sumsub' && kycSession.applicantId) {
      try {
        // Get provider and initialize with config from DB
        const provider = await integrationFactory.getProviderByService('sumsub');
        
        if (!provider) {
          console.warn('⚠️ [RESUBMIT] Sumsub provider not found');
        } else {
          // Initialize with config from database
          const integration = await prisma.integration.findUnique({
            where: { service: 'sumsub' }
          });

          if (integration) {
            await provider.initialize({
              apiKey: integration.apiKey,
              apiEndpoint: integration.apiEndpoint || undefined,
              ...(integration.config as Record<string, any> || {})
            });

            const sumsubAdapter = provider as any;
            
            // First, update applicant data with new form data
            if (sumsubAdapter.updateApplicantData) {
              try {
                console.log('📝 [RESUBMIT] Updating applicant data in SumSub...');
                await sumsubAdapter.updateApplicantData(kycSession.applicantId, formData);
                console.log('✅ [RESUBMIT] Applicant data updated in SumSub');
              } catch (updateError) {
                console.error('❌ [RESUBMIT] Failed to update applicant data:', updateError);
                // Continue anyway - requestReview might still work
              }
            }

            // Then, request a new review
            if (sumsubAdapter.requestReview) {
              console.log('📤 [RESUBMIT] Requesting SumSub review for applicant:', kycSession.applicantId);
              
              const reviewResponse = await sumsubAdapter.requestReview(kycSession.applicantId);
              
              console.log('✅ [RESUBMIT] SumSub review requested:', reviewResponse);
            } else {
              console.warn('⚠️ [RESUBMIT] SumsubAdapter does not support requestReview method');
            }
          } else {
            console.warn('⚠️ [RESUBMIT] Sumsub integration config not found in DB');
          }
        }
      } catch (error) {
        console.error('❌ [RESUBMIT] Failed to request SumSub review:', error);
        // Don't fail the resubmission, just log the error
      }
    }

    // 6. Revalidate cache
    revalidatePath('/kyc');
    revalidatePath('/admin/kyc');
    revalidatePath(`/admin/users/${session.user.id}`);

    console.log('✅ [RESUBMIT] Resubmission successful');

    return NextResponse.json({
      success: true,
      message: 'KYC resubmitted successfully',
      sessionId,
      status: 'PENDING',
      attempt: (kycSession.attempts || 0) + 1
    });

  } catch (error: any) {
    console.error('❌ [RESUBMIT] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to resubmit KYC',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

