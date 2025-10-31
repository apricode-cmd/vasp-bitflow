/**
 * Admin Profile API
 * 
 * GET: Fetch admin profile data
 * PUT: Update admin profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { z } from 'zod';

const profileUpdateSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminId = session.user.id;

    // Get admin data
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isSuspended: true,
        lastLogin: true,
        authMethod: true,
        createdAt: true,
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
      profile: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        isSuspended: admin.isSuspended,
        lastLogin: admin.lastLogin,
        authMethod: admin.authMethod,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Get admin profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminId = session.user.id;
    const body = await request.json();

    console.log('📝 Updating admin profile:', { adminId, body });

    // Validate input
    const validatedData = profileUpdateSchema.parse(body);

    // Email cannot be changed for security reasons
    // But we still validate it and check it matches
    if (validatedData.email !== session.user.email) {
        return NextResponse.json(
        { success: false, error: 'Email cannot be changed for security reasons' },
          { status: 400 }
        );
      }

    // Update admin profile
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
        data: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
        },
      });

    console.log('✅ Admin profile updated:', updatedAdmin.id);

    // Log to audit
    await prisma.auditLog.create({
        data: {
        adminId,
        action: 'PROFILE_UPDATED',
        entity: 'ADMIN',
        entityId: adminId,
        newValue: JSON.stringify({
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        firstName: updatedAdmin.firstName,
        lastName: updatedAdmin.lastName,
        email: updatedAdmin.email,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.errors);
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('❌ Update admin profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
