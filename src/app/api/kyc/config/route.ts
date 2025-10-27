/**
 * API: Get KYC Form Configuration
 * GET /api/kyc/config
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getKycFormConfig } from '@/lib/services/kyc.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get form configuration
    const config = await getKycFormConfig();

    if (!config) {
      return NextResponse.json(
        { 
          success: false,
          error: 'KYC provider not configured'
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      config
    });
  } catch (error: any) {
    console.error('❌ Failed to get KYC config:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get KYC configuration'
      },
      { status: 500 }
    );
  }
}

