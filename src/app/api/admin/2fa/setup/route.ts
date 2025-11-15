// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin 2FA Setup API
 * 
 * POST /api/admin/2fa/setup
 * 
 * Initialize TOTP setup for admin (generate secret and QR code)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/auth-admin';
import { 
  generateTotpSecret, 
  generateQrCode 
} from '@/lib/services/totp.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getAdminSession();
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin session required' },
        { status: 401 }
      );
    }

    console.log('🔐 [Admin2FA] Setup request for:', session.user.email);

    // Generate TOTP secret
    const { secret, base32 } = generateTotpSecret();
    
    // Generate QR code with admin email
    const qrCodeDataUrl = await generateQrCode(secret, session.user.email);
    
    console.log('✅ [Admin2FA] Secret generated for admin:', session.user.id);
    
    // Return secret (hex) and QR code
    // Secret will be encrypted when admin verifies and enables 2FA
    return NextResponse.json({
      success: true,
      secret, // Hex format (will be stored encrypted)
      base32, // Base32 format (for manual entry)
      qrCode: qrCodeDataUrl,
      email: session.user.email,
      instructions: {
        step1: 'Scan the QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, Authy)',
        step2: 'Or manually enter the secret key if you cannot scan',
        step3: 'Enter the 6-digit code from your app to verify and enable 2FA'
      }
    });
  } catch (error: any) {
    console.error('❌ [Admin2FA] Setup error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}

