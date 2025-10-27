/**
 * Profile API Route
 * 
 * GET /api/profile - Returns current user profile
 * PATCH /api/profile - Updates user profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Profile update schema
const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  phoneCountry: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  dateOfBirth: z.string().optional().nullable(),
  placeOfBirth: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
});

export async function GET(): Promise<NextResponse> {
  try {
    // Check authentication
    const { error, session } = await requireAuth();
    if (error) return error;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            phoneCountry: true,
            country: true,
            city: true,
            address: true,
            postalCode: true,
            dateOfBirth: true,
            placeOfBirth: true,
            nationality: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('[PROFILE GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const { error, session } = await requireAuth();
    if (error) return error;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validated = updateProfileSchema.parse(body);
    
    // Prepare data for database
    const profileData: any = {
      firstName: validated.firstName,
      lastName: validated.lastName,
      phoneNumber: validated.phoneNumber || null,
      phoneCountry: validated.phoneCountry || null,
      country: validated.country || '',
      city: validated.city || null,
      address: validated.address || null,
      postalCode: validated.postalCode || null,
      placeOfBirth: validated.placeOfBirth || null,
      nationality: validated.nationality || null,
    };
    
    // Convert dateOfBirth string to Date if provided
    if (validated.dateOfBirth) {
      profileData.dateOfBirth = new Date(validated.dateOfBirth);
    }

    // Update or create profile
    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...profileData
      },
      update: profileData
    });

    return NextResponse.json({
      success: true,
      profile
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[PROFILE PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}


