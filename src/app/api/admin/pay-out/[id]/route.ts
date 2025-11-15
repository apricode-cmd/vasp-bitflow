// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * PayOut Details API
 * GET /api/admin/pay-out/[id] - Get single PayOut
 * PATCH /api/admin/pay-out/[id] - Update PayOut status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { CacheService } from '@/lib/services/cache.service';
import { z } from 'zod';
import { syncOrderOnPayOutUpdate, type PayOutStatus } from '@/lib/services/order-status-sync.service';

const updatePayOutSchema = z.object({
  status: z.enum(['PENDING', 'QUEUED', 'PROCESSING', 'SENT', 'CONFIRMING', 'CONFIRMED', 'FAILED', 'CANCELLED']).optional(),
  transactionHash: z.string().optional(),
  networkFee: z.number().optional(),
  destinationAddress: z.string().optional(),
  recipientName: z.string().optional(),
  processingNotes: z.string().optional(),
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

    // Try cache first
    const cacheKey = `pay-out:${id}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`📦 [Redis] Cache HIT: ${cacheKey}`);
        return NextResponse.json(JSON.parse(cached));
      }
    } catch (cacheError) {
      console.error('Redis get error:', cacheError);
    }

    console.log(`📦 [Redis] Cache MISS: ${cacheKey}`);

    const payOut = await prisma.payOut.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            paymentReference: true,
            cryptoAmount: true,
            status: true,
            fiatAmount: true,
            rate: true,
            feePercent: true,
            feeAmount: true,
            totalFiat: true,
            walletAddress: true,
            blockchainCode: true,
            currencyCode: true,
            fiatCurrencyCode: true,
            createdAt: true,
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
                country: true
              }
            }
          }
        },
        cryptocurrency: {
          select: {
            code: true,
            name: true,
            symbol: true,
            decimals: true
          }
        },
        fiatCurrency: {
          select: {
            code: true,
            name: true,
            symbol: true
          }
        },
        network: {
          select: {
            code: true,
            name: true,
            explorerUrl: true,
            confirmations: true
          }
        },
        paymentMethod: {
          select: {
            code: true,
            name: true
          }
        },
        processor: {
          select: {
            id: true,
            email: true
          }
        },
        platformWallet: {
          select: {
            id: true,
            label: true,
            address: true
          }
        }
      }
    });

    if (!payOut) {
      return NextResponse.json(
        { success: false, error: 'PayOut not found' },
        { status: 404 }
      );
    }

    const result = {
      success: true,
      data: payOut
    };

    // Cache for 5 minutes
    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
    } catch (cacheError) {
      console.error('Redis set error:', cacheError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get PayOut error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PayOut' },
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
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const session = authResult.session;
    const { id } = params;

    const body = await request.json();
    console.log(`\n🔵 [PayOut PATCH] Request received for PayOut ID: ${id}`);
    console.log(`   Request body:`, body);
    
    const validated = updatePayOutSchema.parse(body);
    console.log(`   Validated data:`, validated);

    // Check if PayOut exists
    const existingPayOut = await prisma.payOut.findUnique({
      where: { id },
      select: { 
        id: true, 
        status: true,
        orderId: true,
        userId: true,
      },
    });

    if (!existingPayOut) {
      return NextResponse.json(
        { success: false, error: 'PayOut not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    
    if (validated.status !== undefined) {
      updateData.status = validated.status;
      
      // Auto-set timestamps based on status changes
      if (validated.status === 'SENT' && existingPayOut.status !== 'SENT') {
        updateData.sentAt = new Date();
      } else if (validated.status === 'CONFIRMED' && existingPayOut.status !== 'CONFIRMED') {
        updateData.confirmedAt = new Date();
      } else if (validated.status === 'PROCESSING' && existingPayOut.status !== 'PROCESSING') {
        updateData.processedAt = new Date();
        // Note: processedBy is a User ID (client), not Admin ID
        // Don't set processor relation here
      }
      // Note: No failedAt field in PayOut schema, only sentAt and confirmedAt
    }

    if (validated.transactionHash !== undefined) {
      updateData.transactionHash = validated.transactionHash;
    }
    if (validated.networkFee !== undefined) {
      updateData.networkFee = validated.networkFee;
    }
    if (validated.destinationAddress !== undefined) {
      updateData.destinationAddress = validated.destinationAddress;
    }
    if (validated.recipientName !== undefined) {
      updateData.recipientName = validated.recipientName;
    }
    if (validated.processingNotes !== undefined) {
      updateData.processingNotes = validated.processingNotes;
    }

    // Update PayOut
    const updatedPayOut = await prisma.payOut.update({
      where: { id },
      data: updateData,
    });

    // Sync Order status if PayOut status changed
    console.log(`\n🔍 [PayOut API] Checking if sync needed:`);
    console.log(`   validated.status: ${validated.status}`);
    console.log(`   existingPayOut.status: ${existingPayOut.status}`);
    console.log(`   existingPayOut.orderId: ${existingPayOut.orderId}`);
    
    if (validated.status && existingPayOut.status !== validated.status) {
      console.log(`   ✅ Status changed, calling syncOrderOnPayOutUpdate...`);
      try {
        await syncOrderOnPayOutUpdate(
          existingPayOut.orderId,
          existingPayOut.status as PayOutStatus,
          validated.status as PayOutStatus
        );
      } catch (syncError) {
        console.error('❌ [PayOut API] Order status sync error:', syncError);
        // Continue even if sync fails
      }
    } else {
      console.log(`   ⏭️  No sync needed (status unchanged or not provided)\n`);
    }

    // Invalidate cache
    await CacheService.clearAdminStats();
    await CacheService.deletePattern('admin:pay-out:*');
    await CacheService.deletePattern('admin:orders:*'); // Orders depend on PayOut

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        action: 'PAYOUT_UPDATED',
        entity: 'PAYOUT',
        entityId: id,
        changes: validated,
        metadata: {
          orderId: existingPayOut.orderId,
          userId: existingPayOut.userId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedPayOut,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update PayOut error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update PayOut' },
      { status: 500 }
    );
  }
}
