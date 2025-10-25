/**
 * Audit Statistics API
 * 
 * GET /api/admin/audit/stats - Get audit log statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { auditService } from '@/lib/services/audit.service';
import { z } from 'zod';

const statsQuerySchema = z.object({
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional()
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
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined
    };

    // Validate
    const validated = statsQuerySchema.parse(params);

    // Get statistics
    const stats = await auditService.getAuditStatistics(
      validated.fromDate ? new Date(validated.fromDate) : undefined,
      validated.toDate ? new Date(validated.toDate) : undefined
    );

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get audit stats error:', error);

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
        error: 'Failed to retrieve audit statistics'
      },
      { status: 500 }
    );
  }
}

