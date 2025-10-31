/**
 * Passkey Registration Options API
 * 
 * Generates WebAuthn registration options for admin
 * Works both for first-time setup (no session) and adding additional passkeys (with session)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/auth-admin';
import { PasskeyService } from '@/lib/services/passkey.service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Try to get session (for adding additional passkeys)
    const session = await getAdminSession();
    
    let adminId: string;
    let adminEmail: string;
    let displayName: string;

    if (session?.user) {
      // Existing logged-in admin adding another passkey
      adminId = session.user.id;
      adminEmail = session.user.email!;
      displayName = session.user.name || session.user.email!;
    } else if (email) {
      // First-time setup - no session yet
      // Find admin by email
      const admin = await prisma.admin.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
        }
      });

      if (!admin || !admin.isActive) {
        return NextResponse.json(
          { error: 'Admin not found or inactive' },
          { status: 404 }
        );
      }

      adminId = admin.id;
      adminEmail = admin.email;
      displayName = `${admin.firstName} ${admin.lastName}`;
    } else {
      return NextResponse.json(
        { error: 'Email required for first-time setup' },
        { status: 400 }
      );
    }

    // Generate options
    const options = await PasskeyService.generatePasskeyRegistrationOptions(
      adminId,
      adminEmail,
      displayName
    );

    return NextResponse.json(options);
  } catch (error) {
    console.error('Passkey registration options error:', error);
    return NextResponse.json(
      { error: 'Failed to generate options' },
      { status: 500 }
    );
  }
}

