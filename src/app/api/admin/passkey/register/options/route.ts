// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Passkey Registration Options API
 * 
 * Generates WebAuthn registration options for admin
 * Works both for first-time setup (no session) and adding additional passkeys (with session)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { PasskeyService } from '@/lib/services/passkey.service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Try to get session (for adding additional passkeys) - but don't require it for first-time setup
    const sessionResult = await requireAdminAuth();
    const session = sessionResult instanceof NextResponse ? null : sessionResult;
    
    let adminId: string;
    let adminEmail: string;
    let displayName: string;

    if (session?.user) {
      // Existing logged-in admin adding another passkey
      adminId = session.user.id;
      adminEmail = session.user.email!;
      displayName = session.user.name || session.user.email!;
    } else if (email) {
      // First-time setup - no session yet (INVITED admin)
      // Find admin by workEmail or email
      const admin = await prisma.admin.findFirst({
        where: { 
          OR: [
            { workEmail: email },
            { email: email }
          ],
          status: 'INVITED', // Only allow INVITED admins for first-time setup
        },
        select: {
          id: true,
          email: true,
          workEmail: true,
          firstName: true,
          lastName: true,
          status: true,
          setupToken: true,
          setupTokenExpiry: true,
        }
      });

      if (!admin) {
        return NextResponse.json(
          { error: 'Admin not found or not invited' },
          { status: 404 }
        );
      }

      // Check if setup token is still valid
      if (!admin.setupToken || (admin.setupTokenExpiry && admin.setupTokenExpiry < new Date())) {
        return NextResponse.json(
          { error: 'Setup token expired or invalid' },
          { status: 403 }
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

