// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Workflow Executions API
 * 
 * GET /api/admin/workflows/[id]/executions - Get execution history for workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/auth-admin';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/admin/workflows/[id]/executions
 * Get execution history with pagination
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    // Check admin permission
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const authResult = { admin: session.admin };
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);

    // Parse query params
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 50;
    const success = searchParams.get('success');
    const entityType = searchParams.get('entityType');

    // Build where clause
    const where: any = {
      workflowId: id,
    };

    if (success !== null && success !== undefined) {
      where.success = success === 'true';
    }

    if (entityType) {
      where.entityType = entityType;
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Fetch executions
    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          executedAt: 'desc',
        },
        select: {
          id: true,
          trigger: true,
          contextData: true,
          success: true,
          result: true,
          error: true,
          executionTimeMs: true,
          executedAt: true,
          entityType: true,
          entityId: true,
        },
      }),
      prisma.workflowExecution.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Calculate stats
    const stats = await prisma.workflowExecution.groupBy({
      by: ['success'],
      where: { workflowId: id },
      _count: {
        success: true,
      },
    });

    const successCount = stats.find(s => s.success)?._count.success || 0;
    const failureCount = stats.find(s => !s.success)?._count.success || 0;

    // Calculate average execution time
    const avgExecution = await prisma.workflowExecution.aggregate({
      where: { workflowId: id },
      _avg: {
        executionTimeMs: true,
      },
    });

    return NextResponse.json({
      success: true,
      executions,
      stats: {
        total,
        successCount,
        failureCount,
        avgExecutionTimeMs: avgExecution._avg.executionTimeMs || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error(`❌ [Workflow Executions API] Error fetching executions for workflow ${params.id}:`, error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch execution history' },
      { status: 500 }
    );
  }
}

