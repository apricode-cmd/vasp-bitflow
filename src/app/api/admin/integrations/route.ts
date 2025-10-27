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

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin authentication
    const authResult = await requireRole('ADMIN');
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const { service, updates } = body;

    if (!service || !updates) {
      return NextResponse.json(
        { error: 'Service and updates are required' },
        { status: 400 }
      );
    }

    // Update or create integration
    const integration = await prisma.integration.upsert({
      where: { service },
      update: {
        isEnabled: updates.isEnabled,
        status: updates.status,
        apiKey: updates.apiKey,
        apiEndpoint: updates.apiEndpoint,
        lastTested: updates.lastTested ? new Date(updates.lastTested) : null,
        config: updates.config,
        rates: updates.rates,
        updatedAt: new Date()
      },
      create: {
        service,
        isEnabled: updates.isEnabled || false,
        status: updates.status || 'inactive',
        apiKey: updates.apiKey,
        apiEndpoint: updates.apiEndpoint,
        lastTested: updates.lastTested ? new Date(updates.lastTested) : null,
        config: updates.config,
        rates: updates.rates
      }
    });

    return NextResponse.json({
      success: true,
      integration: {
        service: integration.service,
        isEnabled: integration.isEnabled,
        status: integration.status,
        apiKey: integration.apiKey,
        apiEndpoint: integration.apiEndpoint,
        lastTested: integration.lastTested,
        config: integration.config,
        rates: integration.rates
      }
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
