// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin Password Setup API
 * 
 * POST: Set password and generate TOTP secret for new admin
 * Only for INVITED admins during first-time setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth-utils';
import { generateTotpSecret, generateQrCode } from '@/lib/services/totp.service';
import crypto from 'crypto';
import { z } from 'zod';

const setupPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, password } = setupPasswordSchema.parse(body);

    console.log('🔐 [SetupPassword] Setting up password for:', email);

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
      console.error('❌ [SetupPassword] Admin not found or token invalid/expired');
      return NextResponse.json(
        { error: 'Invalid or expired setup link' },
        { status: 404 }
      );
    }

    // Check if already set up
    if (admin.password || admin.status === 'ACTIVE') {
      console.error('❌ [SetupPassword] Admin already setup');
      return NextResponse.json(
        { error: 'Admin account already set up' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate TOTP secret
    const { secret: totpSecret } = generateTotpSecret();
    const totpQrCode = await generateQrCode(totpSecret, email);

    // Store password and pending TOTP secret (not enabled yet)
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        authMethod: 'PASSWORD', // Will be updated to PASSWORD after TOTP verified
      }
    });

    // Create or update 2FA record with pending TOTP
    await prisma.adminTwoFactorAuth.upsert({
      where: { adminId: admin.id },
      create: {
        adminId: admin.id,
        totpSecret: totpSecret, // Store unencrypted for now, will encrypt on verification
        totpEnabled: false, // Not enabled until verified
      },
      update: {
        totpSecret: totpSecret,
        totpEnabled: false,
      }
    });

    console.log('✅ [SetupPassword] Password set, TOTP secret generated');

    return NextResponse.json({
      success: true,
      totpSecret,
      totpQrCode,
      message: 'Password set successfully. Please scan QR code.'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('❌ [SetupPassword] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to set password',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

