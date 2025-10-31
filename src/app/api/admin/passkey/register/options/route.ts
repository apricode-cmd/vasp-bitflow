/**
 * Passkey Registration Options API
 * 
 * Generates WebAuthn registration options for admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/auth-admin';
import { PasskeyService } from '@/lib/services/passkey.service';

export async function POST(request: NextRequest) {
  try {
    // Check admin session
    const session = await getAdminSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate options
    const options = await PasskeyService.generatePasskeyRegistrationOptions(
      session.user.id,
      session.user.email!,
      session.user.name || session.user.email!
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

