// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Resend Admin Invitation API
 * 
 * POST /api/admin/admins/[id]/resend-invite
 * 
 * Regenerate setup token and resend invitation email
 * Requires Step-up MFA (SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { stepUpMfaService } from '@/lib/services/step-up-mfa.service';
import { eventEmitter } from '@/lib/services/event-emitter.service';
import { z } from 'zod';
import crypto from 'crypto';

const resendInviteSchema = z.object({
  mfaChallengeId: z.string().optional(),
  mfaResponse: z.any().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Only SUPER_ADMIN can resend invites
    const authResult = await requireAdminRole('SUPER_ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const adminId = params.id;
    const body = await request.json();
    const validatedData = resendInviteSchema.parse(body);

    // ✅ Step-up MFA: RESEND_ADMIN_INVITE action requires MFA
    if (!validatedData.mfaChallengeId || !validatedData.mfaResponse) {
      // First call - request MFA challenge
      const challenge = await stepUpMfaService.requestChallenge(
        session.user.id,
        'RESEND_ADMIN_INVITE',
        'Admin',
        'resend-invite',
        { adminId }
      );

      return NextResponse.json({
        success: false,
        requiresMfa: true,
        challengeId: challenge.challengeId,
        options: challenge.options,
      });
    }

    // Verify MFA
    const verified = await stepUpMfaService.verifyChallenge(
      validatedData.mfaChallengeId,
      validatedData.mfaResponse
    );

    if (!verified) {
      return NextResponse.json(
        { success: false, error: 'MFA verification failed' },
        { status: 403 }
      );
    }

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        workEmail: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        setupToken: true,
        setupTokenExpiry: true,
      }
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Can only resend for INVITED admins
    if (admin.status !== 'INVITED') {
      return NextResponse.json(
        { error: 'Admin is not in INVITED status' },
        { status: 400 }
      );
    }

    // Generate new setup token
    const setupToken = crypto.randomBytes(64).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(setupToken).digest('hex');

    // Extend expiry by 15 minutes
    const setupTokenExpiry = new Date();
    setupTokenExpiry.setMinutes(setupTokenExpiry.getMinutes() + 15);

    // Update admin with new token
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        setupToken: hashedToken,
        setupTokenExpiry,
      }
    });

    // Generate new invite link (with corrected path)
    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteLink = `${origin}/admin/auth/setup?token=${setupToken}&email=${encodeURIComponent(admin.email || admin.workEmail || '')}`;

    // Log audit
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.user.id,
        adminEmail: session.user.email,
        adminRole: session.user.role,
        action: 'ADMIN_INVITE_RESENT',
        entityType: 'Admin',
        entityId: admin.id,
        diffAfter: {
          email: admin.email || admin.workEmail,
          role: admin.role,
          newExpiresAt: setupTokenExpiry.toISOString(),
        },
        context: {
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          mfaChallengeId: validatedData.mfaChallengeId,
        },
        mfaRequired: true,
        mfaMethod: 'WEBAUTHN',
        mfaVerifiedAt: new Date(),
        severity: 'WARNING',
      }
    });

    // Resend invitation email
    await eventEmitter.emit('ADMIN_INVITED', {
      recipientEmail: admin.email || admin.workEmail || '',
      data: {
        adminName: `${admin.firstName} ${admin.lastName}`,
        setupUrl: inviteLink,
        expiresIn: '15 minutes',
        role: admin.role,
        adminDashboard: `${origin}/admin`,
      },
    });

    console.log('✅ [ResendInvite] Invitation resent:', admin.email || admin.workEmail);

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      inviteLink,
      expiresAt: setupTokenExpiry.toISOString(),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('❌ [ResendInvite] Error:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}

