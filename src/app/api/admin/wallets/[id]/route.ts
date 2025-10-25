/**
 * Admin Platform Wallet Management API
 * 
 * GET /api/admin/wallets/[id] - Get wallet details
 * PATCH /api/admin/wallets/[id] - Update wallet
 * DELETE /api/admin/wallets/[id] - Deactivate wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { updatePlatformWalletSchema } from '@/lib/validations/wallet';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

export async function GET(
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

    // Get wallet
    const wallet = await prisma.platformWallet.findUnique({
      where: { id },
      include: {
        currency: true,
        blockchain: true
      }
    });

    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    console.error('Get platform wallet error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve wallet'
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
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;
    const body = await request.json();

    // Validate
    const validated = updatePlatformWalletSchema.parse(body);

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

    // Get current wallet
    const currentWallet = await prisma.platformWallet.findUnique({
      where: { id }
    });

    if (!currentWallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet not found'
        },
        { status: 404 }
      );
    }

    // Update wallet
    const updatedWallet = await prisma.platformWallet.update({
      where: { id },
      data: validated,
      include: {
        currency: true,
        blockchain: true
      }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.WALLET_ADDED,
      AUDIT_ENTITIES.PLATFORM_WALLET,
      id,
      {
        label: currentWallet.label,
        isActive: currentWallet.isActive,
        balance: currentWallet.balance
      },
      {
        label: updatedWallet.label,
        isActive: updatedWallet.isActive,
        balance: updatedWallet.balance
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedWallet
    });
  } catch (error) {
    console.error('Update platform wallet error:', error);

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
        error: 'Failed to update wallet'
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
    const sessionOrError = await requireRole('ADMIN');
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

    // Get wallet for logging
    const wallet = await prisma.platformWallet.findUnique({
      where: { id }
    });

    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet not found'
        },
        { status: 404 }
      );
    }

    // Deactivate wallet instead of deleting
    await prisma.platformWallet.update({
      where: { id },
      data: { isActive: false }
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.WALLET_REMOVED,
      AUDIT_ENTITIES.PLATFORM_WALLET,
      id,
      { isActive: true },
      { isActive: false },
      {
        currencyCode: wallet.currencyCode,
        address: wallet.address,
        action: 'deactivated'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Wallet deactivated'
    });
  } catch (error) {
    console.error('Delete platform wallet error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete wallet'
      },
      { status: 500 }
    );
  }
}

