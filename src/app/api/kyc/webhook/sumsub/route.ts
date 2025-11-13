/**
 * POST /api/kyc/webhook/sumsub
 * 
 * Sumsub webhook endpoint (configured in Sumsub dashboard)
 * Receives verification status updates from Sumsub
 * 
 * Security: Verifies HMAC signature using secret key
 */

import { NextRequest, NextResponse } from 'next/server';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { prisma } from '@/lib/prisma';

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
    
    console.log('📊 Webhook payload:', {
      type: payload.type,
      applicantId: payload.applicantId,
      reviewStatus: payload.reviewStatus
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

    console.log('📊 Processed webhook event:', {
      applicantId: event.applicantId,
      status: event.status,
      reason: event.reason
    });

    // 7. Update KycSession in database
    // Find the session first to preserve metadata
    const session = await prisma.kycSession.findFirst({
      where: {
        kycProviderId: 'sumsub',
        OR: [
          { verificationId: event.verificationId },
          { applicantId: event.applicantId }
        ]
      }
    });

    if (!session) {
      console.warn('⚠️ No KYC session found for webhook event');
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 });
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

    // Update with metadata preservation
    const updated = await prisma.kycSession.update({
      where: { id: session.id },
      data: {
        status: event.status.toUpperCase() as any, // PENDING, APPROVED, REJECTED
        rejectionReason: event.reason || null,
        webhookData: event.metadata as any,
        completedAt: event.status === 'approved' ? new Date() : null,
        metadata: mergeMetadata(session.metadata, {
          lastWebhook: new Date(),
          webhookStatus: event.status,
          webhookReason: event.reason
        }),
        updatedAt: new Date()
      }
    });

    console.log(`✅ Updated KYC session: ${updated.id}`);

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

