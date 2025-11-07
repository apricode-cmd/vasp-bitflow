/**
 * POST /api/2fa/setup
 * 
 * Initialize TOTP setup (generate secret and QR code)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { 
  generateTotpSecret, 
  generateQrCode 
} from '@/lib/services/totp.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getClientSession();
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate TOTP secret
    const { secret, base32 } = generateTotpSecret();
    
    // Generate QR code
    const qrCodeDataUrl = await generateQrCode(secret, session.user.email);
    
    // Return secret (hex) and QR code
    // Secret will be encrypted when user verifies and enables 2FA
    return NextResponse.json({
      success: true,
      secret, // Hex format (will be stored encrypted)
      base32, // Base32 format (for manual entry)
      qrCode: qrCodeDataUrl,
      email: session.user.email
    });
  } catch (error: any) {
    console.error('[2FA Setup] Error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}

