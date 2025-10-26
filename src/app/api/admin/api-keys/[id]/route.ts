/**
 * Admin API Key Management API
 * 
 * DELETE /api/admin/api-keys/[id] - Revoke API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { apiKeyService } from '@/lib/services/api-key.service';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
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

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.API_KEY_REVOKED,
      AUDIT_ENTITIES.API_KEY,
      id,
      { isActive: true },
      { isActive: false },
      {
        name: apiKey.name,
        prefix: apiKey.prefix
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

