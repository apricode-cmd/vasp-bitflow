/**
 * Admin Session Info API
 * 
 * Returns current admin session data
 * Supports BOTH Passkey (Custom JWT) and Password+TOTP (NextAuth) sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionData } from '@/lib/services/admin-session.service';
import { getAdminSession } from '@/auth-admin';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Try Custom JWT (Passkey) first
    let sessionData = await getAdminSessionData();
    let adminId: string | undefined;

    if (sessionData) {
      adminId = sessionData.adminId;
    } else {
      // Try NextAuth (Password+TOTP)
      const nextAuthSession = await getAdminSession();
      if (nextAuthSession?.user?.id) {
        adminId = nextAuthSession.user.id;
      }
    }

    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get full admin details
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        workEmail: true,
        firstName: true,
        lastName: true,
        role: true,
        roleCode: true,
        authMethod: true,
        jobTitle: true,
        department: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.workEmail || admin.email,
        workEmail: admin.workEmail,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        roleCode: admin.roleCode,
        authMethod: admin.authMethod,
        jobTitle: admin.jobTitle,
        department: admin.department,
      },
    });
  } catch (error) {
    console.error('❌ Get session error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

