/**
 * SumSub Webhook Endpoint
 * POST /sumsub/v1/notification
 * 
 * Receives webhooks from SumSub
 * This is the official SumSub webhook URL format
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

// Forward to our internal webhook handler
export async function POST(request: NextRequest) {
  try {
    console.log('📥 [SumSub] Webhook received at /sumsub/v1/notification');
    
    // Get the raw body
    const body = await request.text();
    const headers = request.headers;
    
    // Forward to our internal handler
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const forwardUrl = `${baseUrl}/api/kyc/webhook/sumsub`;
    
    console.log('🔄 [SumSub] Forwarding to:', forwardUrl);
    
    const response = await fetch(forwardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': headers.get('content-type') || 'application/json',
        'X-Signature': headers.get('x-signature') || '',
        'X-Sumsub-Signature': headers.get('x-sumsub-signature') || '',
        'X-Forwarded-From': '/sumsub/v1/notification',
      },
      body,
    });
    
    const data = await response.json();
    
    console.log('✅ [SumSub] Forwarded successfully:', { status: response.status });
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ [SumSub] Webhook forwarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    service: 'SumSub Webhook Endpoint',
    path: '/sumsub/v1/notification',
    methods: ['POST'],
    status: 'active',
  });
}

