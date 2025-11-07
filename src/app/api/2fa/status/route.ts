/**
 * GET /api/2fa/status
 * 
 * Get user's 2FA status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { getTotpStatus } from '@/lib/services/totp.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getClientSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const status = await getTotpStatus(session.user.id);
    
    return NextResponse.json({
      success: true,
      ...status
    });
  } catch (error: any) {
    console.error('[2FA Status] Error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to get 2FA status' },
      { status: 500 }
    );
  }
}

