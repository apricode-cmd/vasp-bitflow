/**
 * NextAuth API Route Handler
 * 
 * IMPORTANT: This file MUST use the SAME NextAuth configuration as auth-client.ts
 * to ensure session consistency between API routes and middleware.
 */

import { clientHandlers } from '@/auth-client';

export const runtime = 'nodejs'; // NextAuth requires Node.js runtime

// Export handlers from the centralized auth-client configuration
export const GET = clientHandlers.GET;
export const POST = clientHandlers.POST;
