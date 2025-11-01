/**
 * Audit Logs Statistics API
 * 
 * GET - Get audit log statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/middleware/admin-auth';
import { auditLogService } from '@/lib/services/audit-log.service';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminPermission('audit', 'read');
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    const statistics = await auditLogService.getStatistics(startDate, endDate);

    return NextResponse.json({
      success: true,
      statistics,
    });
  } catch (error) {
    console.error('❌ Get audit statistics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
