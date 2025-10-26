/**
 * Mark Notification as Read API Route
 * 
 * PATCH /api/notifications/[id]/read - Mark single notification as read
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
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}


