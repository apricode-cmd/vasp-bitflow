/**
 * Admin KYC Approval API
 * 
 * POST /api/admin/kyc/[id]/approve - Approve KYC session
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { approveKycSchema } from '@/lib/validations/kyc-admin';
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
    const validated = approveKycSchema.parse(body);

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

    if (kycSession.status === 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC already approved'
        },
        { status: 400 }
      );
    }

    // Calculate expiry (12 months from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 12);

    // Update KYC session
    const updatedSession = await prisma.kycSession.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        reviewNotes: validated.reviewNotes,
        completedAt: new Date(),
        expiresAt
      }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.KYC_APPROVED,
      AUDIT_ENTITIES.KYC_SESSION,
      id,
      { status: kycSession.status },
      { status: 'APPROVED' },
      {
        userId: kycSession.userId,
        userEmail: kycSession.user.email,
        reviewNotes: validated.reviewNotes
      }
    );

    // TODO: Send email notification to user

    return NextResponse.json({
      success: true,
      data: updatedSession
    });
  } catch (error) {
    console.error('Approve KYC error:', error);

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
        error: 'Failed to approve KYC'
      },
      { status: 500 }
    );
  }
}

