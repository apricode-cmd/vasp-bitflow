/**
 * Check available authentication methods for admin
 * 
 * GET /api/admin/auth/check-methods?email=admin@example.com
 * 
 * Returns which authentication methods are available for the given admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isPasswordAuthEnabledForRole } from '@/lib/features/admin-auth-features';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [CheckAuthMethods] Checking for email:', email);

    // Find admin by email or workEmail
    const admin = await prisma.admin.findFirst({
      where: {
        OR: [
          { email: email },
          { workEmail: email }
        ],
        isActive: true,
        isSuspended: false
      },
      include: {
        twoFactorAuth: true,
        webAuthnCreds: {
          select: {
            id: true,
            credentialId: true,
            deviceName: true,
            createdAt: true
          }
        }
      }
    });

    if (!admin) {
      console.error('❌ [CheckAuthMethods] Admin not found or inactive:', email);
      return NextResponse.json(
        { error: 'Admin not found or account is inactive' },
        { status: 404 }
      );
    }

    console.log('✅ [CheckAuthMethods] Found admin:', {
      id: admin.id,
      role: admin.role,
      email: admin.email || admin.workEmail
    });

    // Check if admin has Passkey configured
    const hasPasskey = admin.webAuthnCreds && admin.webAuthnCreds.length > 0;
    
    // Check if admin has Password + TOTP configured
    const hasPasswordTotp = !!(admin.password && admin.twoFactorAuth?.totpEnabled);
    
    // Check if password auth is enabled for this role (feature flag)
    const passwordAuthAllowed = await isPasswordAuthEnabledForRole(admin.role);

    console.log('📊 [CheckAuthMethods] Authentication status:', {
      hasPasskey,
      passkeyCount: admin.webAuthnCreds?.length || 0,
      hasPassword: !!admin.password,
      hasTotpEnabled: admin.twoFactorAuth?.totpEnabled,
      hasPasswordTotp,
      passwordAuthAllowed,
      role: admin.role
    });

    return NextResponse.json({
      success: true,
      methods: {
        passkey: {
          available: hasPasskey,
          required: !passwordAuthAllowed || !hasPasswordTotp, // Required if password auth disabled or not configured
          recommended: true,
          deviceCount: admin.webAuthnCreds?.length || 0
        },
        passwordTotp: {
          available: hasPasswordTotp && passwordAuthAllowed,
          required: false,
          enabled: passwordAuthAllowed,
          configured: hasPasswordTotp
        }
      },
      admin: {
        email: admin.email || admin.workEmail,
        role: admin.role,
        firstName: admin.firstName,
        lastName: admin.lastName
      },
      recommendations: {
        setupRequired: !hasPasskey && !hasPasswordTotp,
        message: !hasPasskey && !hasPasswordTotp 
          ? 'Please complete setup by configuring at least one authentication method'
          : hasPasskey && hasPasswordTotp
          ? 'You can use either Passkey or Password + TOTP'
          : hasPasskey
          ? 'Passkey is configured (recommended)'
          : 'Password + TOTP is configured'
      }
    });
  } catch (error) {
    console.error('❌ [CheckAuthMethods] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check authentication methods',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

