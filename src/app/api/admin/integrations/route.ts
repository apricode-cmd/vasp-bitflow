/**
 * Integrations API Route
 * 
 * GET /api/admin/integrations - Get all integrations
 * PUT /api/admin/integrations - Update integration settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(): Promise<NextResponse> {
  try {
    console.log('🔍 Fetching integrations from database...');
    
    // Check admin authentication
    try {
      const authResult = await requireRole('ADMIN');
      console.log('🔐 Auth result:', JSON.stringify(authResult, null, 2));
      
      if (authResult.error) {
        console.log('❌ Unauthorized access to integrations');
        return authResult.error;
      }
      const session = authResult.session;
      console.log('✅ Session found:', session?.user?.email);
    } catch (error) {
      console.error('❌ Auth error:', error);
      return NextResponse.json(
        { error: 'Authentication failed', details: error.message },
        { status: 401 }
      );
    }

    // Get all integrations from database
    const integrations = await prisma.integration.findMany({
      orderBy: { service: 'asc' }
    });
    
    console.log('📊 Found integrations:', integrations.length);

    // Convert to the expected format
    const integrationsMap: Record<string, any> = {};
    
    integrations.forEach(integration => {
      integrationsMap[integration.service] = {
        service: integration.service,
        isEnabled: integration.isEnabled,
        status: integration.status,
        apiKey: integration.apiKey,
        apiEndpoint: integration.apiEndpoint,
        lastTested: integration.lastTested,
        config: integration.config,
        rates: integration.rates
      };
    });

    // Ensure default integrations exist
    const defaultIntegrations = {
      coingecko: {
        service: 'coingecko',
        isEnabled: false,
        status: 'inactive',
        apiEndpoint: 'https://api.coingecko.com/api/v3'
      },
      kycaid: {
        service: 'kycaid',
        isEnabled: false,
        status: 'inactive',
        apiEndpoint: 'https://api.kycaid.com'
      },
      resend: {
        service: 'resend',
        isEnabled: false,
        status: 'inactive'
      }
    };

    // Merge with defaults
    Object.keys(defaultIntegrations).forEach(service => {
      if (!integrationsMap[service]) {
        integrationsMap[service] = defaultIntegrations[service as keyof typeof defaultIntegrations];
      }
    });

    return NextResponse.json({
      success: true,
      integrations: Object.values(integrationsMap)
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch integrations:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
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
    console.log('💾 Updating integration...');
    
    // Check admin authentication
    try {
      const authResult = await requireRole('ADMIN');
      console.log('🔐 Auth result:', JSON.stringify(authResult, null, 2));
      
      if (authResult.error) {
        console.log('❌ Unauthorized access to update integration');
        return authResult.error;
      }
      const session = authResult.session;
      console.log('✅ Session found:', session?.user?.email);
    } catch (error) {
      console.error('❌ Auth error:', error);
      return NextResponse.json(
        { error: 'Authentication failed', details: error.message },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { service, updates } = body;
    
    console.log('📝 Service:', service, 'Updates:', updates);

    if (!service || !updates) {
      console.log('❌ Missing service or updates');
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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return NextResponse.json(
      { 
        error: 'Failed to update integration',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}