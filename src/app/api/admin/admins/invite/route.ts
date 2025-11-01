/**
 * Admin Invite API
 * 
 * POST: Generate invite link for new admin (SUPER_ADMIN only)
 * Requires Step-up MFA for security
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { stepUpMfaService } from '@/lib/services/step-up-mfa.service';
import { z } from 'zod';
import crypto from 'crypto';

const inviteAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  jobTitle: z.string().min(2, 'Job title must be at least 2 characters'),
  role: z.enum(['ADMIN', 'COMPLIANCE', 'TREASURY_APPROVER', 'FINANCE', 'SUPPORT', 'READ_ONLY']),
  department: z.string().optional(),
  // Step-up MFA fields
  mfaChallengeId: z.string().optional(),
  mfaResponse: z.any().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Only SUPER_ADMIN can invite admins
    const session = await requireAdminRole('SUPER_ADMIN');
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const validatedData = inviteAdminSchema.parse(body);

    // ✅ Step-up MFA: CREATE_ADMIN action requires MFA
    if (!validatedData.mfaChallengeId || !validatedData.mfaResponse) {
      // First call - request MFA challenge
      const challenge = await stepUpMfaService.requestChallenge(
        session.adminId,
        'CREATE_ADMIN',
        'Admin',
        'invite',
        {
          email: validatedData.email,
          role: validatedData.role,
        }
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

    // Check if admin with this email already exists
    const existingAdmin = await prisma.admin.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { workEmail: validatedData.email },
        ],
      },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin with this email already exists' },
        { status: 400 }
      );
    }

    // Generate secure setup token (64 bytes = 128 hex chars)
    const setupToken = crypto.randomBytes(64).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(setupToken).digest('hex');

    // Token expires in 7 days
    const setupTokenExpiry = new Date();
    setupTokenExpiry.setDate(setupTokenExpiry.getDate() + 7);

    // Create admin with SUSPENDED status (until Passkey setup)
    const newAdmin = await prisma.admin.create({
      data: {
        email: validatedData.email,
        workEmail: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        jobTitle: validatedData.jobTitle,
        department: validatedData.department,
        role: validatedData.role,
        roleCode: validatedData.role,
        status: 'SUSPENDED', // Will be activated after Passkey setup
        isActive: false,
        authMethod: 'PASSKEY', // Force Passkey authentication
        setupToken: hashedToken,
        setupTokenExpiry,
        invitedBy: session.adminId,
        invitedAt: new Date(),
        createdBy: session.adminId,
      },
    });

    // Generate invite link
    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteLink = `${origin}/admin/auth/setup-passkey?token=${setupToken}&email=${encodeURIComponent(validatedData.email)}`;

    // Log to AdminAuditLog
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.adminId,
        adminEmail: session.email,
        adminRole: session.roleCode,
        action: 'ADMIN_INVITED',
        entityType: 'Admin',
        entityId: newAdmin.id,
        diffAfter: {
          email: validatedData.email,
          role: validatedData.role,
          jobTitle: validatedData.jobTitle,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
        },
        context: {
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
        mfaRequired: true,
        mfaMethod: 'WEBAUTHN',
        mfaVerifiedAt: new Date(),
        mfaEventId: validatedData.mfaChallengeId,
        severity: 'WARNING', // Creating admin is important action
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin invited successfully',
      inviteLink,
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        role: newAdmin.role,
        expiresAt: setupTokenExpiry.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('❌ Invite admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to invite admin' },
      { status: 500 }
    );
  }
}

