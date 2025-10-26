/**
 * Admin Profile API
 * 
 * GET: Fetch admin profile data
 * PUT: Update admin profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { z } from 'zod';

const profileUpdateSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.id;

    // Get user with profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get security settings (if they exist)
    const settings = await prisma.adminSettings.findUnique({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      profile: {
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
      settings: settings ? {
        sessionTimeout: settings.sessionTimeout,
        twoFactorEnabled: settings.twoFactorEnabled,
        loginNotifications: settings.loginNotifications,
      } : null,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.id;
    const body = await request.json();

    // Validate input
    const validatedData = profileUpdateSchema.parse(body);

    // Check if email is already taken by another user
    if (validatedData.email !== authResult.user.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          id: { not: userId },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    // Update user email
    await prisma.user.update({
      where: { id: userId },
      data: { email: validatedData.email },
    });

    // Update or create profile
    await prisma.profile.upsert({
      where: { userId },
      update: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      },
      create: {
        userId,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

