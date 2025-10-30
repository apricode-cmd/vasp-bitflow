/**
 * POST /api/auth/check-2fa
 * 
 * Check if user has 2FA enabled (for login flow)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const checkSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, password } = checkSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        password: true,
        twoFactorAuth: {
          select: {
            totpEnabled: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ requires2FA: false });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json({ requires2FA: false });
    }

    // Check if 2FA is enabled
    const requires2FA = user.twoFactorAuth?.totpEnabled === true;

    return NextResponse.json({ requires2FA });
  } catch (error) {
    console.error('Check 2FA error:', error);
    return NextResponse.json({ requires2FA: false });
  }
}

