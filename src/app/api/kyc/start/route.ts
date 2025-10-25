/**
 * Start KYC Verification API Route
 * 
 * POST /api/kyc/start - Initiates KYC verification for the current user
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { kycaidService } from '@/lib/services/kycaid';

export async function POST(): Promise<NextResponse> {
  // Check authentication
  const { error, session } = await requireAuth();
  if (error) return error;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Check if KYC session already exists
    const existingKyc = await prisma.kycSession.findUnique({
      where: { userId }
    });

    if (existingKyc) {
      // If already approved, don't allow restart
      if (existingKyc.status === 'APPROVED') {
        return NextResponse.json(
          { error: 'KYC already approved' },
          { status: 400 }
        );
      }

      // If pending or rejected, return existing verification
      return NextResponse.json({
        verificationId: existingKyc.kycaidVerificationId,
        status: existingKyc.status,
        message: 'KYC session already exists'
      });
    }

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user || !user.profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Create verification with KYCAID
    const verification = await kycaidService.createVerification(userId, {
      email: user.email,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      country: user.profile.country
    });

    // Create KYC session in database
    const kycSession = await prisma.kycSession.create({
      data: {
        userId,
        kycaidVerificationId: verification.verificationId,
        status: 'PENDING',
        submittedAt: new Date()
      }
    });

    return NextResponse.json({
      verificationId: kycSession.kycaidVerificationId,
      formUrl: verification.formUrl,
      status: kycSession.status
    });
  } catch (error) {
    console.error('KYC start error:', error);
    return NextResponse.json(
      { error: 'Failed to start KYC verification' },
      { status: 500 }
    );
  }
}

