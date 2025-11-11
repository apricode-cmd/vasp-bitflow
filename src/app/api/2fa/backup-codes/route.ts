/**
 * POST /api/2fa/backup-codes
 * 
 * Regenerate backup codes for user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { regenerateBackupCodes } from '@/lib/services/totp.service';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

const regenerateSchema = z.object({
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
    const validated = regenerateSchema.parse(body);
    
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
    
    // Regenerate backup codes
    const backupCodes = await regenerateBackupCodes(session.user.id);
    
    // Audit log (для клиента используем logUserAction)
    await auditService.logUserAction(
      session.user.id,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      AUDIT_ENTITIES.USER,
      session.user.id,
      { 
        backupCodesRegenerated: true,
        method: 'TOTP' 
      }
    );
    
    console.log('✅ Backup codes regenerated for user:', session.user.email);
    
    return NextResponse.json({
      success: true,
      message: 'Backup codes regenerated successfully',
      backupCodes // Show once, user must save them
    });
  } catch (error: any) {
    console.error('[2FA Backup Codes] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate backup codes' },
      { status: 500 }
    );
  }
}

