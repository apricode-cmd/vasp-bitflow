/**
 * API: KYC Webhook Handler
 * POST /api/kyc/webhook
 * 
 * Receives webhooks from KYC providers (KYCAID, SumSub, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processKycWebhook } from '@/lib/services/kyc.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get provider from query or header
    const providerId = request.nextUrl.searchParams.get('provider') || 
                      request.headers.get('x-provider-id');
    
    if (!providerId) {
      console.error('❌ Webhook rejected: Missing provider ID');
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

    // Process webhook
    const result = await processKycWebhook(providerId, body, signature || undefined);

    if (result.success) {
      console.log(`✅ Webhook processed successfully`, {
        provider: providerId,
        status: result.status,
        session: result.session?.id
      });
    } else {
      console.warn(`⚠️ Webhook processing failed`, {
        provider: providerId,
        error: result.message
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Webhook processing failed:', {
      error: error.message,
      stack: error.stack
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
