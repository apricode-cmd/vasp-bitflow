// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Integration Test API Route
 * 
 * POST /api/admin/integrations/[service]/test - Test specific integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { testIntegrationConnection } from '@/lib/services/integration-management.service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ service: string }> }
): Promise<NextResponse> {
  try {
    // Check admin authentication (custom JWT-based auth)
    console.log('🔐 Checking admin auth for integration test...');
    const authResult = await requireAdminRole('ADMIN');
    
    // If session is NextResponse, it's an error (401/403)
    if (authResult instanceof NextResponse) {
      console.error('❌ Admin auth failed');
      return authResult;
    }
    const { session } = authResult;

    console.log('✅ Admin auth passed, user:', session.user.email, 'id:', session.user.id);

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
