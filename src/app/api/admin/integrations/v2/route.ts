/**
 * Integrations API Route V2
 * 
 * Enhanced API with integration registry support
 * GET /api/admin/integrations/v2 - Get all integrations with registry info
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { integrationRegistry } from '@/lib/integrations';

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

      return {
        service: provider.providerId,
        category: provider.category,
        displayName: provider.displayName,
        description: provider.description,
        icon: provider.icon,
        isEnabled: dbConfig?.isEnabled ?? false,
        status: dbConfig?.status ?? 'inactive',
        apiKey: dbConfig?.apiKey,
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

