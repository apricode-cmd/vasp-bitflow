/**
 * Integrations API Route
 * 
 * GET /api/admin/integrations - Get all integrations
 * PUT /api/admin/integrations - Update integration settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { integrationRegistry } from '@/lib/integrations';
import { 
  updateIntegrationConfig, 
  getIntegrationForDisplay 
} from '@/lib/services/integration-management.service';
import { decrypt, maskApiKey } from '@/lib/services/encryption.service';

export async function GET(): Promise<NextResponse> {
  try {
    // Check admin authentication
    const authResult = await requireRole('ADMIN');
    if (authResult.error) {
      return authResult.error;
    }

    // Get all registered providers from registry
    const registeredProviders = integrationRegistry.getAllProviders();

    // Get configurations from database
    const dbIntegrations = await prisma.integration.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    // Merge registry data with database data
    const integrations = registeredProviders.map(provider => {
      const dbConfig = dbIntegrations.find(db => db.service === provider.providerId);

      // Mask API key for display
      let maskedApiKey = null;
      if (dbConfig?.apiKey) {
        try {
          const decrypted = decrypt(dbConfig.apiKey);
          maskedApiKey = maskApiKey(decrypted);
        } catch (error) {
          console.error('Failed to decrypt API key:', error);
        }
      }

      return {
        service: provider.providerId,
        category: provider.category,
        displayName: provider.displayName,
        description: provider.description,
        icon: provider.icon,
        isEnabled: dbConfig?.isEnabled ?? false,
        status: dbConfig?.status ?? 'inactive',
        apiKey: maskedApiKey,
        apiEndpoint: dbConfig?.apiEndpoint,
        lastTested: dbConfig?.lastTested,
        config: dbConfig?.config,
        rates: dbConfig?.rates
      };
    });

    return NextResponse.json({
      success: true,
      integrations,
      categories: integrationRegistry.getAllCategories()
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch integrations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch integrations',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin authentication
    const authResult = await requireRole('ADMIN');
    if (authResult.error) {
      return authResult.error;
    }

    const session = authResult.session;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { service, updates } = body;

    if (!service || !updates) {
      return NextResponse.json(
        { error: 'Service and updates are required' },
        { status: 400 }
      );
    }

    // Use integration management service
    const result = await updateIntegrationConfig({
      service,
      updates,
      userId: session.user.id
    });

    return NextResponse.json({
      success: true,
      integration: result.integration
    });
  } catch (error: any) {
    console.error('❌ Failed to update integration:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update integration',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
