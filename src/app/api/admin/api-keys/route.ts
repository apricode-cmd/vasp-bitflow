/**
 * Admin API Keys Management API
 * 
 * GET /api/admin/api-keys - List all API keys
 * POST /api/admin/api-keys - Generate new API key (REQUIRES STEP-UP MFA)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { apiKeyService } from '@/lib/services/api-key.service';
import { stepUpMfaService } from '@/lib/services/step-up-mfa.service';
import { handleStepUpMfa } from '@/lib/middleware/step-up-mfa';
import { createApiKeySchema } from '@/lib/validations/api-key';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Get all API keys
    const apiKeys = await apiKeyService.getApiKeys();

    return NextResponse.json({
      success: true,
      data: apiKeys
    });
  } catch (error) {
    console.error('Get API keys error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve API keys'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { session } = authResult;

    const body = await request.json();

    // 🔐 STEP-UP MFA REQUIRED FOR API KEY GENERATION
    const mfaResult = await handleStepUpMfa(
      body,
      session.user.id,
      'GENERATE_API_KEY',
      'ApiKey',
      'new'
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

    // Validate
    const validated = createApiKeySchema.parse(body);

    // Generate API key
    const { key, apiKey } = await apiKeyService.generateApiKey(
      validated.name,
      validated.permissions,
      session.user.id,
      validated.userId,
      validated.expiresAt ? new Date(validated.expiresAt) : undefined,
      validated.rateLimit
    );

    // Log admin action with MFA verification
    await auditService.logAdminAction(
      session.user.id,
      AUDIT_ACTIONS.API_KEY_GENERATED,
      AUDIT_ENTITIES.API_KEY,
      apiKey.id,
      {},
      {
        name: apiKey.name,
        prefix: apiKey.prefix,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
        mfaVerified: true
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          prefix: apiKey.prefix,
          permissions: apiKey.permissions,
          isActive: apiKey.isActive,
          expiresAt: apiKey.expiresAt,
          rateLimit: apiKey.rateLimit,
          usageCount: apiKey.usageCount,
          createdAt: apiKey.createdAt
        },
        key // Plain text key - show only once!
      },
      message: 'API key generated successfully. Save it securely - it will not be shown again!'
    }, { status: 201 });
  } catch (error) {
    console.error('Generate API key error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate API key',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

