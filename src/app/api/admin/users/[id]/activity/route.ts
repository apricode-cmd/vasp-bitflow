/**
 * User Activity History API
 * 
 * GET /api/admin/users/[id]/activity - Get user's activity history
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { auditService } from '@/lib/services/audit.service';
import { z } from 'zod';

const activityQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(200).optional().default(100)
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id: userId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query
    const query = {
      limit: searchParams.get('limit') || undefined
    };

    const validated = activityQuerySchema.parse(query);

    // Get user activity from audit logs
    const activity = await auditService.getUserActivity(userId, validated.limit);

    return NextResponse.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Get user activity error:', error);

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
        error: 'Failed to retrieve user activity'
      },
      { status: 500 }
    );
  }
}





