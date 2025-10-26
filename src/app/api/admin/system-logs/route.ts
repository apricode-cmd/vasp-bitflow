/**
 * System Logs API
 * GET /api/admin/system-logs - Retrieve system logs with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { systemLogService } from '@/lib/services/system-log.service';
import { z } from 'zod';

const systemLogFiltersSchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  ipAddress: z.string().optional(),
  deviceType: z.string().optional(),
  isBot: z.coerce.boolean().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional()
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      userId: searchParams.get('userId') || undefined,
      action: searchParams.get('action') || undefined,
      ipAddress: searchParams.get('ipAddress') || undefined,
      deviceType: searchParams.get('deviceType') || undefined,
      isBot: searchParams.get('isBot') || undefined,
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

