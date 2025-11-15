// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Admin Trading Pair Management API
 * 
 * GET /api/admin/trading-pairs/[id] - Get trading pair details
 * PATCH /api/admin/trading-pairs/[id] - Update trading pair
 * DELETE /api/admin/trading-pairs/[id] - Deactivate trading pair
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { updateTradingPairSchema } from '@/lib/validations/trading-pair';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;

    // Get trading pair
    const pair = await prisma.tradingPair.findUnique({
      where: { id },
      include: {
        crypto: true,
        fiat: true
      }
    });

    if (!pair) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trading pair not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pair
    });
  } catch (error) {
    console.error('Get trading pair error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve trading pair'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;
    const body = await request.json();

    // Validate
    const validated = updateTradingPairSchema.parse(body);

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

    // Get current pair
    const currentPair = await prisma.tradingPair.findUnique({
      where: { id }
    });

    if (!currentPair) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trading pair not found'
        },
        { status: 404 }
      );
    }

    // Update trading pair
    const updatedPair = await prisma.tradingPair.update({
      where: { id },
      data: validated,
      include: {
        crypto: true,
        fiat: true
      }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.TRADING_PAIR_UPDATED,
      AUDIT_ENTITIES.TRADING_PAIR,
      id,
      {
        minCryptoAmount: currentPair.minCryptoAmount,
        maxCryptoAmount: currentPair.maxCryptoAmount,
        feePercent: currentPair.feePercent,
        isActive: currentPair.isActive
      },
      {
        minCryptoAmount: updatedPair.minCryptoAmount,
        maxCryptoAmount: updatedPair.maxCryptoAmount,
        feePercent: updatedPair.feePercent,
        isActive: updatedPair.isActive
      },
      {
        pair: `${updatedPair.cryptoCode}/${updatedPair.fiatCode}`
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedPair
    });
  } catch (error) {
    console.error('Update trading pair error:', error);

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
        error: 'Failed to update trading pair'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;

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

    // Deactivate instead of deleting
    const pair = await prisma.tradingPair.update({
      where: { id },
      data: { isActive: false }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.TRADING_PAIR_UPDATED,
      AUDIT_ENTITIES.TRADING_PAIR,
      id,
      { isActive: true },
      { isActive: false },
      {
        pair: `${pair.cryptoCode}/${pair.fiatCode}`,
        action: 'deactivated'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Trading pair deactivated'
    });
  } catch (error) {
    console.error('Delete trading pair error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete trading pair'
      },
      { status: 500 }
    );
  }
}

