/**
 * Admin API Key Management API
 * 
 * DELETE /api/admin/api-keys/[id] - Revoke API key (REQUIRES STEP-UP MFA)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { apiKeyService } from '@/lib/services/api-key.service';
import { handleStepUpMfa } from '@/lib/middleware/step-up-mfa';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;

    // Get admin ID
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Read body (might contain MFA data)
    const body = await request.json().catch(() => ({}));

    // 🔐 STEP-UP MFA REQUIRED FOR API KEY REVOCATION
    const mfaResult = await handleStepUpMfa(
      body,
      adminId,
      'REVOKE_API_KEY',
      'ApiKey',
      id
    );

    // If MFA challenge is required, return it
    if (mfaResult.requiresMfa) {
      return NextResponse.json({
        success: false,
        requiresMfa: true,
        challengeId: mfaResult.challengeId,
        options: mfaResult.options
      });
    }

    // If MFA verification failed
    if (!mfaResult.verified) {
      return NextResponse.json(
        {
          success: false,
          error: mfaResult.error || 'MFA verification required'
        },
        { status: 403 }
      );
    }

    // Get API key for logging
    const apiKey = await prisma.apiKey.findUnique({
      where: { id }
    });

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'API key not found'
        },
        { status: 404 }
      );
    }

    // Revoke API key
    await apiKeyService.revokeApiKey(id);

    // Log admin action with MFA verification
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.API_KEY_REVOKED,
      AUDIT_ENTITIES.API_KEY,
      id,
      { isActive: true },
      { isActive: false },
      {
        name: apiKey.name,
        prefix: apiKey.prefix,
        mfaVerified: true
      }
    );

    return NextResponse.json({
      success: true,
      message: 'API key revoked'
    });
  } catch (error) {
    console.error('Revoke API key error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to revoke API key'
      },
      { status: 500 }
    );
  }
}

