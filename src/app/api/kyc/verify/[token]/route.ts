// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * White-Label KYC Verification Token API
 * 
 * Validates JWT token and returns Sumsub SDK token
 * Used by /kyc/verify/[token] page
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

interface VerifyTokenPayload {
  userId: string;
  sessionId: string;
  provider: string;
  exp?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse> {
  try {
    const token = params.token;
    console.log('🔐 [WHITE-LABEL] Verifying token:', token.substring(0, 20) + '...');

    // 1. Decode and verify JWT
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error('NEXTAUTH_SECRET not configured');
    }

    let payload: VerifyTokenPayload;
    try {
      payload = jwt.verify(token, secret) as VerifyTokenPayload;
    } catch (error: any) {
      console.error('❌ [WHITE-LABEL] Invalid token:', error.message);
      return NextResponse.json(
        { error: 'Invalid or expired verification link' },
        { status: 401 }
      );
    }

    console.log('✅ [WHITE-LABEL] Token verified:', {
      userId: payload.userId,
      provider: payload.provider,
      sessionId: payload.sessionId
    });

    // 2. Check if session exists and is valid
    const kycSession = await prisma.kycSession.findUnique({
      where: { id: payload.sessionId },
      select: {
        id: true,
        userId: true,
        status: true,
        kycProviderId: true,
        applicantId: true,
        metadata: true
      }
    });

    if (!kycSession) {
      console.error('❌ [WHITE-LABEL] KYC session not found:', payload.sessionId);
      return NextResponse.json(
        { error: 'Verification session not found' },
        { status: 404 }
      );
    }

    if (kycSession.userId !== payload.userId) {
      console.error('❌ [WHITE-LABEL] User mismatch');
      return NextResponse.json(
        { error: 'Invalid verification link' },
        { status: 403 }
      );
    }

    // 3. Log access for analytics
    try {
      const metadata = (kycSession.metadata as any) || {};
      await prisma.kycSession.update({
        where: { id: payload.sessionId },
        data: {
          metadata: {
            ...metadata,
            whitelabelAccess: {
              lastAccess: new Date().toISOString(),
              accessCount: (metadata.whitelabelAccess?.accessCount || 0) + 1,
              userAgent: request.headers.get('user-agent') || 'unknown'
            }
          }
        }
      });
      console.log('📊 [WHITE-LABEL] Access logged');
    } catch (error) {
      // Non-critical, continue anyway
      console.warn('⚠️ [WHITE-LABEL] Failed to log access:', error);
    }

    // 4. Generate fresh Sumsub SDK token
    console.log('🎫 [WHITE-LABEL] Generating SDK token...');
    
    const sdkTokenResponse = await fetch(
      new URL('/api/kyc/sdk-token', request.url).toString(),
      {
        method: 'GET',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
          // Pass user context for SDK token generation
          'X-User-Id': payload.userId
        }
      }
    );

    // Check if response is JSON (not HTML redirect)
    const contentType = sdkTokenResponse.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    if (!sdkTokenResponse.ok || !isJson) {
      const errorText = await sdkTokenResponse.text();
      console.error('❌ [WHITE-LABEL] Failed to generate SDK token:', {
        status: sdkTokenResponse.status,
        contentType,
        preview: errorText.substring(0, 200)
      });
      
      // If middleware redirected to login, provide clear error
      if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
        return NextResponse.json(
          { error: 'Authentication required. Please use the link from your email or log in first.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to generate verification token' },
        { status: 500 }
      );
    }

    const sdkTokenData = await sdkTokenResponse.json();

    console.log('✅ [WHITE-LABEL] SDK token generated successfully');

    // 5. Return SDK token for frontend
    return NextResponse.json({
      success: true,
      sdkToken: sdkTokenData.token,
      userId: payload.userId,
      provider: payload.provider,
      sessionId: payload.sessionId
    });

  } catch (error: any) {
    console.error('❌ [WHITE-LABEL] Verification error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to verify link',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
