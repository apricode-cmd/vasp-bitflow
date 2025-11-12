/**
 * NextAuth API Route Handler
 * 
 * Handles all NextAuth authentication requests for CLIENT users.
 * 
 * IMPORTANT: Must use standard NextAuth v5 pattern for Vercel Edge compatibility
 */

import { handlers } from '../../../../auth';

console.log('🔐 [NEXTAUTH-ROUTE] Route file loaded');

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Export handlers directly (Vercel-compatible way)
export const GET = handlers.GET;
export const POST = handlers.POST;

console.log('🔐 [NEXTAUTH-ROUTE] Handlers exported:', { 
  GET: typeof GET, 
  POST: typeof POST 
});

