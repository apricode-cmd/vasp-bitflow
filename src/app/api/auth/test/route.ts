/**
 * Test endpoint to verify NextAuth handlers are accessible
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Try to import clientHandlers
    const { clientHandlers } = await import('@/auth-client');
    
    return NextResponse.json({
      success: true,
      message: 'NextAuth handlers imported successfully',
      hasGET: typeof clientHandlers.GET === 'function',
      hasPOST: typeof clientHandlers.POST === 'function'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

