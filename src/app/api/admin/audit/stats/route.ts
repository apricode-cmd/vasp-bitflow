/**
 * Audit Logs Statistics API
 * 
 * GET - Get audit log statistics from AdminAuditLog and UserAuditLog
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/middleware/admin-auth';
import { adminAuditLogService } from '@/lib/services/admin-audit-log.service';
import { userAuditLogService } from '@/lib/services/user-audit-log.service';

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic';

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

    // Get statistics from both tables
    const [adminStats, userStats] = await Promise.all([
      adminAuditLogService.getStats(startDate, endDate),
      userAuditLogService.getStats(startDate, endDate),
    ]);

    // Combine statistics
    const statistics = {
      admin: adminStats,
      user: userStats,
      combined: {
        totalActions: adminStats.totalActions + userStats.totalActions,
      },
    };

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
