/**
 * Admin API: Generate White-Label KYC Link for User
 * POST /api/admin/kyc/[id]/white-label-link
 * 
 * Generates a branded verification link that can be shared with the user
 * Works without user authentication - perfect for email/SMS/QR
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/auth-admin';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // 1. Check admin authentication
    const session = await getAdminSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = params.id;
    console.log('🔗 [ADMIN] Generating white-label link for user:', userId);

    // 2. Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 3. Check if KYC session exists
    let kycSession = await prisma.kycSession.findUnique({
      where: { userId }
    });

    // If no session exists, return error (admin should start KYC first)
    if (!kycSession) {
      return NextResponse.json(
        { 
          error: 'No KYC session found for this user. Please start KYC verification first.',
          code: 'NO_KYC_SESSION'
        },
        { status: 404 }
      );
    }

    console.log('✅ KYC Session found:', kycSession.id);

    // 4. Generate JWT token
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('❌ NEXTAUTH_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { expiresInHours = 72 } = await request.json().catch(() => ({ expiresInHours: 72 }));
    const expirationSeconds = expiresInHours * 3600;

    const whitelabelToken = jwt.sign(
      {
        userId,
        sessionId: kycSession.id,
        provider: kycSession.kycProviderId,
        exp: Math.floor(Date.now() / 1000) + expirationSeconds,
        iat: Math.floor(Date.now() / 1000),
      },
      secret
    );

    // 5. Generate white-label URL
    const appBaseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const whitelabelUrl = `${appBaseUrl}/kyc/verify/${whitelabelToken}`;

    console.log('✅ [ADMIN] White-label link generated:', {
      userId,
      sessionId: kycSession.id,
      expiresIn: `${expiresInHours}h`,
      urlLength: whitelabelUrl.length
    });

    // 6. Log admin action
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.user.id,
        action: 'KYC_WHITE_LABEL_LINK_GENERATED',
        resourceType: 'KYC_SESSION',
        resourceId: kycSession.id,
        metadata: {
          targetUserId: userId,
          expiresInHours,
          kycProvider: kycSession.kycProviderId
        }
      }
    });

    return NextResponse.json({
      success: true,
      url: whitelabelUrl,
      expiresInHours,
      expiresAt: new Date(Date.now() + expirationSeconds * 1000).toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: `${user.profile?.firstName} ${user.profile?.lastName}`.trim()
      },
      session: {
        id: kycSession.id,
        status: kycSession.status,
        provider: kycSession.kycProviderId
      }
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Error generating white-label link:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate white-label link',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

