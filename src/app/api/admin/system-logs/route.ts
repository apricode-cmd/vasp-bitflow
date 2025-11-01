/**
 * System Logs API
 * GET /api/admin/system-logs - Retrieve system logs with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { systemLogService } from '@/lib/services/system-log.service';
import { z } from 'zod';

const systemLogFiltersSchema = z.object({
  source: z.string().optional(),
  eventType: z.string().optional(),
  level: z.string().optional(),
  endpoint: z.string().optional(),
  search: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional()
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      source: searchParams.get('source') || undefined,
      eventType: searchParams.get('eventType') || undefined,
      level: searchParams.get('level') || undefined,
      endpoint: searchParams.get('endpoint') || undefined,
      search: searchParams.get('search') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined
    };

    // Validate parameters
    const validated = systemLogFiltersSchema.parse(params);

    // Convert date strings to Date objects
    const filters = {
      ...validated,
      fromDate: validated.fromDate ? new Date(validated.fromDate) : undefined,
      toDate: validated.toDate ? new Date(validated.toDate) : undefined
    };

    // Get system logs
    const result = await systemLogService.getSystemLogs(filters);

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0
      }
    });
  } catch (error) {
    console.error('Get system logs error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve system logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

