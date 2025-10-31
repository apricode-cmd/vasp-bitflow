/**
 * Admin Audit Logs API
 * 
 * GET /api/admin/audit - Retrieve audit logs with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { auditService } from '@/lib/services/audit.service';
import { z } from 'zod';

const auditFiltersSchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  entityId: z.string().optional(),
  ipAddress: z.string().optional(),
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
      userId: searchParams.get('userId') || undefined,
      action: searchParams.get('action') || undefined,
      entity: searchParams.get('entity') || undefined,
      entityId: searchParams.get('entityId') || undefined,
      ipAddress: searchParams.get('ipAddress') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined
    };

    // Validate parameters
    const validated = auditFiltersSchema.parse(params);

    // Convert date strings to Date objects
    const filters = {
      ...validated,
      fromDate: validated.fromDate ? new Date(validated.fromDate) : undefined,
      toDate: validated.toDate ? new Date(validated.toDate) : undefined
    };

    // Get audit logs
    const result = await auditService.getAuditLogs(filters);

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
    console.error('Get audit logs error:', error);

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
        error: 'Failed to retrieve audit logs'
      },
      { status: 500 }
    );
  }
}

