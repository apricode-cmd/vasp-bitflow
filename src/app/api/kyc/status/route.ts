/**
 * API: Check KYC Status
 * GET /api/kyc/status
 * 
 * Enterprise-level KYC status checking with proper session handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { checkKycStatus } from '@/lib/services/kyc.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  let session;
  
  try {
    // Check authentication - use client session (NextAuth v5)
    try {
      session = await getClientSession();
    } catch (jwtError: any) {
      // Handle JWT decode errors (e.g., after deployment with new secret)
      console.error('❌ JWT decode error:', jwtError.message);
      console.log('💡 Session token may be invalid or expired - returning 401');
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Session expired or invalid',
          code: 'SESSION_INVALID',
          message: 'Please log in again'
        },
        { status: 401 }
      );
    }
    
    if (!session?.user?.id) {
      console.log('⚠️ Unauthorized KYC status check attempt');
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized' 
        },
        { status: 401 }
      );
    }

    console.log('🔍 Checking KYC status for user:', session.user.id);

    // Check KYC status
    const result = await checkKycStatus(session.user.id);

    console.log('✅ KYC status retrieved successfully');

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('❌ KYC status check failed:', error);
    
    // Enterprise-level error handling
    const errorMessage = error.message || 'Failed to check KYC status';
    const statusCode = error.statusCode || 500;
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        // Include session info for debugging in development
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            hasSession: !!session,
            userId: session?.user?.id || 'N/A',
            errorStack: error.stack
          }
        })
      },
      { status: statusCode }
    );
  }
}
