/**
 * Check Passkey Availability API
 * 
 * Checks if admin exists and has registered passkeys
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const checkSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = checkSchema.parse(body);

    // Find admin by email
    const admin = await prisma.admin.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isActive: true,
        isSuspended: true,
        webAuthnCreds: {
          where: { isActive: true },
          select: {
            id: true,
            deviceName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    if (!admin.isActive) {
      return NextResponse.json(
        { error: 'Admin account is not active' },
        { status: 403 }
      );
    }

    if (admin.isSuspended) {
      return NextResponse.json(
        { error: 'Admin account is suspended' },
        { status: 403 }
      );
    }

    const hasPasskeys = admin.webAuthnCreds && admin.webAuthnCreds.length > 0;

    console.log(`✅ Check passkey for ${email}: ${hasPasskeys ? 'HAS' : 'NO'} passkeys`);

    return NextResponse.json({
      hasPasskeys,
      passkeysCount: admin.webAuthnCreds?.length || 0,
      devices: admin.webAuthnCreds?.map(c => ({
        name: c.deviceName,
        registeredAt: c.createdAt,
      })) || [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.error('❌ Check passkey error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

