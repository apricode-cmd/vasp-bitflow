// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * BCB Group Virtual IBAN Integration Setup
 *
 * Simple OAuth authentication:
 * - client_id
 * - client_secret
 * - counterparty_id (for API requests)
 * 
 * Auth URL: https://auth.bcb.group/oauth/token (production)
 *           https://auth.uat.bcb.group/oauth/token (sandbox)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/services/encryption.service';
import { z } from 'zod';

const bcbGroupConfigSchema = z.object({
  sandbox: z.boolean().default(true),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
  counterpartyId: z.string().min(1, 'Counterparty ID is required'),
});

export async function POST(req: NextRequest) {
  try {
    // Check admin permissions
    const { error, session } = await requireAdminRole();
    if (error) return error;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate input
    const validatedData = bcbGroupConfigSchema.parse(body);

    // API URLs based on environment
    const baseUrl = validatedData.sandbox 
      ? 'https://api.uat.bcb.group' 
      : 'https://api.bcb.group';
    
    const authUrl = validatedData.sandbox
      ? 'https://auth.uat.bcb.group/oauth/token'
      : 'https://auth.bcb.group/oauth/token';

    // ✅ Prepare credentials to encrypt (all sensitive data)
    const credentials = {
      clientId: validatedData.clientId,
      clientSecret: validatedData.clientSecret,
      counterpartyId: validatedData.counterpartyId,
    };

    // ✅ Encrypt credentials as JSON
    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    // ✅ Prepare config object (includes ALL fields for Admin UI display)
    const config = {
      sandbox: validatedData.sandbox,
      clientId: validatedData.clientId,
      clientSecret: validatedData.clientSecret, // ✅ Plain text for UI
      counterpartyId: validatedData.counterpartyId,
      baseUrl,
      authUrl,
      audience: baseUrl,
    };

    // Upsert integration in database
    const integration = await prisma.integration.upsert({
      where: {
        service: 'BCB_GROUP_VIRTUAL_IBAN',
      },
      update: {
        isEnabled: true,
        status: 'active',
        apiEndpoint: baseUrl,
        config,
        apiKey: encryptedCredentials, // ✅ Encrypted JSON with all credentials
        updatedAt: new Date(),
      },
      create: {
        service: 'BCB_GROUP_VIRTUAL_IBAN',
        category: 'VIRTUAL_IBAN',
        isEnabled: true,
        status: 'active',
        apiEndpoint: baseUrl,
        config,
        apiKey: encryptedCredentials, // ✅ Encrypted JSON with all credentials
      },
    });

    console.log(`✅ BCB Group integration configured by admin: ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'BCB Group integration configured successfully',
      data: {
        service: integration.service,
        status: integration.status,
        isEnabled: integration.isEnabled,
        apiEndpoint: integration.apiEndpoint,
        config: {
          sandbox: validatedData.sandbox,
          clientId: validatedData.clientId,
          counterpartyId: validatedData.counterpartyId,
          baseUrl,
          authUrl,
        },
      },
    });
  } catch (error) {
    console.error('[API] BCB Group integration setup failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to configure BCB Group integration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get BCB Group integration status
 */
export async function GET(req: NextRequest) {
  try {
    // Check admin permissions
    const { error, session } = await requireAdminRole();
    if (error) return error;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integration = await prisma.integration.findUnique({
      where: { service: 'BCB_GROUP_VIRTUAL_IBAN' },
      select: {
        id: true,
        service: true,
        category: true,
        isEnabled: true,
        status: true,
        apiEndpoint: true,
        config: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!integration) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'BCB Group integration not configured',
      });
    }

    // Return config without sensitive encrypted data
    const config = integration.config as Record<string, unknown>;
    const safeConfig = {
      sandbox: config.sandbox,
      clientId: config.clientId,
      counterpartyId: config.counterpartyId,
      baseUrl: config.baseUrl,
      authUrl: config.authUrl,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...integration,
        config: safeConfig,
      },
    });
  } catch (error) {
    console.error('[API] Get BCB Group integration failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BCB Group integration' },
      { status: 500 }
    );
  }
}
