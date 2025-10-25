/**
 * Admin API Keys Management API
 * 
 * GET /api/admin/api-keys - List all API keys
 * POST /api/admin/api-keys - Generate new API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { apiKeyService } from '@/lib/services/api-key.service';
import { createApiKeySchema } from '@/lib/validations/api-key';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
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
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const body = await request.json();

    // Validate
    const validated = createApiKeySchema.parse(body);

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

    // Generate API key
    const { key, apiKey } = await apiKeyService.generateApiKey(
      validated.name,
      validated.permissions,
      adminId,
      validated.userId,
      validated.expiresAt ? new Date(validated.expiresAt) : undefined,
      validated.rateLimit
    );

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.API_KEY_GENERATED,
      AUDIT_ENTITIES.API_KEY,
      apiKey.id,
      {},
      {
        name: apiKey.name,
        prefix: apiKey.prefix,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        apiKey: {
          ...apiKey,
          key: undefined // Don't return hashed key
        },
        key // Plain text key - show only once!
      },
      message: 'API key generated. Save it securely - it will not be shown again!'
    }, { status: 201 });
  } catch (error) {
    console.error('Generate API key error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate API key'
      },
      { status: 500 }
    );
  }
}

