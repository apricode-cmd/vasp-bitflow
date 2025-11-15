/**
 * PayIn Details API
 * GET /api/admin/pay-in/[id] - Get single PayIn
 * PATCH /api/admin/pay-in/[id] - Update PayIn status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/services/cache.service';
import { z } from 'zod';
import { syncOrderOnPayInUpdate, type PayInStatus } from '@/lib/services/order-status-sync.service';

const updatePayInSchema = z.object({
  status: z.enum(['PENDING', 'RECEIVED', 'VERIFIED', 'PARTIAL', 'MISMATCH', 'RECONCILED', 'FAILED', 'REFUNDED', 'EXPIRED']),
  receivedAmount: z.number().optional(),
  verificationNotes: z.string().optional(),
  senderName: z.string().optional(),
  transactionId: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = params;

    const payIn = await prisma.payIn.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            paymentReference: true,
            cryptoAmount: true,
            currencyCode: true,
            status: true,
            fiatAmount: true,
            rate: true,
            feePercent: true,
            feeAmount: true,
            totalFiat: true,
            paymentProofs: {
              select: {
                id: true,
                fileUrl: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                uploadedAt: true,
                user: {
                  select: {
                    email: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
                country: true,
              }
            }
          }
        },
        fiatCurrency: true,
        cryptocurrency: true,
        network: true,
        paymentMethod: {
          include: {
            bankAccount: true,
            paymentAccount: true,
          }
        },
        verifier: {
          select: {
            id: true,
            email: true,
          }
        },
        reconciler: {
          select: {
            id: true,
            email: true,
          }
        },
        approver: {
          select: {
            id: true,
            email: true,
          }
        },
        initiator: {
          select: {
            id: true,
            email: true,
          }
        },
      }
    });

    if (!payIn) {
      return NextResponse.json(
        { success: false, error: 'PayIn not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payIn
    });
  } catch (error) {
    console.error('Get PayIn error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PayIn' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = params;
    const body = await request.json();
    const validated = updatePayInSchema.parse(body);

    // Get current session for verifiedBy
    const session = sessionOrError;
    const userId = session.user?.id;

    // Get current PayIn to track status change
    const currentPayIn = await prisma.payIn.findUnique({
      where: { id },
      select: { status: true, orderId: true }
    });

    if (!currentPayIn) {
      return NextResponse.json(
        { success: false, error: 'PayIn not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {
      status: validated.status,
    };

    // Add receivedAmount if provided
    if (validated.receivedAmount !== undefined) {
      updateData.receivedAmount = validated.receivedAmount;
      
      // Check for amount mismatch
      const payIn = await prisma.payIn.findUnique({
        where: { id },
        select: { expectedAmount: true }
      });
      
      if (payIn) {
        updateData.amountMismatch = Math.abs(validated.receivedAmount - payIn.expectedAmount) > 0.01;
      }
    }

    // Add verification info if status is VERIFIED
    if (validated.status === 'VERIFIED' && userId) {
      updateData.verifiedBy = userId;
      updateData.verifiedAt = new Date();
    }

    // Add reconciliation info if status is RECONCILED
    if (validated.status === 'RECONCILED' && userId) {
      updateData.reconciledBy = userId;
      updateData.reconciledAt = new Date();
    }

    // Add verification notes if provided
    if (validated.verificationNotes) {
      updateData.verificationNotes = validated.verificationNotes;
    }

    // Add sender info if provided
    if (validated.senderName) {
      updateData.senderName = validated.senderName;
    }

    if (validated.transactionId) {
      updateData.transactionId = validated.transactionId;
    }

    // Update PayIn
    const updatedPayIn = await prisma.payIn.update({
      where: { id },
      data: updateData,
      include: {
        order: {
          select: {
            id: true,
            paymentReference: true,
          }
        },
        user: {
          select: {
            id: true,
            email: true,
          }
        },
        fiatCurrency: true,
        cryptocurrency: true,
        network: true,
        paymentMethod: true,
      }
    });

    // Sync Order status if PayIn status changed
    if (currentPayIn.status !== validated.status) {
      try {
        await syncOrderOnPayInUpdate(
          currentPayIn.orderId,
          currentPayIn.status as PayInStatus,
          validated.status as PayInStatus
        );
      } catch (syncError) {
        console.error('Order status sync error:', syncError);
        // Continue even if sync fails
      }
    }

    // Invalidate cache
    try {
      // Delete all pay-in list cache keys (they have patterns like pay-in-list:*)
      const keys = await redis.keys('pay-in-list:*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`📦 [Redis] Invalidated ${keys.length} pay-in cache keys`);
      }
      
      // Also invalidate stats cache
      await redis.del('payin-stats');
      console.log(`📦 [Redis] Invalidated payin-stats cache`);
    } catch (cacheError) {
      console.error('Redis cache invalidation error:', cacheError);
    }

    return NextResponse.json({
      success: true,
      data: updatedPayIn,
      message: `PayIn status updated to ${validated.status}`
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
      {
        success: false,
        error: 'Failed to update PayIn'
      },
      { status: 500 }
    );
  }
}
