/**
 * Validate Setup Token API
 * 
 * POST /api/admin/auth/validate-setup-token - Check if setup token is valid
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and token are required' },
        { status: 400 }
      );
    }

    // Find admin by workEmail (unique field) or email
    const admin = await prisma.admin.findFirst({
      where: { 
        OR: [
          { workEmail: email },
          { email: email }
        ]
      },
      select: {
        id: true,
        email: true,
        workEmail: true,
        setupToken: true,
        setupTokenExpiry: true,
        isActive: true,
        webAuthnCreds: {
          where: { isActive: true },
          select: { id: true }
        }
      }
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Check if admin already has passkeys registered
    if (admin.webAuthnCreds.length > 0) {
      return NextResponse.json(
        { 
          error: 'Passkey already registered',
          alreadySetup: true 
        },
        { status: 400 }
      );
    }

    // Check if token is set
    if (!admin.setupToken) {
      return NextResponse.json(
        { error: 'No setup token found' },
        { status: 400 }
      );
    }

    // Check if token expired
    if (admin.setupTokenExpiry && admin.setupTokenExpiry < new Date()) {
      return NextResponse.json(
        { 
          error: 'Setup token expired',
          expired: true 
        },
        { status: 400 }
      );
    }

    // Hash the provided token and compare
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    if (hashedToken !== admin.setupToken) {
      return NextResponse.json(
        { error: 'Invalid setup token' },
        { status: 401 }
      );
    }

    // Token is valid
    return NextResponse.json({
      valid: true,
      email: admin.email,
      expiresAt: admin.setupTokenExpiry?.toISOString()
    });

  } catch (error) {
    console.error('Validate setup token error:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}


