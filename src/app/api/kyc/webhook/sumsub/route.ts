// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * POST /api/kyc/webhook/sumsub
 * 
 * Sumsub webhook endpoint (configured in Sumsub dashboard)
 * Receives verification status updates from Sumsub
 * 
 * Security: Verifies HMAC signature using secret key
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body (needed for signature verification)
    const rawBody = await request.text();
    
    // 2. Get signature from headers
    // Sumsub can send signature in different headers depending on configuration
    const signature = request.headers.get('x-payload-digest') || 
                      request.headers.get('x-signature') || 
                      request.headers.get('digest') || '';

    console.log('📥 [WEBHOOK] Sumsub webhook received');
    console.log('📋 [WEBHOOK] ALL Headers:', Array.from(request.headers.entries()));
    console.log('📋 [WEBHOOK] Signature headers:', {
      'x-payload-digest': request.headers.get('x-payload-digest'),
      'x-payload-digest-alg': request.headers.get('x-payload-digest-alg'), // ✅ Algorithm header
      'x-signature': request.headers.get('x-signature'),
      'digest': request.headers.get('digest')
    });
    console.log('📄 [WEBHOOK] Raw body preview:', rawBody.substring(0, 200));
    console.log('📏 [WEBHOOK] Body length:', rawBody.length);
    console.log('🔐 [WEBHOOK] Expected algorithm from Sumsub:', request.headers.get('x-payload-digest-alg') || 'SHA256 (default)');

    if (!signature) {
      console.error('❌ No signature header found');
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
      );
    }
    
    console.log('🔐 [WEBHOOK] Signature received:', signature);

    // 3. Get Sumsub provider
    const provider = await integrationFactory.getProviderByService('sumsub');
    
    if (!provider) {
      console.error('❌ Sumsub provider not found');
      return NextResponse.json(
        { error: 'Sumsub provider not configured' },
        { status: 500 }
      );
    }

    // 4. Verify signature (official Sumsub method)
    const sumsubAdapter = provider as any;
    
    if (!sumsubAdapter.verifyWebhookSignature) {
      console.error('❌ Provider does not support webhook verification');
      return NextResponse.json(
        { error: 'Webhook verification not supported' },
        { status: 500 }
      );
    }

    // ✅ Pass algorithm header to verifyWebhookSignature
    const algorithmHeader = request.headers.get('x-payload-digest-alg') || 'HMAC_SHA256_HEX';
    const isValid = sumsubAdapter.verifyWebhookSignature(rawBody, signature, algorithmHeader);
    
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('✅ Webhook signature verified');

    // 5. Parse payload
    const payload = JSON.parse(rawBody);
    
    console.log('📊 [WEBHOOK] Raw payload:', {
      type: payload.type,
      applicantId: payload.applicantId,
      inspectionId: payload.inspectionId,
      reviewStatus: payload.reviewStatus,
      reviewAnswer: payload.reviewResult?.reviewAnswer,
      externalUserId: payload.externalUserId
    });

    // 6. Process webhook (normalize data)
    if (!sumsubAdapter.processWebhook) {
      console.error('❌ Provider does not support webhook processing');
      return NextResponse.json(
        { error: 'Webhook processing not supported' },
        { status: 500 }
      );
    }

    const event = sumsubAdapter.processWebhook(payload);

    console.log('📊 [WEBHOOK] Processed event:', {
      verificationId: event.verificationId,
      applicantId: event.applicantId,
      status: event.status,
      reason: event.reason,
      metadata: {
        type: event.metadata?.type,
        reviewStatus: event.metadata?.reviewStatus,
        reviewAnswer: event.metadata?.reviewAnswer
      }
    });

    // 7. Update KycSession in database
    // Find the session by verificationId (inspectionId) or applicantId
    const session = await prisma.kycSession.findFirst({
      where: {
        kycProviderId: 'sumsub',
        OR: [
          { verificationId: event.verificationId }, // inspectionId from SumSub
          { applicantId: event.applicantId },
          // Also try to match by externalUserId if stored
          event.metadata?.externalUserId ? { userId: event.metadata.externalUserId } : {}
        ].filter(condition => Object.keys(condition).length > 0) // Remove empty conditions
      }
    });

    if (!session) {
      console.warn('⚠️ [WEBHOOK] No KYC session found for:', {
        verificationId: event.verificationId,
        applicantId: event.applicantId,
        externalUserId: event.metadata?.externalUserId
      });
      
      // Return 200 OK (not 404) to prevent SumSub from retrying
      // This can happen if webhook arrives before session is created
      return NextResponse.json({
        success: false,
        error: 'Session not found',
        note: 'Webhook accepted but session not in database yet'
      }, { status: 200 });
    }

    // Helper: Merge metadata safely
    function mergeMetadata(existingMetadata: any, newMetadata: any): any {
      if (!existingMetadata || Object.keys(existingMetadata).length === 0) {
        return newMetadata;
      }
      return {
        ...existingMetadata,
        ...newMetadata,
        applicant: {
          ...(existingMetadata.applicant || {}),
          ...(newMetadata.applicant || {})
        }
      };
    }

    // Extract resubmission fields from webhook
    const reviewResult = event.metadata?.reviewResult || {};
    const reviewRejectType = reviewResult.reviewRejectType || null; // RETRY or FINAL
    const moderationComment = reviewResult.moderationComment || null;
    const clientComment = reviewResult.clientComment || null;
    const rejectLabels = reviewResult.rejectLabels || [];
    const buttonIds = reviewResult.buttonIds || [];
    const canResubmit = (event.status === 'rejected' && reviewRejectType === 'RETRY');

    console.log('📋 [WEBHOOK] Resubmission data:', {
      reviewRejectType,
      canResubmit,
      moderationComment: moderationComment?.substring(0, 50) + '...',
      rejectLabelsCount: rejectLabels.length
    });

    // Update with metadata preservation + resubmission fields
    const updated = await prisma.kycSession.update({
      where: { id: session.id },
      data: {
        status: event.status.toUpperCase() as any, // PENDING, APPROVED, REJECTED
        rejectionReason: event.reason || null,
        webhookData: event.metadata as any,
        completedAt: event.status === 'approved' ? new Date() : null,
        
        // Resubmission fields (SumSub)
        reviewRejectType,
        moderationComment,
        clientComment,
        rejectLabels,
        buttonIds,
        canResubmit,
        
        metadata: mergeMetadata(session.metadata, {
          lastWebhook: new Date(),
          webhookStatus: event.status,
          webhookReason: event.reason,
          reviewRejectType,
          canResubmit
        }),
        updatedAt: new Date()
      }
    });

    // Note: Problematic documents are now fetched on-demand when user opens resubmit page
    // This is more reliable and provides fresh data
    // See: /api/kyc/problematic-documents
    if (canResubmit && event.applicantId) {
      console.log('ℹ️ [WEBHOOK] RETRY rejection detected. User can fetch problematic docs via /api/kyc/problematic-documents');
    }

    console.log(`✅ Updated KYC session: ${updated.id}`);

    // Log webhook received (use general audit log for system events)
    await auditService.log({
      actorType: 'SYSTEM',
      action: AUDIT_ACTIONS.KYC_WEBHOOK_RECEIVED,
      entityType: AUDIT_ENTITIES.KYC_SESSION,
      entityId: session.id,
      context: {
        provider: 'sumsub',
        webhookType: payload.type,
        applicantId: event.applicantId,
        verificationId: event.verificationId,
        oldStatus: session.status,
        newStatus: updated.status,
        reviewResult: {
          reviewAnswer: reviewResult.reviewAnswer,
          reviewRejectType,
          rejectLabels,
          moderationComment: moderationComment?.substring(0, 100)
        },
        signatureVerified: true
      },
      severity: 'INFO'
    });

    // Log status change if status actually changed
    if (session.status !== updated.status) {
      await auditService.log({
        actorType: 'SYSTEM',
        action: AUDIT_ACTIONS.KYC_STATUS_CHANGED,
        entityType: AUDIT_ENTITIES.KYC_SESSION,
        entityId: session.id,
        context: {
          provider: 'sumsub',
          oldStatus: session.status,
          newStatus: updated.status,
          reason: event.reason,
          reviewRejectType,
          rejectLabels
        },
        severity: updated.status === 'APPROVED' ? 'INFO' : updated.status === 'REJECTED' ? 'WARNING' : 'INFO'
      });
    }

    // Revalidate cache after status change
    revalidatePath('/admin/kyc');
    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${updated.userId}`);
    revalidatePath(`/admin/kyc/${updated.id}`);
    revalidateTag('kyc-sessions');
    revalidateTag(`kyc-${updated.userId}`);
    console.log('✅ Cache invalidated for user:', updated.userId);

    // 8. Log to audit (optional - uncomment if you have audit logging)
    /*
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'KYC_STATUS_UPDATED',
        entity: 'KYC_SESSION',
        entityId: session.id,
        oldValue: session.status,
        newValue: event.status.toUpperCase(),
        metadata: {
          provider: 'sumsub',
          applicantId: event.applicantId,
          reason: event.reason
        }
      }
    });
    */

    // 9. Return success response
    return NextResponse.json({
      success: true,
      sessionId: updated.id,
      status: event.status
    });
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Webhook processing failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/kyc/webhook/sumsub
 * 
 * Health check endpoint (for webhook configuration testing)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'Sumsub Webhook Endpoint',
    status: 'active',
    timestamp: new Date().toISOString()
  });
}

