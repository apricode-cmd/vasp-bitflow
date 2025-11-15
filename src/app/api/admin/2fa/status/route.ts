// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin 2FA Status API
 * 
 * GET /api/admin/2fa/status
 * 
 * Get current 2FA status for admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/auth-admin';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getAdminSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin session required' },
        { status: 401 }
      );
    }

    console.log('🔍 [Admin2FA] Status check for:', session.user.id);

    // Get 2FA status
    const twoFactorAuth = await prisma.adminTwoFactorAuth.findUnique({
      where: { adminId: session.user.id },
      select: {
        totpEnabled: true,
        totpVerifiedAt: true,
        webAuthnEnabled: true,
        webAuthnRequired: true,
        preferredMethod: true,
        backupCodes: true
      }
    });

    // Get WebAuthn credentials count
    const webAuthnCredsCount = await prisma.webAuthnCredential.count({
      where: { adminId: session.user.id }
    });

    // Calculate remaining backup codes
    let remainingBackupCodes = 0;
    if (twoFactorAuth?.backupCodes && Array.isArray(twoFactorAuth.backupCodes)) {
      remainingBackupCodes = twoFactorAuth.backupCodes.length;
    }

    const status = {
      success: true,
      totpEnabled: twoFactorAuth?.totpEnabled || false,
      totpVerifiedAt: twoFactorAuth?.totpVerifiedAt || null,
      webAuthnEnabled: twoFactorAuth?.webAuthnEnabled || false,
      webAuthnRequired: twoFactorAuth?.webAuthnRequired || false,
      webAuthnDevices: webAuthnCredsCount,
      preferredMethod: twoFactorAuth?.preferredMethod || 'TOTP',
      remainingBackupCodes,
      hasAnyMethod: (twoFactorAuth?.totpEnabled || false) || webAuthnCredsCount > 0
    };

    console.log('✅ [Admin2FA] Status:', {
      adminId: session.user.id,
      totpEnabled: status.totpEnabled,
      webAuthnDevices: status.webAuthnDevices,
      hasAnyMethod: status.hasAnyMethod
    });

    return NextResponse.json(status);
  } catch (error: any) {
    console.error('❌ [Admin2FA] Status error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to get 2FA status' },
      { status: 500 }
    );
  }
}

