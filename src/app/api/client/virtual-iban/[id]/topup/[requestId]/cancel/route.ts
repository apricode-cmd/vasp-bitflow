/**
 * Cancel Top-Up Request API
 * 
 * DELETE - Cancel a pending top-up request
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { topUpRequestService } from '@/lib/services/topup-request.service';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const { error, session } = await requireAuth();
    if (error) return error;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { requestId } = await params;

    // 2. Cancel the request
    const cancelled = await topUpRequestService.cancelRequest(requestId, userId);

    console.log('[API] TopUp request cancelled:', {
      id: cancelled.id,
      reference: cancelled.reference,
      userId,
    });

    return NextResponse.json({
      success: true,
      data: cancelled,
      message: 'Top-up request cancelled successfully',
    });
  } catch (error) {
    console.error('[API] Cancel top-up request failed:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('not found')) {
      return NextResponse.json(
        { error: 'Top-up request not found or already processed' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel top-up request', details: message },
      { status: 500 }
    );
  }
}

