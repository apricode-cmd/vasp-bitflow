/**
 * API: Check KYC Status
 * GET /api/kyc/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { checkKycStatus } from '@/lib/services/kyc.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication - use client session
    const session = await getClientSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check KYC status
    const result = await checkKycStatus(session.user.id);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('❌ KYC status check failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to check KYC status'
      },
      { status: 500 }
    );
  }
}
