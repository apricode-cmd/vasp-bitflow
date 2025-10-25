/**
 * Integration Test API Route
 * 
 * POST /api/admin/integrations/[service]/test - Test specific integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { service: string } }
): Promise<NextResponse> {
  try {
    // Check admin authentication
    const session = await requireRole('ADMIN');
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { service } = params;

    // Route to specific service test
    if (service === 'coingecko') {
      const response = await fetch(`${request.nextUrl.origin}/api/admin/integrations/coingecko/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return NextResponse.json(await response.json());
    }

    // Default test for other services
    return NextResponse.json({
      success: true,
      message: `${service} connection test successful (simulated)`
    });
  } catch (error: any) {
    console.error(`Failed to test ${params.service}:`, error);
    return NextResponse.json(
      { error: `Failed to test ${params.service}` },
      { status: 500 }
    );
  }
}