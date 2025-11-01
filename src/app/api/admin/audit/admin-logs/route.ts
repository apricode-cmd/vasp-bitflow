/**
 * Admin Audit Logs API
 * GET /api/admin/audit/admin-logs - Retrieve admin action logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { adminAuditLogService } from '@/lib/services/admin-audit-log.service';
import { z } from 'zod';

const querySchema = z.object({
  adminId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
  isReviewable: z.coerce.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export async function GET(request: NextRequest) {
  try {
    // Require admin authorization
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query: any = {};
    searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const validated = querySchema.parse(query);

    // Build filters
    const filters: any = {
      adminId: validated.adminId,
      action: validated.action,
      entityType: validated.entityType,
      severity: validated.severity,
      isReviewable: validated.isReviewable,
      search: validated.search,
    };

    if (validated.dateFrom) {
      filters.dateFrom = new Date(validated.dateFrom);
    }
    if (validated.dateTo) {
      filters.dateTo = new Date(validated.dateTo);
    }

    // Calculate page from offset if provided
    const page = validated.offset !== undefined 
      ? Math.floor(validated.offset / validated.limit) + 1 
      : validated.page;

    // Fetch logs
    const result = await adminAuditLogService.getLogs(filters, {
      page,
      limit: validated.limit,
      sortBy: validated.sortBy,
      sortOrder: validated.sortOrder,
    });

    return NextResponse.json({
      success: true,
      logs: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('❌ Fetch admin logs error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch admin logs' },
      { status: 500 }
    );
  }
}

