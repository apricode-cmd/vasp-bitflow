/**
 * Emergency Break-glass Access API
 * 
 * Critical emergency authentication endpoint
 * All attempts are logged and monitored
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth-utils';
import { signIn } from '@/auth';
import crypto from 'crypto';

function verifyTOTP(secret: string, token: string): boolean {
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  const window = 1; // Allow 1 step before/after for clock drift
  
  for (let i = -window; i <= window; i++) {
    const counter = Math.floor(epoch / timeStep) + i;
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));
    
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
    hmac.update(buffer);
    const hash = hmac.digest();
    
    const offset = hash[hash.length - 1] & 0x0f;
    const binary = ((hash[offset] & 0x7f) << 24) |
                   ((hash[offset + 1] & 0xff) << 16) |
                   ((hash[offset + 2] & 0xff) << 8) |
                   (hash[offset + 3] & 0xff);
    
    const otp = (binary % 1000000).toString().padStart(6, '0');
    
    if (otp === token) {
      return true;
    }
  }
  
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, totpCode } = body;

    console.log('🚨 Emergency access attempt:', { username });

    // Find admin by email
    const admin = await prisma.admin.findFirst({
      where: { 
        email: username,
        isActive: true,
        isSuspended: false,
      },
      include: {
        twoFactorAuth: true,
      },
    });

    if (!admin) {
      console.error('❌ Admin not found:', username);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    if (!admin.password) {
      console.error('❌ Admin has no password:', username);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const passwordValid = await verifyPassword(password, admin.password);
    if (!passwordValid) {
      console.error('❌ Invalid password for:', username);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify TOTP
    if (!admin.twoFactorAuth?.totpSecret) {
      console.error('❌ No TOTP configured for:', username);
      return NextResponse.json(
        { error: 'TOTP not configured' },
        { status: 401 }
      );
    }

    const totpValid = verifyTOTP(admin.twoFactorAuth.totpSecret, totpCode);
    if (!totpValid) {
      console.error('❌ Invalid TOTP for:', username);
      return NextResponse.json(
        { error: 'Invalid TOTP code' },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    // Log emergency access
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'EMERGENCY_ACCESS',
        entity: 'ADMIN',
        entityId: admin.id,
        details: {
          email: admin.email,
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        },
      },
    });

    console.log('✅ Emergency access granted:', username);

    // Create session using NextAuth
    const result = await signIn('credentials', {
      email: admin.email,
      password: password,
      redirect: false,
    });

    return NextResponse.json({
      success: true,
      message: 'Emergency access granted',
    });
  } catch (error) {
    console.error('❌ Emergency access error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

