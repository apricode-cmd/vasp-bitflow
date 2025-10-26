/**
 * Delete User Wallet API Route
 * 
 * DELETE /api/wallets/[id] - Delete specific wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const walletId = params.id;

    // Check if wallet exists and belongs to user
    const wallet = await prisma.userWallet.findUnique({
      where: { id: walletId }
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    if (wallet.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete wallet
    await prisma.userWallet.delete({
      where: { id: walletId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


