/**
 * NextAuth API Route Handler
 * 
 * Handles all NextAuth authentication requests for CLIENT users.
 */

import { clientHandlers } from '@/auth-client';

console.log('🔐 [NEXTAUTH-ROUTE] Route file loaded');
console.log('🔐 [NEXTAUTH-ROUTE] clientHandlers:', {
  hasGET: typeof clientHandlers.GET === 'function',
  hasPOST: typeof clientHandlers.POST === 'function',
  handlers: clientHandlers
});

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Export handlers
export const GET = clientHandlers.GET;
export const POST = clientHandlers.POST;

console.log('🔐 [NEXTAUTH-ROUTE] Handlers exported:', {
  GET: typeof GET,
  POST: typeof POST
});

