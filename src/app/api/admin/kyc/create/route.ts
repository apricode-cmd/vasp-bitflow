// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Create KYC Session API
 * POST /api/admin/kyc/create - Manually create a KYC session for a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { auditService } from '@/lib/services/audit.service';
import { z } from 'zod';

const createKycSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const { error, session } = await requireAdminRole('ADMIN');
    if (error) return error;

    const body = await request.json();
    
    console.log('[CREATE KYC] Starting creation with data:', body);
    
    // Validate input
    const validated = createKycSchema.parse(body);

    console.log('[CREATE KYC] Validated user ID:', validated.userId);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: validated.userId },
      include: { profile: true }
    });

    if (!user) {
      console.log('[CREATE KYC] User not found:', validated.userId);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[CREATE KYC] User found:', user.email);

    // Create profile if it doesn't exist
    if (!user.profile) {
      console.log('[CREATE KYC] Creating profile for user...');
      await prisma.profile.create({
        data: {
          userId: user.id,
          firstName: '',
          lastName: ''
        }
      });
      console.log('[CREATE KYC] Profile created');
    }

    // Check if KYC session already exists
    const existingSession = await prisma.kycSession.findUnique({
      where: { userId: validated.userId }
    });

    if (existingSession) {
      console.log('[CREATE KYC] Session already exists:', existingSession.id);
      return NextResponse.json(
        { success: false, error: 'KYC session already exists for this user' },
        { status: 400 }
      );
    }

    console.log('[CREATE KYC] Creating KYC session...');

    // Create KYC session
    const kycSession = await prisma.kycSession.create({
      data: {
        userId: validated.userId,
        status: 'PENDING',
        attempts: 0,
      },
      include: {
        user: {
          include: { profile: true }
        }
      }
    });

    console.log('[CREATE KYC] Session created:', kycSession.id);

    // Revalidate cache
    revalidatePath('/admin/kyc');
    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${validated.userId}`);
    revalidateTag('kyc-sessions');

    // Audit log
    try {
      await auditService.log({
        userId: session?.user?.id || 'system',
        action: 'KYC_CREATED',
        entity: 'KYC',
        entityId: kycSession.id,
        newValue: 'PENDING',
        metadata: {
          userEmail: user.email,
          createdByAdmin: true
        }
      });
      console.log('[CREATE KYC] Audit log created');
    } catch (auditError) {
      console.error('[CREATE KYC] Audit log error (non-critical):', auditError);
    }

    return NextResponse.json({
      success: true,
      data: kycSession
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[CREATE KYC] Validation error:', error.errors);
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[CREATE KYC] Error details:', error);
    console.error('[CREATE KYC] Error name:', (error as Error)?.name);
    console.error('[CREATE KYC] Error message:', (error as Error)?.message);
    return NextResponse.json(
      { success: false, error: 'Failed to create KYC session' },
      { status: 500 }
    );
  }
}

