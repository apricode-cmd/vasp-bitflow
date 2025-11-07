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

    console.log('📥 Sumsub webhook received');
    console.log('📋 Headers:', {
      'x-payload-digest': request.headers.get('x-payload-digest'),
      'x-signature': request.headers.get('x-signature'),
      'digest': request.headers.get('digest')
    });

    if (!signature) {
      console.error('❌ No signature header found');
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
      );
    }

    // 3. Get Sumsub provider
    const provider = await integrationFactory.getProviderByService('sumsub');
    
    if (!provider) {
      console.error('❌ Sumsub provider not found');
      return NextResponse.json(
        { error: 'Sumsub provider not configured' },
        { status: 500 }
      );
    }

    // 4. Verify signature
    const sumsubAdapter = provider as any;
    
    if (!sumsubAdapter.verifyWebhookSignature) {
      console.error('❌ Provider does not support webhook verification');
      return NextResponse.json(
        { error: 'Webhook verification not supported' },
        { status: 500 }
      );
    }

    const isValid = sumsubAdapter.verifyWebhookSignature(rawBody, signature);
    
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
    const updated = await prisma.kycSession.updateMany({
      where: {
        kycProviderId: 'sumsub',
        OR: [
          { verificationId: event.verificationId },
          { applicantId: event.applicantId }
        ]
      },
      data: {
        status: event.status.toUpperCase() as any, // PENDING, APPROVED, REJECTED
        rejectionReason: event.reason || null,
        webhookData: event.metadata as any,
        completedAt: event.status === 'approved' ? new Date() : null,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Updated ${updated.count} KYC session(s)`);

    // 8. Log to audit (optional)
    if (updated.count > 0) {
      // Find the session to get userId for audit log
      const session = await prisma.kycSession.findFirst({
        where: {
          kycProviderId: 'sumsub',
          OR: [
            { verificationId: event.verificationId },
            { applicantId: event.applicantId }
          ]
        }
      });

      if (session) {
        // Log audit event (optional - uncomment if you have audit logging)
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
      }
    }

    // 9. Return success response
    return NextResponse.json({
      success: true,
      processed: updated.count,
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

