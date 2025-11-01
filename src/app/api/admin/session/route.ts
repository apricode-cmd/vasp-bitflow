/**
 * Admin Session Info API
 * 
 * Returns current admin session data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionData } from '@/lib/services/admin-session.service';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const sessionData = await getAdminSessionData();

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get full admin details
    const admin = await prisma.admin.findUnique({
      where: { id: sessionData.adminId },
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

