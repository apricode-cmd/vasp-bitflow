/**
 * PayOut API - /api/admin/pay-out/[id]
 * GET - Get specific payment details
 * PATCH - Update payment status (process, confirm, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const updatePayOutSchema = z.object({
  status: z.enum(['PENDING', 'QUEUED', 'PROCESSING', 'SENT', 'CONFIRMING', 'CONFIRMED', 'FAILED', 'CANCELLED']).optional(),
  transactionHash: z.string().optional(),
  blockNumber: z.number().optional(),
  confirmations: z.number().optional(),
  networkFee: z.number().optional(),
  failureReason: z.string().optional(),
  processingNotes: z.string().optional(),
  fromWalletId: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
  sentAt: z.string().datetime().optional(),
  confirmedAt: z.string().datetime().optional()
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

    const payOut = await prisma.payOut.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: true
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
        cryptocurrency: true,
        network: true,
        userWallet: true,
        processor: {
          select: {
            id: true,
            email: true
          }
        },
        platformWallet: true
      }
    });

    if (!payOut) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Add explorer URL if transaction hash exists
    if (payOut.transactionHash && payOut.network.explorerUrl) {
      (payOut as any).explorerUrl = `${payOut.network.explorerUrl}/tx/${payOut.transactionHash}`;
    }

    return NextResponse.json({
      success: true,
      data: payOut
    });
  } catch (error) {
    console.error('Get PayOut details error:', error);
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
    const validated = updatePayOutSchema.parse(body);

    // Get existing payment
    const existing = await prisma.payOut.findUnique({
      where: { id },
      include: {
        network: true
      }
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

      // Auto-set processing fields if status is SENT or PROCESSING
      if ((validated.status === 'SENT' || validated.status === 'PROCESSING') && !existing.processedBy) {
        updateData.processedBy = adminId;
        updateData.processedAt = new Date();
      }

      // Auto-set sentAt if status is SENT
      if (validated.status === 'SENT' && !existing.sentAt) {
        updateData.sentAt = new Date();
      }

      // Auto-set confirmedAt if status is CONFIRMED
      if (validated.status === 'CONFIRMED' && !existing.confirmedAt) {
        updateData.confirmedAt = new Date();
      }
    }

    if (validated.transactionHash) {
      updateData.transactionHash = validated.transactionHash;
      // Generate explorer URL
      updateData.explorerUrl = `${existing.network.explorerUrl}/tx/${validated.transactionHash}`;
    }

    if (validated.blockNumber !== undefined) updateData.blockNumber = validated.blockNumber;
    if (validated.confirmations !== undefined) updateData.confirmations = validated.confirmations;
    if (validated.networkFee !== undefined) updateData.networkFee = validated.networkFee;
    if (validated.failureReason) updateData.failureReason = validated.failureReason;
    if (validated.processingNotes) updateData.processingNotes = validated.processingNotes;
    if (validated.fromWalletId) updateData.fromWalletId = validated.fromWalletId;
    if (validated.scheduledFor) updateData.scheduledFor = new Date(validated.scheduledFor);
    if (validated.sentAt) updateData.sentAt = new Date(validated.sentAt);
    if (validated.confirmedAt) updateData.confirmedAt = new Date(validated.confirmedAt);

    // Update payment
    const updated = await prisma.payOut.update({
      where: { id },
      data: updateData,
      include: {
        order: true,
        user: {
          select: {
            id: true,
            email: true
          }
        },
        network: true
      }
    });

    // Log audit
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.ORDER_STATUS_CHANGED,
      AUDIT_ENTITIES.ORDER,
      updated.orderId,
      { payOutStatus: existing.status },
      { payOutStatus: updated.status }
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Payment updated successfully'
    });
  } catch (error) {
    console.error('Update PayOut error:', error);

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

