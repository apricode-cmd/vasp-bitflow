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
      return NextResponse.json(
        { error: 'Provider ID required' },
        { status: 400 }
      );
    }

    // Get signature from header (provider-specific)
    const signature = request.headers.get('x-signature') || 
                     request.headers.get('x-kycaid-signature') ||
                     request.headers.get('x-sumsub-signature');

    // Get raw body for signature verification
    const body = await request.json();

    console.log(`📥 Received webhook from ${providerId}`);

    // Process webhook
    const result = await processKycWebhook(providerId, body, signature || undefined);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Webhook processing failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to process webhook'
      },
      { status: 500 }
    );
  }
}
