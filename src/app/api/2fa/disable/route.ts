/**
 * POST /api/2fa/disable
 * 
 * Disable TOTP 2FA for user (requires password confirmation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { disableTotp } from '@/lib/services/totp.service';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { eventEmitter } from '@/lib/services/event-emitter.service';

const disableSchema = z.object({
  password: z.string().min(1, 'Password is required')
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getClientSession();
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = disableSchema.parse(body);
    
    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const isPasswordValid = await bcrypt.compare(validated.password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 400 }
      );
    }
    
    // Disable TOTP
    await disableTotp(session.user.id);
    
    // Audit log (для клиента используем logUserAction)
    await auditService.logUserAction(
      session.user.id,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.USER,
      session.user.id,
      { 
        twoFactorEnabled: false,
        method: 'TOTP' 
      }
    );
    
    // Emit event for notification and email
    await eventEmitter.emit('SECURITY_2FA_DISABLED', {
      userId: session.user.id,
      recipientEmail: session.user.email,
      method: 'TOTP',
    });
    
    console.log('✅ 2FA disabled for user:', session.user.email);
    
    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error: any) {
    console.error('[2FA Disable] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}

