// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

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

    // ✅ FIX: Format dateOfBirth as YYYY-MM-DD to prevent timezone issues
    // When Date is serialized to JSON, it uses toISOString() which causes timezone shift
    const userData = {
      ...user,
      profile: user.profile ? {
        ...user.profile,
        dateOfBirth: user.profile.dateOfBirth 
          ? (() => {
              const d = new Date(user.profile.dateOfBirth);
              const year = d.getUTCFullYear();
              const month = String(d.getUTCMonth() + 1).padStart(2, '0');
              const day = String(d.getUTCDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            })()
          : null
      } : null
    };

    return NextResponse.json({
      success: true,
      user: userData
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
    
    console.log('📝 Profile update request:', body);
    
    // Validate input
    const validated = updateProfileSchema.parse(body);
    
    console.log('✅ Validation passed:', validated);
    
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
    
    // ✅ FIX: Parse dateOfBirth without timezone conversion
    // Store in UTC at noon to prevent "1 day less" bug
    if (validated.dateOfBirth) {
      try {
        console.log('📅 Parsing dateOfBirth:', validated.dateOfBirth);
        
        let year: number, month: number, day: number;
        
        // Parse YYYY-MM-DD format (from our fixed forms)
        if (validated.dateOfBirth.includes('-') && !validated.dateOfBirth.includes('T')) {
          [year, month, day] = validated.dateOfBirth.split('-').map(Number);
          console.log('  ✅ YYYY-MM-DD format:', { year, month, day });
        } 
        // Fallback: parse ISO string if it comes from old forms
        else if (validated.dateOfBirth.includes('T')) {
          const dateObj = new Date(validated.dateOfBirth);
          year = dateObj.getUTCFullYear();
          month = dateObj.getUTCMonth() + 1;
          day = dateObj.getUTCDate();
          console.log('  ⚠️ ISO string detected, extracting UTC:', { year, month, day });
        } else {
          throw new Error('Invalid date format');
        }
        
        // ✅ Store in UTC at noon to prevent timezone shift when reading
        // Example: User enters "1963-03-06" → stored as "1963-03-06T12:00:00.000Z"
        profileData.dateOfBirth = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        console.log('  ✅ Saved to DB:', profileData.dateOfBirth.toISOString());
      } catch (error) {
        console.error('❌ Failed to parse dateOfBirth:', validated.dateOfBirth, error);
        throw new Error('Invalid date of birth format');
      }
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
      console.error('❌ Validation error:', error.errors);
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


