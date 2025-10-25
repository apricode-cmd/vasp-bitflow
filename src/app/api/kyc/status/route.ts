/**
 * KYC Status API Route
 * 
 * GET /api/kyc/status - Returns current user's KYC verification status
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(): Promise<NextResponse> {
  // Check authentication
  const { error, session } = await requireAuth();
  if (error) return error;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Get KYC session
    const kycSession = await prisma.kycSession.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        rejectionReason: true,
        kycaidVerificationId: true
      }
    });

    if (!kycSession) {
      return NextResponse.json({
        status: 'NOT_STARTED',
        message: 'KYC verification not started'
      });
    }

    return NextResponse.json(kycSession);
  } catch (error) {
    console.error('KYC status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KYC status' },
      { status: 500 }
    );
  }
}

