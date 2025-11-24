// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * TEST ENDPOINT: Simulate Sumsub rejection for testing resubmission flow
 * POST /api/test/sumsub-reject
 * 
 * Body: {
 *   applicantId: string,
 *   rejectLabels: string[],
 *   reviewRejectType: 'RETRY' | 'FINAL',
 *   moderationComment?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development/sandbox
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      applicantId,
      rejectLabels = ['BAD_PROOF_OF_ADDRESS'],
      reviewRejectType = 'RETRY',
      moderationComment = 'Your proof of address document is unclear. Please upload a new one.'
    } = body;

    if (!applicantId) {
      return NextResponse.json(
        { error: 'applicantId is required' },
        { status: 400 }
      );
    }

    console.log('🧪 [TEST] Simulating Sumsub rejection:', {
      applicantId,
      rejectLabels,
      reviewRejectType,
      moderationComment
    });

    // Get Sumsub config
    const integration = await prisma.integration.findUnique({
      where: { service: 'sumsub' }
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Sumsub integration not configured' },
        { status: 500 }
      );
    }

    const config = integration.config as any;
    const appToken = config.appToken || integration.apiKey;
    const secretKey = config.secretKey;
    const baseUrl = config.baseUrl || 'https://api.sumsub.com';

    if (!appToken || !secretKey) {
      return NextResponse.json(
        { error: 'Sumsub credentials not configured' },
        { status: 500 }
      );
    }

    // Build HMAC signature
    const crypto = require('crypto');
    const ts = Math.floor(Date.now() / 1000).toString();
    const method = 'POST';
    const path = `/resources/applicants/${applicantId}/status/testCompleted`;
    const bodyStr = JSON.stringify({
      reviewAnswer: 'RED',
      rejectLabels,
      reviewRejectType,
      moderationComment,
      clientComment: 'Test rejection via API'
    });

    const payload = ts + method + path + bodyStr;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    console.log('📡 [TEST] Calling Sumsub testCompleted:', {
      url: `${baseUrl}${path}`,
      method,
      timestamp: ts
    });

    // Call Sumsub API
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Ts': ts,
        'X-App-Access-Sig': signature
      },
      body: bodyStr
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error('❌ [TEST] Sumsub testCompleted failed:', {
        status: response.status,
        statusText: response.statusText,
        response: responseData
      });

      return NextResponse.json(
        { 
          error: 'Failed to simulate rejection',
          status: response.status,
          details: responseData
        },
        { status: response.status }
      );
    }

    console.log('✅ [TEST] Sumsub rejection simulated:', responseData);

    return NextResponse.json({
      success: true,
      message: 'Rejection simulated successfully',
      applicantId,
      rejectLabels,
      reviewRejectType,
      moderationComment,
      sumsubResponse: responseData,
      note: 'Webhook should arrive shortly. Check /api/kyc/status to see the updated status.'
    });

  } catch (error: any) {
    console.error('❌ [TEST] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

