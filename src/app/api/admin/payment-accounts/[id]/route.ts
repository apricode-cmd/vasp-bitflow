// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Payment Account by ID API
 * GET: Get single payment account
 * PUT: Update payment account
 * DELETE: Delete payment account
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { auditService } from '@/lib/services/audit.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminRole('ADMIN');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const account = await prisma.paymentAccount.findUnique({
      where: { id: params.id },
      include: {
        fiatCurrency: true,
        cryptocurrency: true,
        blockchain: true,
        paymentMethods: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
        payOuts: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Payment account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      account,
    });
  } catch (error) {
    console.error('Error fetching payment account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment account' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminRole('ADMIN');
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  try {
    const body = await request.json();

    // Get existing account for audit
    const existingAccount = await prisma.paymentAccount.findUnique({
      where: { id: params.id },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Payment account not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const { 
      fiatCurrencyCode, 
      cryptocurrencyCode, 
      blockchainCode,
      memo, // Remove memo field - not in Prisma schema
      ...accountData 
    } = body;

    const data: any = { ...accountData };

    // Update relations if provided
    if (fiatCurrencyCode !== undefined) {
      data.fiatCurrency = fiatCurrencyCode 
        ? { connect: { code: fiatCurrencyCode } }
        : { disconnect: true };
    }
    if (cryptocurrencyCode !== undefined) {
      data.cryptocurrency = cryptocurrencyCode
        ? { connect: { code: cryptocurrencyCode } }
        : { disconnect: true };
    }
    if (blockchainCode !== undefined) {
      data.blockchain = blockchainCode
        ? { connect: { code: blockchainCode } }
        : { disconnect: true };
    }

    const updatedAccount = await prisma.paymentAccount.update({
      where: { id: params.id },
      data,
      include: {
        fiatCurrency: true,
        cryptocurrency: true,
        blockchain: true,
      },
    });

    // Audit log
    await auditService.logAdminAction(
      session.user.id,
      'PAYMENT_ACCOUNT_UPDATE',
      'PaymentAccount',
      params.id,
      existingAccount,
      updatedAccount
    );

    return NextResponse.json({
      success: true,
      account: updatedAccount,
    });
  } catch (error) {
    console.error('Error updating payment account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payment account' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminRole('ADMIN');
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  try {
    // Check if account exists
    const account = await prisma.paymentAccount.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            paymentMethods: true,
            payOuts: true,
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Payment account not found' },
        { status: 404 }
      );
    }

    // Prevent deletion if there are related records
    if (account._count.paymentMethods > 0 || account._count.payOuts > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete payment account with related payment methods or payouts. Deactivate it instead.' 
        },
        { status: 400 }
      );
    }

    await prisma.paymentAccount.delete({
      where: { id: params.id },
    });

    // Audit log
    await auditService.logAdminAction(
      session.user.id,
      'PAYMENT_ACCOUNT_DELETE',
      'PaymentAccount',
      params.id,
      account,
      null
    );

    return NextResponse.json({
      success: true,
      message: 'Payment account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting payment account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment account' },
      { status: 500 }
    );
  }
}

