/**
 * Admin API - Virtual IBAN Account Details
 * 
 * GET /api/admin/virtual-iban/:id - Get account details with transactions and top-up requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin permission
    const result = await requireAdminRole('ADMIN');
    if (result instanceof NextResponse) {
      return result;
    }

    const accountId = params.id;

    // Get account
    const account = await virtualIbanService.getAccountById(accountId);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get transactions with TopUpRequest relations
    const transactions = await prisma.virtualIbanTransaction.findMany({
      where: { virtualIbanId: accountId },
      include: {
        topUpRequest: {
          select: {
            id: true,
            reference: true,
            amount: true,
            status: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get TopUp requests for this account
    const topUpRequests = await prisma.topUpRequest.findMany({
      where: { virtualIbanId: accountId },
      include: {
        transaction: {
          select: {
            id: true,
            amount: true,
            status: true,
            processedAt: true,
          },
        },
        user: {
          select: {
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        account,
        transactions,
        topUpRequests,
      },
    });
  } catch (error) {
    console.error('[API] Get Virtual IBAN account details failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

