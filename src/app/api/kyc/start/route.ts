/**
 * API: Start KYC Verification
 * POST /api/kyc/start
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { startKycVerification } from '@/lib/services/kyc.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🚀 Starting KYC verification request...');
    
    // Check authentication
    const session = await auth();
    
    if (!session?.user?.id) {
      console.log('❌ Unauthorized - no session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', session.user.id);

    // Start KYC verification
    console.log('📝 Calling startKycVerification...');
    const result = await startKycVerification(session.user.id);
    
    console.log('✅ KYC verification started successfully');

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('❌ KYC start failed:', error);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to start KYC verification'
      },
      { status: 500 }
    );
  }
}
