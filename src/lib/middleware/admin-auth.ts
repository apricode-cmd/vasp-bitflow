/**
 * Admin Authentication Middleware
 * 
 * Provides authentication and authorization helpers for admin API routes.
 * Supports BOTH authentication methods:
 * - Custom JWT (Passkey) via admin-session.service.ts
 * - NextAuth JWT (Password+TOTP) via auth-admin.ts
 * 
 * @module lib/middleware/admin-auth
 */

import { NextResponse } from 'next/server';
import { getAdminSessionData, type AdminSessionData } from '@/lib/services/admin-session.service';
import { getAdminSession } from '@/auth-admin';
import { permissionService } from '@/lib/services/permission.service';
import { AdminRole } from '@prisma/client';

/**
 * Session wrapper for backward compatibility with NextAuth-style code
 */
interface SessionWrapper {
  user: {
    id: string;
    email: string;
    role: string;
    authMethod?: string;
  };
}

/**
 * Convert AdminSessionData to NextAuth-style session for backward compatibility
 */
function wrapSession(sessionData: AdminSessionData): SessionWrapper {
  return {
    user: {
      id: sessionData.adminId,
      email: sessionData.email,
      role: sessionData.role,
      authMethod: sessionData.authMethod,
    },
  };
}

/**
 * Require admin authentication
 * 
 * Checks BOTH Passkey (Custom JWT) and Password+TOTP (NextAuth) sessions
 * 
 * @returns Admin session (NextAuth-style wrapper) or 401 error response
 * 
 * @example
 * export async function GET(request: NextRequest) {
 *   const session = await requireAdminAuth();
 *   if (session instanceof NextResponse) return session;
 *   
 *   // Use session.user.id, session.user.email, session.user.role
 * }
 */
export async function requireAdminAuth() {
  // Try Custom JWT (Passkey) first
  let sessionData = await getAdminSessionData();

  if (!sessionData) {
    // Try NextAuth (Password+TOTP)
    const nextAuthSession = await getAdminSession();
    if (nextAuthSession?.user?.id) {
      // Convert NextAuth session to AdminSessionData format
      sessionData = {
        adminId: nextAuthSession.user.id,
        email: nextAuthSession.user.email || '',
        role: nextAuthSession.user.role || 'ADMIN',
        authMethod: 'PASSWORD' as const,
        iat: 0,
        exp: 0,
      };
    }
  }

  if (!sessionData) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return { session: wrapSession(sessionData) };
}

/**
 * Require admin authentication with specific role
 * 
 * Checks BOTH Passkey (Custom JWT) and Password+TOTP (NextAuth) sessions
 * 
 * @param role - Required admin role (SUPER_ADMIN has access to everything)
 * @returns Admin session (NextAuth-style wrapper) or 401/403 error response
 * 
 * @example
 * export async function DELETE(request: NextRequest) {
 *   const session = await requireAdminRole('SUPER_ADMIN');
 *   if (session instanceof NextResponse) return session;
 *   
 *   // Only SUPER_ADMIN can reach here
 * }
 */
export async function requireAdminRole(role: AdminRole | AdminRole[]) {
  // Try Custom JWT (Passkey) first
  let sessionData = await getAdminSessionData();

  if (!sessionData) {
    // Try NextAuth (Password+TOTP)
    const nextAuthSession = await getAdminSession();
    if (nextAuthSession?.user?.id) {
      // Convert NextAuth session to AdminSessionData format
      sessionData = {
        adminId: nextAuthSession.user.id,
        email: nextAuthSession.user.email || '',
        role: nextAuthSession.user.role || 'ADMIN',
        authMethod: 'PASSWORD' as const,
        iat: 0,
        exp: 0,
      };
    }
  }

  if (!sessionData) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // SUPER_ADMIN has access to everything
  if (sessionData.role === 'SUPER_ADMIN') {
    return { session: wrapSession(sessionData) };
  }

  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!allowedRoles.includes(sessionData.role as AdminRole)) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Insufficient permissions' },
      { status: 403 }
    );
  }

  return { session: wrapSession(sessionData) };
}

/**
 * Require admin authentication with permission check
 * 
 * Checks BOTH Passkey (Custom JWT) and Password+TOTP (NextAuth) sessions
 * 
 * @param resource - Resource name (e.g., 'orders', 'kyc', 'users')
 * @param action - Action name (e.g., 'read', 'create', 'delete')
 * @returns Admin session (NextAuth-style wrapper) or 401/403 error response
 * 
 * @example
 * export async function DELETE(request: NextRequest) {
 *   const session = await requireAdminPermission('users', 'delete');
 *   if (session instanceof NextResponse) return session;
 *   
 *   // Admin has users:delete permission
 * }
 */
export async function requireAdminPermission(resource: string, action: string) {
  // Try Custom JWT (Passkey) first
  let sessionData = await getAdminSessionData();

  if (!sessionData) {
    // Try NextAuth (Password+TOTP)
    const nextAuthSession = await getAdminSession();
    if (nextAuthSession?.user?.id) {
      // Convert NextAuth session to AdminSessionData format
      sessionData = {
        adminId: nextAuthSession.user.id,
        email: nextAuthSession.user.email || '',
        role: nextAuthSession.user.role || 'ADMIN',
        authMethod: 'PASSWORD' as const,
        iat: 0,
        exp: 0,
      };
    }
  }

  if (!sessionData) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check permission via PermissionService
  const hasPermission = await permissionService.hasPermission(
    sessionData.adminId,
    resource,
    action
  );

  if (!hasPermission) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Permission denied: ${resource}:${action}` 
      },
      { status: 403 }
    );
  }

  return { session: wrapSession(sessionData) };
}

/**
 * Check if session is a NextResponse (error)
 * 
 * @param session - Session or NextResponse
 * @returns True if session is an error response
 * 
 * @example
 * const session = await requireAdminAuth();
 * if (isErrorResponse(session)) return session;
 * // Now TypeScript knows session is a valid Session
 */
export function isErrorResponse(session: any): session is NextResponse {
  return session instanceof NextResponse;
}

/**
 * Get current admin user ID from session
 * 
 * Checks BOTH Passkey (Custom JWT) and Password+TOTP (NextAuth) sessions
 * 
 * @returns Admin ID or null
 * 
 * @example
 * const adminId = await getCurrentUserId();
 * if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 */
export async function getCurrentUserId(): Promise<string | null> {
  // Try Custom JWT (Passkey) first
  let sessionData = await getAdminSessionData();

  if (!sessionData) {
    // Try NextAuth (Password+TOTP)
    const nextAuthSession = await getAdminSession();
    if (nextAuthSession?.user?.id) {
      return nextAuthSession.user.id;
    }
  }

  return sessionData?.adminId || null;
}

