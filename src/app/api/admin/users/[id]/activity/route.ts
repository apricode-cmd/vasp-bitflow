/**
 * GET /api/admin/users/[id]/activity
 * 
 * Fetch complete audit log for a specific user (Client Actions Log)
 * Uses userAuditLogService for consistency with /admin/audit page
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { userAuditLogService } from '@/lib/services/user-audit-log.service';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id: userId } = params;

    // Use userAuditLogService (same as /admin/audit page)
    const result = await userAuditLogService.getLogs(
      { userId }, // Filter by this specific user
      {
        page: 1,
        limit: 1000, // Get all logs for this user
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }
    );

    return NextResponse.json({
      success: true,
      data: result.logs,
    });
  } catch (error) {
    console.error('❌ Failed to fetch user activity logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch activity logs',
      },
      { status: 500 }
    );
  }
}
