/**
 * Client API - Close Virtual IBAN Account
 * POST /api/client/virtual-iban/[id]/close
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';
import { z } from 'zod';

const CloseAccountSchema = z.object({
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const accountId = params.id;

    // Verify account belongs to user
    const account = await virtualIbanService.getAccountById(accountId);
    
    if (!account) {
      return NextResponse.json(
        { error: 'Virtual IBAN account not found' },
        { status: 404 }
      );
    }

    if (account.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - account does not belong to you' },
        { status: 403 }
      );
    }

    // Check if account can be closed (e.g., balance must be zero)
    if (account.balance && account.balance > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot close account with non-zero balance',
          balance: account.balance,
          currency: account.currency,
        },
        { status: 400 }
      );
    }

    // Check if there are pending transactions
    const pendingTransactions = await virtualIbanService.getPendingTransactions(accountId);
    if (pendingTransactions.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot close account with pending transactions',
          pendingCount: pendingTransactions.length,
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { reason } = CloseAccountSchema.parse(body);

    // Close the account
    const result = await virtualIbanService.closeAccount(accountId, reason);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to close account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Virtual IBAN account closed successfully',
    });
  } catch (error) {
    console.error('[API] Close Virtual IBAN failed:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to close account',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

