/**
 * GET /api/admin/debug/sumsub-config
 * 
 * Debug endpoint to check Sumsub configuration
 * (REMOVE in production after debugging!)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check admin auth
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Sumsub integration from DB
    const integration = await prisma.integration.findFirst({
      where: {
        service: 'sumsub',
        isEnabled: true
      },
      select: {
        id: true,
        service: true,
        isEnabled: true,
        status: true,
        config: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!integration) {
      return NextResponse.json({
        error: 'Sumsub integration not found or not enabled'
      }, { status: 404 });
    }

    const config = integration.config as any;

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        service: integration.service,
        isEnabled: integration.isEnabled,
        status: integration.status,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt
      },
      config: {
        hasAppToken: !!config?.appToken,
        appTokenPreview: config?.appToken ? config.appToken.substring(0, 15) + '...' : 'N/A',
        
        hasSecretKey: !!config?.secretKey,
        secretKeyPreview: config?.secretKey ? config.secretKey.substring(0, 8) + '...' : 'N/A',
        secretKeyLength: config?.secretKey?.length || 0,
        secretKeyFull: config?.secretKey || 'N/A', // ⚠️ ONLY FOR DEBUG
        
        hasWebhookSecret: !!config?.webhookSecret,
        webhookSecretPreview: config?.webhookSecret ? config.webhookSecret.substring(0, 8) + '...' : 'N/A',
        webhookSecretLength: config?.webhookSecret?.length || 0,
        webhookSecretFull: config?.webhookSecret || 'N/A', // ⚠️ ONLY FOR DEBUG
        
        hasLevelName: !!config?.levelName,
        levelName: config?.levelName || 'N/A',
        
        allKeys: Object.keys(config || {})
      },
      warning: '⚠️ This endpoint exposes sensitive data! Remove after debugging.'
    });

  } catch (error: any) {
    console.error('❌ Error fetching Sumsub config:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

