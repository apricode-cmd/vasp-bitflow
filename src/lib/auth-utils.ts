/**
 * Authentication Utility Functions
 * 
 * Helper functions for authentication, authorization, and password management.
 * 
 * This file serves as a central export for both CLIENT and ADMIN auth utilities.
 */

import { NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

// Re-export ADMIN auth utilities for convenience
export { 
  requireAdminAuth, 
  requireAdminRole, 
  requireAdminPermission 
} from '@/lib/middleware/admin-auth';

const SALT_ROUNDS = 10;

/**
 * Hashes a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a password against a hashed password
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * Gets the current CLIENT session or returns an unauthorized response
 * For client API endpoints, use this function
 */
export async function requireAuth() {
  const session = await getClientSession();

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null
    };
  }

  return { error: null, session };
}

/**
 * Checks if the user has a specific role
 */
export async function requireRole(role: Role) {
  const session = await getClientSession();

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null
    };
  }

  if (session.user.role !== role) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      session: null
    };
  }

  return { error: null, session };
}

/**
 * Checks if the user owns a resource or is an admin
 */
export async function requireResourceOwnership(resourceUserId: string) {
  const session = await getClientSession();

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null
    };
  }

  // Admin can access all resources
  if (session.user.role === Role.ADMIN) {
    return { error: null, session };
  }

  // Regular user can only access their own resources
  if (session.user.id !== resourceUserId) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      session: null
    };
  }

  return { error: null, session };
}

/**
 * Checks if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getClientSession();
  return session?.user?.role === Role.ADMIN;
}

/**
 * Gets the current user ID or throws an error
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await getClientSession();
  
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
  
  return session.user.id;
}

/**
 * Gets the current user or null
 */
export async function getCurrentUser() {
  const session = await getClientSession();
  return session?.user || null;
}

