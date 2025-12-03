/**
 * Admin API - Suspend Virtual IBAN Account
 * 
 * POST /api/admin/virtual-iban/:id/suspend
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';
import { z } from 'zod';

const SuspendSchema = z.object({
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin permission
    const result = await requireAdminRole('ADMIN');
    if (result instanceof NextResponse) {
      return result;
    }
    const { session } = result;

    const accountId = params.id;
    const body = await req.json();
    const validation = SuspendSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { reason } = validation.data;

    // Suspend account
    const account = await virtualIbanService.suspendAccount(
      accountId,
      session.user.id,
      reason
    );

    return NextResponse.json({
      success: true,
      data: account,
      message: 'Account suspended successfully',
    });
  } catch (error) {
    console.error('[API] Suspend Virtual IBAN account failed:', error);
    return NextResponse.json(
      { error: 'Failed to suspend account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

