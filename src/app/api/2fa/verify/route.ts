// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * POST /api/2fa/verify
 * 
 * Verify TOTP code and enable 2FA for user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { z } from 'zod';
import { 
  verifyTotpCode,
  enableTotp
} from '@/lib/services/totp.service';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { eventEmitter } from '@/lib/services/event-emitter.service';

const verifySchema = z.object({
  secret: z.string().min(1, 'Secret is required'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric')
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
    const validated = verifySchema.parse(body);
    
    // Verify TOTP code
    const isValid = verifyTotpCode(
      validated.secret,
      session.user.email,
      validated.code
    );
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid code. Please try again.' },
        { status: 400 }
      );
    }
    
    // Enable TOTP and generate backup codes
    const { backupCodes } = await enableTotp(session.user.id, validated.secret);
    
    // Audit log (для клиента используем logUserAction)
    await auditService.logUserAction(
      session.user.id,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.USER,
      session.user.id,
      { 
        twoFactorEnabled: true,
        method: 'TOTP' 
      }
    );
    
    // Emit event for notification and email
    await eventEmitter.emit('SECURITY_2FA_ENABLED', {
      userId: session.user.id,
      recipientEmail: session.user.email,
      method: 'TOTP',
    });
    
    console.log('✅ 2FA enabled for user:', session.user.email);
    
    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes // Show once, user must save them
    });
  } catch (error: any) {
    console.error('[2FA Verify] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}

