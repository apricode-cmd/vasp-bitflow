/**
 * Passkey Registration Verification API
 * 
 * Verifies and saves WebAuthn credential
 * Works both for first-time setup (no session) and adding additional passkeys (with session)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { PasskeyService } from '@/lib/services/passkey.service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { response, deviceName, email } = body;

    console.log('🔐 Passkey verify request:', {
      email,
      deviceName,
      hasResponse: !!response,
      responseKeys: response ? Object.keys(response) : [],
    });

    // Try to get session (for adding additional passkeys)
    const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;
    
    let adminId: string;

    if (session?.user) {
      // Existing logged-in admin adding another passkey
      adminId = session.user.id;
      console.log('✅ Using session admin:', adminId);
    } else if (email) {
      // First-time setup - no session yet
      const admin = await prisma.admin.findUnique({
        where: { email },
        select: { 
          id: true, 
          isActive: true,
          status: true,
          setupToken: true 
        }
      });

      if (!admin) {
        console.error('❌ Admin not found:', email);
        return NextResponse.json(
          { error: 'Admin not found' },
          { status: 404 }
        );
      }

      // Allow SUSPENDED admins with setupToken (invite flow)
      // Block TERMINATED admins
      if (admin.status === 'TERMINATED') {
        console.error('❌ Admin is terminated:', email);
        return NextResponse.json(
          { error: 'Admin account is terminated' },
          { status: 403 }
        );
      }

      // For first-time setup, admin can be SUSPENDED with setupToken
      if (!admin.isActive && !admin.setupToken) {
        console.error('❌ Admin is inactive and has no setup token:', email);
        return NextResponse.json(
          { error: 'Admin account is inactive' },
          { status: 403 }
        );
      }

      adminId = admin.id;
      console.log('✅ Found admin by email:', adminId, 'status:', admin.status);
    } else {
      console.error('❌ No email and no session');
      return NextResponse.json(
        { error: 'Email required for first-time setup' },
        { status: 400 }
      );
    }

    console.log('🔍 Calling PasskeyService.verifyPasskeyRegistration...');
    const result = await PasskeyService.verifyPasskeyRegistration(
      adminId,
      response,
      deviceName
    );

    console.log('📊 Verification result:', {
      verified: result.verified,
      error: result.error,
      credentialId: result.credentialId,
    });

    if (!result.verified) {
      return NextResponse.json(
        { error: result.error || 'Verification failed' },
        { status: 400 }
      );
    }

    // Clear setup token and ACTIVATE admin after successful first-time registration
    if (!session?.user && email) {
      await prisma.admin.update({
        where: { id: adminId },
        data: {
          setupToken: null,
          setupTokenExpiry: null,
          status: 'ACTIVE', // ✅ Activate admin after successful Passkey setup
          isActive: true,
        }
      });
      console.log('✅ Admin activated after Passkey setup:', email);
      
      // Log MFA Event
      await prisma.mfaEvent.create({
        data: {
          actorId: adminId,
          actorType: 'ADMIN',
          actionType: 'REGISTER',
          method: 'WEBAUTHN',
          result: 'SUCCESS',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          credentialIdHash: result.credentialId ? 
            require('crypto').createHash('sha256').update(result.credentialId).digest('hex') : 
            undefined,
        }
      });
    }

    return NextResponse.json({
      success: true,
      credentialId: result.credentialId,
    });
  } catch (error) {
    console.error('❌ Passkey registration verify error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify registration' },
      { status: 500 }
    );
  }
}

