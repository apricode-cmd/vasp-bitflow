/**
 * NextAuth API Route Handler
 * 
 * Handles all NextAuth authentication requests for CLIENT users.
 */

import { clientHandlers } from '@/auth-client';

// Export handlers directly (Vercel Edge compatibility)
export async function GET(request: Request) {
  return clientHandlers.GET(request);
}

export async function POST(request: Request) {
  return clientHandlers.POST(request);
}

