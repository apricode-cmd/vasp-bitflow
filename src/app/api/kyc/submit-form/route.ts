/**
 * KYC Form Submission API
 * 
 * POST /api/kyc/submit-form - Submit KYC form data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getCurrentUserId } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { kycFormService } from '@/lib/services/kyc-form.service';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const sessionOrError = await requireAuth();
    if (sessionOrError.error) {
      return sessionOrError.error;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate form data
    const validation = await kycFormService.validateFormData(body);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Form validation failed',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // Get or create KYC session
    let kycSession = await prisma.kycSession.findUnique({
      where: { userId }
    });

    if (!kycSession) {
      kycSession = await prisma.kycSession.create({
        data: {
          userId,
          status: 'PENDING'
        }
      });
    }

    // Check if already submitted
    if (kycSession.status === 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC already approved'
        },
        { status: 400 }
      );
    }

    // Save form data
    await kycFormService.saveFormData(kycSession.id, body);

    // Update KYC session
    const updatedSession = await prisma.kycSession.update({
      where: { id: kycSession.id },
      data: {
        submittedAt: new Date(),
        status: 'PENDING',
        attempts: { increment: 1 },
        lastAttemptAt: new Date()
      }
    });

    // Log user action
    await auditService.logUserAction(
      userId,
      AUDIT_ACTIONS.KYC_SUBMITTED,
      AUDIT_ENTITIES.KYC_SESSION,
      kycSession.id,
      {
        attempt: updatedSession.attempts
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedSession
    });
  } catch (error) {
    console.error('Submit KYC form error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit KYC form'
      },
      { status: 500 }
    );
  }
}

