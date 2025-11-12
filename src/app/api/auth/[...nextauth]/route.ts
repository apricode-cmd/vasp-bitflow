/**
 * NextAuth API Route Handler
 * 
 * Handles all NextAuth authentication requests for CLIENT users.
 * 
 * IMPORTANT: Must use standard NextAuth v5 pattern for Vercel Edge compatibility
 */

import { handlers } from '@/auth';

console.log('🔐 [NEXTAUTH-ROUTE] Route file loaded, handlers:', handlers);

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Standard NextAuth v5 export pattern
export const { GET, POST } = handlers;

console.log('🔐 [NEXTAUTH-ROUTE] Handlers exported:', { 
  GET: typeof GET, 
  POST: typeof POST 
});

