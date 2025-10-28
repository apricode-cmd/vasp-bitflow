/**
 * API Key Usage Statistics API
 * 
 * GET /api/admin/api-keys/[id]/usage - Get API key usage statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { apiKeyService } from '@/lib/services/api-key.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;

    // Get usage statistics
    const stats = await apiKeyService.getUsageStats(id);

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get API key usage error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve usage statistics'
      },
      { status: 500 }
    );
  }
}




