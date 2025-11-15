// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Mark All Notifications as Read API Route
 * 
 * PATCH /api/notifications/read-all - Mark all notifications as read
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';

export async function PATCH(): Promise<NextResponse> {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    // Since we don't persist read status, just return success
    // In future, this can be implemented with a Notification table
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}


