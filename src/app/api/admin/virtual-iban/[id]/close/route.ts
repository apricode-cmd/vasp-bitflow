/**
 * Admin API - Close Virtual IBAN Account
 * POST /api/admin/virtual-iban/[id]/close
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth-utils';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';
import { z } from 'zod';

const CloseAccountSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  forceClose: z.boolean().default(false), // Allow closing even with balance (admin only)
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { error, session } = await requireAdminAuth();
    if (error) return error;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = session.user.id;
    const accountId = params.id;

    // Get account
    const account = await virtualIbanService.getAccountById(accountId);
    
    if (!account) {
      return NextResponse.json(
        { error: 'Virtual IBAN account not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { reason, forceClose } = CloseAccountSchema.parse(body);

    // Check balance (unless force close)
    if (!forceClose && account.balance && account.balance > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot close account with non-zero balance. Use forceClose=true to override.',
          balance: account.balance,
          currency: account.currency,
        },
        { status: 400 }
      );
    }

    // Check pending transactions (warning only)
    const pendingTransactions = await virtualIbanService.getPendingTransactions(accountId);
    
    if (pendingTransactions.length > 0 && !forceClose) {
      return NextResponse.json(
        { 
          error: 'Account has pending transactions. Use forceClose=true to override.',
          pendingCount: pendingTransactions.length,
        },
        { status: 400 }
      );
    }

    // Close the account
    const result = await virtualIbanService.closeAccount(accountId, reason, adminId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to close account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Virtual IBAN account closed successfully',
      accountId,
      closedBy: adminId,
      reason,
    });
  } catch (error) {
    console.error('[ADMIN API] Close Virtual IBAN failed:', error);
    
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

