// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

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

    // Try to get session (for adding additional passkeys) - but don't require it for first-time setup
    const sessionResult = await requireAdminAuth();
    const session = sessionResult instanceof NextResponse ? null : sessionResult;
    
    let adminId: string;

    if (session?.user) {
      // Existing logged-in admin adding another passkey
      adminId = session.user.id;
      console.log('✅ Using session admin:', adminId);
    } else if (email) {
      // First-time setup - no session yet (INVITED admin)
      const admin = await prisma.admin.findFirst({
        where: { 
          OR: [
            { workEmail: email },
            { email: email }
          ],
          status: 'INVITED', // Only allow INVITED admins for first-time setup
        },
        select: { 
          id: true, 
          status: true,
          setupToken: true,
          setupTokenExpiry: true,
        }
      });

      if (!admin) {
        console.error('❌ Admin not found or not invited:', email);
        return NextResponse.json(
          { error: 'Admin not found or not invited' },
          { status: 404 }
        );
      }

      // Check if setup token is still valid
      if (!admin.setupToken || (admin.setupTokenExpiry && admin.setupTokenExpiry < new Date())) {
        console.error('❌ Setup token expired or invalid:', email);
        return NextResponse.json(
          { error: 'Setup token expired or invalid' },
          { status: 403 }
        );
      }

      adminId = admin.id;
      console.log('✅ Found INVITED admin by email:', adminId, 'status:', admin.status);
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

