/**
 * Admin Audit Statistics API
 * 
 * GET /api/admin/audit/stats - Get audit log statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { auditService } from '@/lib/services/audit.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Parse optional date range
    const searchParams = request.nextUrl.searchParams;
    const fromDateStr = searchParams.get('fromDate');
    const toDateStr = searchParams.get('toDate');

    const fromDate = fromDateStr ? new Date(fromDateStr) : undefined;
    const toDate = toDateStr ? new Date(toDateStr) : undefined;

    // Get statistics
    const stats = await auditService.getAuditStatistics(fromDate, toDate);

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get audit statistics error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve audit statistics'
      },
      { status: 500 }
    );
  }
}
