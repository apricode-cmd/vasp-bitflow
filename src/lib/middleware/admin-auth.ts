/**
 * Admin Authentication Middleware
 * 
 * Provides authentication and authorization helpers for admin API routes.
 * Uses custom JWT session management (admin-session.service.ts).
 * 
 * @module lib/middleware/admin-auth
 */

import { NextResponse } from 'next/server';
import { getAdminSessionData, type AdminSessionData } from '@/lib/services/admin-session.service';
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
  const sessionData = await getAdminSessionData();

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
  const sessionData = await getAdminSessionData();

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
  const sessionData = await getAdminSessionData();

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
 * @returns Admin ID or null
 * 
 * @example
 * const adminId = await getCurrentUserId();
 * if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 */
export async function getCurrentUserId(): Promise<string | null> {
  const sessionData = await getAdminSessionData();
  return sessionData?.adminId || null;
}

