/**
 * Admin KYC Rejection API
 * 
 * POST /api/admin/kyc/[id]/reject - Reject KYC session
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { rejectKycSchema } from '@/lib/validations/kyc-admin';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;
    const body = await request.json();

    // Validate
    const validated = rejectKycSchema.parse(body);

    // Get admin ID
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Get KYC session
    const kycSession = await prisma.kycSession.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    if (!kycSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC session not found'
        },
        { status: 404 }
      );
    }

    // Update KYC session
    const updatedSession = await prisma.kycSession.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        reviewNotes: validated.reviewNotes,
        rejectionReason: validated.rejectionReason
      }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.KYC_REJECTED,
      AUDIT_ENTITIES.KYC_SESSION,
      id,
      { status: kycSession.status },
      { status: 'REJECTED' },
      {
        userId: kycSession.userId,
        userEmail: kycSession.user.email,
        rejectionReason: validated.rejectionReason,
        reviewNotes: validated.reviewNotes
      }
    );

    // TODO: Send email notification to user

    return NextResponse.json({
      success: true,
      data: updatedSession
    });
  } catch (error) {
    console.error('Reject KYC error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reject KYC'
      },
      { status: 500 }
    );
  }
}

