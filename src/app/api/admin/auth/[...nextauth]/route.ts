/**
 * Admin Auth API Route
 * 
 * NextAuth endpoint for admin authentication
 * Handles: Passkeys, Password+TOTP, SSO
 */

import { adminHandlers } from '@/auth-admin';

export const { GET, POST } = adminHandlers;

