/**
 * POST /api/kyc/resubmit
 * 
 * Resubmit KYC application with corrected data
 * Simplified approach: update existing session, trigger new review
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
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

    // 2. Validate: can resubmit (REJECTED + RETRY)
    if (kycSession.status !== 'REJECTED' || !kycSession.canResubmit) {
      return NextResponse.json(
        { 
          error: 'Resubmission not allowed',
          reason: kycSession.status !== 'REJECTED' 
            ? 'Session is not rejected' 
            : 'Final rejection - cannot resubmit'
        },
        { status: 400 }
      );
    }

    console.log('✅ [RESUBMIT] Validation passed, updating session...');

    // 3. Update KYC session
    await prisma.kycSession.update({
      where: { id: sessionId },
      data: {
        status: 'PENDING',
        canResubmit: false, // Lock during review
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
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
        const provider = await integrationFactory.getProviderByService('sumsub');
        const sumsubAdapter = provider as any;
        
        if (sumsubAdapter.requestReview) {
          console.log('📤 [RESUBMIT] Requesting SumSub review for applicant:', kycSession.applicantId);
          
          const reviewResponse = await sumsubAdapter.requestReview(kycSession.applicantId);
          
          console.log('✅ [RESUBMIT] SumSub review requested:', reviewResponse);
        } else {
          console.warn('⚠️ [RESUBMIT] SumsubAdapter does not support requestReview yet');
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

