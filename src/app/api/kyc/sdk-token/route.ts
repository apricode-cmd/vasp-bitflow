/**
 * GET /api/kyc/sdk-token
 * 
 * Issue Sumsub WebSDK access token for authenticated user
 * This token is used by frontend to initialize Sumsub WebSDK
 * 
 * Security: Server-side only, requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getClientSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🎫 SDK token request from user:', session.user.id);

    // 2. Get active KYC provider
    const provider = await integrationFactory.getKycProvider();

    // 3. Check if Sumsub is active
    if (provider.providerId !== 'sumsub') {
      console.error('❌ Sumsub is not the active KYC provider');
      return NextResponse.json(
        { 
          error: 'Sumsub is not the active KYC provider',
          activeProvider: provider.providerId
        },
        { status: 400 }
      );
    }

    // 4. Get or create KYC session
    let kycSession = await prisma.kycSession.findUnique({
      where: { userId: session.user.id }
    });

    if (!kycSession) {
      console.log('ℹ️ KYC session not found, creating new session');
      
      // Get user profile
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { profile: true }
      });

      if (!user || !user.profile) {
        return NextResponse.json(
          { error: 'User profile not found. Please complete your profile first.' },
          { status: 404 }
        );
      }

      // Create applicant in Sumsub (no separate verification needed for Sumsub)
      const applicant = await provider.createApplicant({
        email: user.email,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        dateOfBirth: user.profile.dateOfBirth?.toISOString().split('T')[0] || '',
        nationality: user.profile.nationality || user.profile.country,
        residenceCountry: user.profile.country,
        phone: user.profile.phoneNumber || '',
        externalId: user.id
      });

      // Save KYC session (for Sumsub, applicantId is enough)
      kycSession = await prisma.kycSession.create({
        data: {
          userId: user.id,
          kycProviderId: provider.providerId,
          applicantId: applicant.applicantId,
          status: 'PENDING',
          metadata: {
            applicant: applicant.metadata
          } as any
        }
      });

      console.log('✅ KYC session created:', kycSession.id);
    }

    // 5. Create access token (Sumsub-specific method)
    const sumsubAdapter = provider as any; // Cast to access Sumsub-specific method
    
    if (!sumsubAdapter.createAccessToken) {
      return NextResponse.json(
        { error: 'Provider does not support WebSDK access tokens' },
        { status: 500 }
      );
    }

    const tokenData = await sumsubAdapter.createAccessToken(session.user.id);

    console.log('✅ SDK token created successfully');

    return NextResponse.json({
      success: true,
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
      applicantId: kycSession.applicantId
    });
  } catch (error: any) {
    console.error('❌ SDK token error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create SDK token',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

