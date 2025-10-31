/**
 * Passkey Authentication Verification API
 * 
 * Verifies passkey and creates One-Time Authentication Token (OTAT)
 * for secure session establishment
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPasskeyAuthentication } from '@/lib/services/passkey.service';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { response, email } = await request.json();

    console.log('🔐 Verifying passkey for:', email);

    const result = await verifyPasskeyAuthentication(response, email);

    if (!result.verified || !result.admin) {
      console.error('❌ Passkey verification failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Verification failed' },
        { status: 401 }
      );
    }

    console.log('✅ Passkey verified for admin:', result.admin.email);

    // Create One-Time Authentication Token (OTAT)
    // This token is used to establish NextAuth session securely
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds TTL

    await prisma.oneTimeAuthToken.create({
      data: {
        token,
        adminId: result.admin.id,
        expiresAt,
      },
    });

    console.log('✅ OTAT created, expires in 60 seconds');

    // Return OTAT to client
    // Client will use this to call NextAuth signIn
    return NextResponse.json({
      success: true,
      verified: true,
      token, // One-time token
      admin: {
        email: result.admin.email,
      },
    });
  } catch (error) {
    console.error('❌ Passkey verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify authentication' },
      { status: 500 }
    );
  }
}

