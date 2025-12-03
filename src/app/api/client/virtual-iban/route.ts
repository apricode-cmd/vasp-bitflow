/**
 * Client API - My Virtual IBAN Accounts
 * 
 * GET /api/client/virtual-iban - Get current user's Virtual IBAN accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';

export async function GET(req: NextRequest) {
  try {
    // Check client auth
    const { error, session } = await requireAuth();
    if (error) return error;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's accounts
    const accounts = await virtualIbanService.getUserAccounts(session.user.id);

    return NextResponse.json({
      success: true,
      data: accounts,
      count: accounts.length,
    });
  } catch (error) {
    console.error('[API] Get user Virtual IBAN accounts failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

