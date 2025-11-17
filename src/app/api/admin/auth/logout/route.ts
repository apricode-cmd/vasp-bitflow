/**
 * Admin Logout API (Passkey flow)
 * 
 * Destroys Custom JWT session cookie
 */

import { NextResponse } from 'next/server';
import { destroyAdminSession } from '@/lib/services/admin-session.service';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Delete JWT cookie
    await destroyAdminSession();
    
    console.log('✅ [Logout] Passkey session destroyed');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [Logout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}

