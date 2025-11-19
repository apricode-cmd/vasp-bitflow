// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Workflow Management API
 * 
 * GET  /api/admin/workflows - List all workflows with filters
 * POST /api/admin/workflows - Create new workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import {
  createWorkflowSchema,
  workflowFiltersSchema,
  type CreateWorkflowInput,
  type WorkflowFiltersInput,
} from '@/lib/validations/workflow';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

/**
 * GET /api/admin/workflows
 * List all workflows with filters and pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission (SUPER_ADMIN or COMPLIANCE)
    const authResult = await requireAdminRole(['SUPER_ADMIN', 'COMPLIANCE']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    
    const triggerParam = searchParams.get('trigger');
    const statusParam = searchParams.get('status');
    const sortByParam = searchParams.get('sortBy');
    const sortOrderParam = searchParams.get('sortOrder');
    
    const filters: Partial<WorkflowFiltersInput> = {
      trigger: triggerParam ? (triggerParam as any) : undefined,
      status: statusParam ? (statusParam as any) : undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      search: searchParams.get('search') || undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
      sortBy: sortByParam ? (sortByParam as any) : 'createdAt',
      sortOrder: sortOrderParam ? (sortOrderParam as any) : 'desc',
    };

    // Validate filters
    const validated = workflowFiltersSchema.parse(filters);

    // Build where clause
    const where: any = {};

    if (validated.trigger) {
      where.trigger = validated.trigger;
    }

    if (validated.status) {
      where.status = validated.status;
    }

    if (validated.isActive !== undefined) {
      where.isActive = validated.isActive;
    }

    if (validated.search) {
      where.OR = [
        { name: { contains: validated.search, mode: 'insensitive' } },
        { description: { contains: validated.search, mode: 'insensitive' } },
      ];
    }

    // Pagination
    const skip = (validated.page - 1) * validated.limit;

    // Fetch workflows
    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        skip,
        take: validated.limit,
        orderBy: {
          [validated.sortBy]: validated.sortOrder,
        },
        select: {
          id: true,
          name: true,
          description: true,
          trigger: true,
          status: true,
          isActive: true,
          priority: true,
          version: true,
          executionCount: true,
          lastExecutedAt: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              workEmail: true,
            },
          },
        },
      }),
      prisma.workflow.count({ where }),
    ]);

    const totalPages = Math.ceil(total / validated.limit);

    return NextResponse.json({
      success: true,
      workflows,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('❌ [Workflows API] Error fetching workflows:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid filter parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/workflows
 * Create new workflow
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission (SUPER_ADMIN or COMPLIANCE)
    const authResult = await requireAdminRole(['SUPER_ADMIN', 'COMPLIANCE']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const session = authResult.session;
    const adminId = session?.user?.id;

    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID not found in session' },
        { status: 401 }
      );
    }

    // Parse body
    const body = await request.json();

    // Validate input
    const validated: CreateWorkflowInput = createWorkflowSchema.parse(body);

    console.log(`📝 [Workflows API] Creating workflow: ${validated.name}`);

    // Create workflow
    const workflow = await prisma.workflow.create({
      data: {
        name: validated.name,
        description: validated.description,
        trigger: validated.trigger,
        triggerConfig: validated.triggerConfig || null,
        visualState: validated.visualState as any,
        logicState: validated.logicState as any,
        priority: validated.priority || 0,
        status: 'DRAFT', // Always start as draft
        isActive: false, // Must be published to activate
        createdBy: adminId,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workEmail: true,
          },
        },
      },
    });

    // Log action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.WORKFLOW_CREATED,
      AUDIT_ENTITIES.WORKFLOW,
      workflow.id,
      request,
      {
        workflowName: workflow.name,
        trigger: workflow.trigger,
        priority: workflow.priority,
      }
    );

    console.log(`✅ [Workflows API] Workflow created: ${workflow.id}`);

    return NextResponse.json({
      success: true,
      workflow,
    }, { status: 201 });
  } catch (error: any) {
    console.error('❌ [Workflows API] Error creating workflow:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid workflow data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}

