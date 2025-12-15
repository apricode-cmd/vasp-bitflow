/**
 * Admin API - Virtual IBAN Statistics
 * 
 * GET /api/admin/virtual-iban/statistics - Get dashboard statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { virtualIbanService } from '@/lib/services/virtual-iban.service';

// Force dynamic rendering (uses headers for auth)
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check admin permission
    const result = await requireAdminRole('ADMIN');
    if (result instanceof NextResponse) {
      return result;
    }
    const { session } = result;

    // Get statistics
    const stats = await virtualIbanService.getStatistics();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[API] Get Virtual IBAN statistics failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

