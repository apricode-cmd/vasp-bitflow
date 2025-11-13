/**
 * Admin 2FA Verify API
 * 
 * POST /api/admin/2fa/verify
 * 
 * Verify TOTP code and enable 2FA for admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/auth-admin';
import { z } from 'zod';
import { verifyTotpCode } from '@/lib/services/totp.service';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/services/encryption.service';
import crypto from 'crypto';

const verifySchema = z.object({
  secret: z.string().min(1, 'Secret is required'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric')
});

/**
 * Generate backup codes for admin
 */
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getAdminSession();
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin session required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = verifySchema.parse(body);
    
    console.log('🔐 [Admin2FA] Verify request for:', session.user.email);
    
    // Verify TOTP code
    const isValid = verifyTotpCode(
      validated.secret,
      session.user.email,
      validated.code
    );
    
    if (!isValid) {
      console.error('❌ [Admin2FA] Invalid code for:', session.user.email);
      return NextResponse.json(
        { error: 'Invalid code. Please try again.' },
        { status: 400 }
      );
    }
    
    // Generate backup codes
    const backupCodes = generateBackupCodes();
    
    // Encrypt secret and backup codes
    const encryptedSecret = encrypt(validated.secret);
    const encryptedBackupCodes = backupCodes.map(code => encrypt(code));
    
    // Enable TOTP for admin
    await prisma.adminTwoFactorAuth.upsert({
      where: { adminId: session.user.id },
      create: {
        adminId: session.user.id,
        totpEnabled: true,
        totpSecret: encryptedSecret,
        totpVerifiedAt: new Date(),
        backupCodes: encryptedBackupCodes,
        preferredMethod: 'TOTP'
      },
      update: {
        totpEnabled: true,
        totpSecret: encryptedSecret,
        totpVerifiedAt: new Date(),
        backupCodes: encryptedBackupCodes,
        preferredMethod: 'TOTP'
      }
    });
    
    // Log audit
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.user.id,
        action: 'ADMIN_2FA_ENABLED',
        entity: 'AdminTwoFactorAuth',
        entityId: session.user.id,
        metadata: {
          method: 'TOTP',
          email: session.user.email
        }
      }
    });
    
    console.log('✅ [Admin2FA] TOTP enabled for admin:', session.user.id);
    
    return NextResponse.json({
      success: true,
      backupCodes, // Return unencrypted codes for admin to save
      message: '2FA enabled successfully. Please save your backup codes in a secure location.'
    });
  } catch (error: any) {
    console.error('❌ [Admin2FA] Verify error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to verify and enable 2FA' },
      { status: 500 }
    );
  }
}

