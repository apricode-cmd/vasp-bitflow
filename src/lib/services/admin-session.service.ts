/**
 * Admin Session Service
 * 
 * Custom JWT-based session management for administrators
 * Separate from NextAuth to support pure passwordless Passkey flow
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_ADMIN_SECRET || process.env.NEXTAUTH_SECRET
);

const SESSION_COOKIE_NAME = 'admin-session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export interface AdminSessionData {
  adminId: string;
  email: string;
  role: string;
  authMethod: 'PASSKEY' | 'SSO' | 'EMERGENCY';
  iat: number;
  exp: number;
}

/**
 * Create admin session after successful authentication
 */
export async function createAdminSession(
  adminId: string,
  authMethod: 'PASSKEY' | 'SSO' | 'EMERGENCY'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get admin data
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isSuspended: true,
      },
    });

    if (!admin) {
      return { success: false, error: 'Admin not found' };
    }

    if (!admin.isActive || admin.isSuspended) {
      return { success: false, error: 'Admin account is not active' };
    }

    // Create JWT
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      authMethod,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + SESSION_MAX_AGE)
      .sign(JWT_SECRET);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    // Update lastLogin
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    console.log('✅ Admin session created for:', admin.email);

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to create admin session:', error);
    return { success: false, error: 'Failed to create session' };
  }
}

/**
 * Get current admin session
 */
export async function getAdminSessionData(): Promise<AdminSessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    // Verify JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);

    return {
      adminId: payload.adminId as string,
      email: payload.email as string,
      role: payload.role as string,
      authMethod: payload.authMethod as 'PASSKEY' | 'SSO' | 'EMERGENCY',
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (error) {
    console.error('❌ Failed to verify admin session:', error);
    return null;
  }
}

/**
 * Destroy admin session (logout)
 */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  console.log('✅ Admin session destroyed');
}
