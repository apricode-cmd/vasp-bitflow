/**
 * User Audit Logs API
 * GET /api/admin/audit/user-logs - Retrieve user (client) action logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { userAuditLogService } from '@/lib/services/user-audit-log.service';
import { z } from 'zod';

const querySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
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
      userId: validated.userId,
      action: validated.action,
      entityType: validated.entityType,
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
    const result = await userAuditLogService.getLogs(filters, {
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
    console.error('❌ Fetch user logs error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch user logs',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
      },
      { status: 500 }
    );
  }
}

