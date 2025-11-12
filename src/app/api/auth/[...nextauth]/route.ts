/**
 * NextAuth API Route Handler
 * 
 * Handles all NextAuth authentication requests for CLIENT users.
 */

import { clientHandlers } from '@/auth-client';

export const { GET, POST } = clientHandlers;

