/**
 * Admin Integration Management API
 * 
 * GET /api/admin/integrations/[service] - Get integration config
 * PATCH /api/admin/integrations/[service] - Update integration config (REQUIRES STEP-UP MFA)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { integrationConfigService } from '@/lib/services/integration-config.service';
import { handleStepUpMfa } from '@/lib/middleware/step-up-mfa';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

const updateIntegrationSchema = z.object({
  config: z.record(z.any()),
  isEnabled: z.boolean().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { service } = await params;

    // Get integration config (decrypted)
    const integration = await integrationConfigService.getConfig(service);

    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          error: 'Integration not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: integration
    });
  } catch (error) {
    console.error('Get integration error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve integration'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) {
      return authResult;
    const { session } = authResult;
    }

    const { service } = await params;

    const body = await request.json();

    // 🔐 STEP-UP MFA REQUIRED FOR INTEGRATION CONFIG UPDATE
    const mfaResult = await handleStepUpMfa(
      body,
      session.user.id,
      'UPDATE_INTEGRATION_KEYS',
      'IntegrationConfig',
      service
    );

    // Return MFA challenge if required
    if (mfaResult.requiresMfa) {
      return NextResponse.json({
        success: false,
        requiresMfa: true,
        challengeId: mfaResult.challengeId,
        options: mfaResult.options
      });
    }

    // Check MFA verification
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
    const validated = updateIntegrationSchema.parse(body);

    // Update integration config (will be encrypted)
    const integration = await integrationConfigService.updateConfig(
      service,
      validated.config,
      session.user.id
    );

    // Update enabled status if provided
    if (validated.isEnabled !== undefined) {
      await integrationConfigService.toggleEnabled(service, validated.isEnabled);
    }

    // Log admin action with MFA verification
    await auditService.logAdminAction(
      session.user.id,
      AUDIT_ACTIONS.INTEGRATION_UPDATED,
      AUDIT_ENTITIES.INTEGRATION_SETTING,
      integration.id,
      {},
      {},
      {
        service,
        isEnabled: validated.isEnabled,
        mfaVerified: true
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        ...integration,
        config: undefined // Don't return config in response
      }
    });
  } catch (error) {
    console.error('Update integration error:', error);

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
        error: 'Failed to update integration'
      },
      { status: 500 }
    );
  }
}






