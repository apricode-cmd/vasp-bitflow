/**
 * Admin API - Reactivate Virtual IBAN Account
 * 
 * POST /api/admin/virtual-iban/:id/reactivate
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';

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

    // Reactivate account
    const account = await virtualIbanService.reactivateAccount(accountId);

    return NextResponse.json({
      success: true,
      data: account,
      message: 'Account reactivated successfully',
    });
  } catch (error) {
    console.error('[API] Reactivate Virtual IBAN account failed:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

