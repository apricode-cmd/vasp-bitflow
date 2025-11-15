// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * API: KYC Webhook Handler
 * POST /api/kyc/webhook
 * 
 * Receives webhooks from KYC providers (KYCAID, SumSub, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processKycWebhook } from '@/lib/services/kyc.service';
import { systemLogService } from '@/lib/services/system-log.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Get provider from query or header
    const providerId = request.nextUrl.searchParams.get('provider') || 
                      request.headers.get('x-provider-id');
    
    if (!providerId) {
      console.error('❌ Webhook rejected: Missing provider ID');
      
      // Log failed webhook
      await systemLogService.createLog({
        source: 'KYCAID_WEBHOOK',
        eventType: 'WEBHOOK_RECEIVED',
        level: 'ERROR',
        endpoint: '/api/kyc/webhook',
        method: 'POST',
        statusCode: 400,
        errorMessage: 'Provider ID required',
        responseTime: Date.now() - startTime
      });
      
      return NextResponse.json(
        { error: 'Provider ID required. Use ?provider=kycaid in URL' },
        { status: 400 }
      );
    }

    // Get signature from header (provider-specific)
    const signature = request.headers.get('x-signature') || 
                     request.headers.get('x-kycaid-signature') ||
                     request.headers.get('x-sumsub-signature');

    // Get raw body for signature verification
    const body = await request.json();

    console.log(`📥 Received webhook from ${providerId}`, {
      hasSignature: !!signature,
      bodyKeys: Object.keys(body),
      timestamp: new Date().toISOString()
    });

    // Log full webhook payload for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Full webhook payload:', JSON.stringify(body, null, 2));
    } else {
      // In production, log only essential fields
      console.log('🔍 Webhook data:', {
        type: body.type,
        verification_id: body.verification_id,
        applicant_id: body.applicant_id,
        status: body.status,
        verified: body.verified,
        form_id: body.form_id
      });
    }

    // Process webhook
    const result = await processKycWebhook(providerId, body, signature || undefined);

    const responseTime = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ Webhook processed successfully`, {
        provider: providerId,
        status: result.status,
        session: result.session?.id
      });
      
      // Log successful webhook
      await systemLogService.createLog({
        source: 'KYCAID_WEBHOOK',
        eventType: 'WEBHOOK_RECEIVED',
        level: 'INFO',
        endpoint: '/api/kyc/webhook',
        method: 'POST',
        statusCode: 200,
        payload: {
          provider: providerId,
          type: body.type,
          verification_id: body.verification_id,
          applicant_id: body.applicant_id,
          status: body.status
        },
        responseTime,
        metadata: {
          sessionId: result.session?.id,
          hasSignature: !!signature
        }
      });
    } else {
      console.warn(`⚠️ Webhook processing failed`, {
        provider: providerId,
        error: result.message
      });
      
      // Log failed webhook processing
      await systemLogService.createLog({
        source: 'KYCAID_WEBHOOK',
        eventType: 'WEBHOOK_RECEIVED',
        level: 'WARN',
        endpoint: '/api/kyc/webhook',
        method: 'POST',
        statusCode: 200,
        payload: {
          provider: providerId,
          type: body.type
        },
        errorMessage: result.message,
        responseTime
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    console.error('❌ Webhook processing failed:', {
      error: error.message,
      stack: error.stack
    });
    
    // Log error
    await systemLogService.createLog({
      source: 'KYCAID_WEBHOOK',
      eventType: 'ERROR',
      level: 'ERROR',
      endpoint: '/api/kyc/webhook',
      method: 'POST',
      statusCode: 500,
      errorMessage: error.message,
      errorStack: error.stack,
      responseTime
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to process webhook'
      },
      { status: 500 }
    );
  }
}

// Add GET endpoint for webhook testing
export async function GET(request: NextRequest): Promise<NextResponse> {
  const providerId = request.nextUrl.searchParams.get('provider');
  
  return NextResponse.json({
    message: 'KYC Webhook Endpoint',
    provider: providerId || 'not specified',
    endpoint: `/api/kyc/webhook?provider=${providerId || 'kycaid'}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': 'optional - webhook signature for verification'
    },
    status: 'online',
    timestamp: new Date().toISOString()
  });
}
