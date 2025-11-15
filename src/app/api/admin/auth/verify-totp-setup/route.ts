// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin TOTP Verification API
 * 
 * POST: Verify TOTP code and complete admin setup
 * Final step for Password+TOTP authentication method
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTotpCode } from '@/lib/services/totp.service';
import { encrypt } from '@/lib/services/encryption.service';
import crypto from 'crypto';
import { z } from 'zod';

const verifyTotpSetupSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  totpCode: z.string().length(6, 'Code must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, totpCode } = verifyTotpSetupSchema.parse(body);

    console.log('🔐 [VerifyTOTPSetup] Verifying TOTP for:', email);

    // Hash the token for comparison
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find admin by email and token
    const admin = await prisma.admin.findFirst({
      where: {
        OR: [
          { email },
          { workEmail: email }
        ],
        status: 'INVITED',
        setupToken: hashedToken,
        setupTokenExpiry: {
          gt: new Date()
        }
      },
      include: {
        twoFactorAuth: true
      }
    });

    if (!admin) {
      console.error('❌ [VerifyTOTPSetup] Admin not found or token invalid/expired');
      return NextResponse.json(
        { error: 'Invalid or expired setup link' },
        { status: 404 }
      );
    }

    // Check if already fully set up
    if (admin.status === 'ACTIVE' && admin.twoFactorAuth?.totpEnabled) {
      console.error('❌ [VerifyTOTPSetup] Admin already fully setup');
      return NextResponse.json(
        { error: 'Admin account already set up' },
        { status: 400 }
      );
    }

    // Check if password was set
    if (!admin.password) {
      console.error('❌ [VerifyTOTPSetup] Password not set yet');
      return NextResponse.json(
        { error: 'Please set password first' },
        { status: 400 }
      );
    }

    // Check if TOTP secret exists
    if (!admin.twoFactorAuth?.totpSecret) {
      console.error('❌ [VerifyTOTPSetup] TOTP secret not found');
      return NextResponse.json(
        { error: 'TOTP setup not initiated' },
        { status: 400 }
      );
    }

    // Verify TOTP code (secret is still unencrypted at this point)
    const isValid = await verifyTotpCode(
      admin.twoFactorAuth.totpSecret,
      email,
      totpCode
    );

    if (!isValid) {
      console.error('❌ [VerifyTOTPSetup] Invalid TOTP code');
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Encrypt TOTP secret for storage
    const encryptedSecret = encrypt(admin.twoFactorAuth.totpSecret);

    // Generate backup codes (10 codes) - same format as admin 2FA verify
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
    }
    const encryptedBackupCodes = backupCodes.map(code => encrypt(code));

    // Update admin status and enable TOTP
    await prisma.$transaction([
      // Update admin status to ACTIVE
      prisma.admin.update({
        where: { id: admin.id },
        data: {
          status: 'ACTIVE',
          isActive: true, // ✅ Activate admin
          authMethod: 'PASSWORD', // Password + TOTP method
          setupToken: null, // Clear setup token
          setupTokenExpiry: null,
          lastLogin: new Date(),
        }
      }),

      // Enable TOTP and store encrypted secret
      prisma.adminTwoFactorAuth.update({
        where: { adminId: admin.id },
        data: {
          totpSecret: encryptedSecret,
          totpEnabled: true,
          totpVerifiedAt: new Date(),
          backupCodes: encryptedBackupCodes, // Array of encrypted codes
          preferredMethod: 'TOTP',
        }
      })
    ]);

    console.log('✅ [VerifyTOTPSetup] TOTP verified, admin activated');

    // Log audit
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: email,
        adminRole: admin.role,
        action: 'ADMIN_2FA_ENABLED',
        entityType: 'AdminTwoFactorAuth',
        entityId: admin.id,
        context: {
          method: 'TOTP',
          email: email,
          setupType: 'first-time'
        },
        severity: 'INFO',
      }
    });

    return NextResponse.json({
      success: true,
      backupCodes, // Show once, user must save them
      message: 'TOTP verified successfully. Save your backup codes!'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('❌ [VerifyTOTPSetup] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to verify TOTP',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

