/**
 * Action Center API Route
 * 
 * GET /api/admin/action-center - Get actionable items requiring admin attention
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { actionCenterService } from '@/lib/services/action-center.service';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  // Check admin authorization
  const authResult = await requireAdminAuth();
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const actionItems = await actionCenterService.getActionItems();

    return NextResponse.json({
      success: true,
      data: actionItems
    });
  } catch (error) {
    console.error('Action center error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch action items' 
      },
      { status: 500 }
    );
  }
}

