/**
 * PayIn API - /api/admin/pay-in/[id]
 * GET - Get specific payment details
 * PATCH - Update payment status (verify, reconcile, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const updatePayInSchema = z.object({
  status: z.enum(['PENDING', 'RECEIVED', 'VERIFIED', 'PARTIAL', 'MISMATCH', 'RECONCILED', 'FAILED', 'REFUNDED', 'EXPIRED']).optional(),
  receivedAmount: z.number().optional(),
  senderName: z.string().optional(),
  senderAccount: z.string().optional(),
  senderBank: z.string().optional(),
  reference: z.string().optional(),
  transactionId: z.string().optional(),
  verificationNotes: z.string().optional(),
  reconciledWith: z.string().optional(),
  paymentDate: z.string().datetime().optional(),
  receivedDate: z.string().datetime().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;

    const payIn = await prisma.payIn.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            },
            currency: true,
            fiatCurrency: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            profile: true
          }
        },
        fiatCurrency: true,
        paymentMethod: true,
        verifier: {
          select: {
            id: true,
            email: true
          }
        },
        reconciler: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    if (!payIn) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payIn
    });
  } catch (error) {
    console.error('Get PayIn details error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve payment details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = updatePayInSchema.parse(body);

    // Get existing payment
    const existing = await prisma.payIn.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (validated.status !== undefined) {
      updateData.status = validated.status;

      // Auto-set verification fields if status is VERIFIED
      if (validated.status === 'VERIFIED' && !existing.verifiedBy) {
        updateData.verifiedBy = adminId;
        updateData.verifiedAt = new Date();
      }

      // Auto-set reconciliation fields if status is RECONCILED
      if (validated.status === 'RECONCILED' && !existing.reconciledBy) {
        updateData.reconciledBy = adminId;
        updateData.reconciledAt = new Date();
      }
    }

    if (validated.receivedAmount !== undefined) {
      updateData.receivedAmount = validated.receivedAmount;
      // Check for amount mismatch
      updateData.amountMismatch = Math.abs(validated.receivedAmount - existing.expectedAmount) > 0.01;
    }

    if (validated.senderName) updateData.senderName = validated.senderName;
    if (validated.senderAccount) updateData.senderAccount = validated.senderAccount;
    if (validated.senderBank) updateData.senderBank = validated.senderBank;
    if (validated.reference) updateData.reference = validated.reference;
    if (validated.transactionId) updateData.transactionId = validated.transactionId;
    if (validated.verificationNotes) updateData.verificationNotes = validated.verificationNotes;
    if (validated.reconciledWith) updateData.reconciledWith = validated.reconciledWith;
    if (validated.paymentDate) updateData.paymentDate = new Date(validated.paymentDate);
    if (validated.receivedDate) updateData.receivedDate = new Date(validated.receivedDate);

    // Update payment
    const updated = await prisma.payIn.update({
      where: { id },
      data: updateData,
      include: {
        order: true,
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    // Log audit
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.ORDER_STATUS_CHANGED,
      AUDIT_ENTITIES.ORDER,
      updated.orderId,
      { payInStatus: existing.status },
      { payInStatus: updated.status }
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Payment updated successfully'
    });
  } catch (error) {
    console.error('Update PayIn error:', error);

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
      { success: false, error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

