/**
 * Integration Test API Route
 * 
 * POST /api/admin/integrations/[service]/test - Test specific integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { testIntegrationConnection } from '@/lib/services/integration-management.service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ service: string }> }
): Promise<NextResponse> {
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

    const params = await context.params;
    const { service } = params;

    if (!service) {
      return NextResponse.json(
        { error: 'Service parameter is required' },
        { status: 400 }
      );
    }

    // Test integration using management service
    const result = await testIntegrationConnection(service, session.user.id);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      status: result.status
    });
  } catch (error: any) {
    console.error(`Failed to test integration:`, error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to test integration',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
