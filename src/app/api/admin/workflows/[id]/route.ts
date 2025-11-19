// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Single Workflow API
 * 
 * GET    /api/admin/workflows/[id] - Get workflow details
 * PATCH  /api/admin/workflows/[id] - Update workflow
 * DELETE /api/admin/workflows/[id] - Archive workflow (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import {
  updateWorkflowSchema,
  type UpdateWorkflowInput,
} from '@/lib/validations/workflow';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/admin/workflows/[id]
 * Get workflow details including visual and logic state
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    // Check admin permission
    const authResult = await requireAdminRole(['SUPER_ADMIN', 'COMPLIANCE']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = params;

    // Fetch workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workEmail: true,
          },
        },
        updater: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workEmail: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
            version: true,
          },
        },
        versions: {
          select: {
            id: true,
            name: true,
            version: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            version: 'desc',
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (error: any) {
    console.error(`❌ [Workflow API] Error fetching workflow ${params.id}:`, error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/workflows/[id]
 * Update workflow
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    // Check admin permission
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

    const { id } = params;

    // Parse body
    const body = await request.json();

    // Validate input
    const validated: UpdateWorkflowInput = updateWorkflowSchema.parse(body);

    console.log(`📝 [Workflow API] Updating workflow: ${id}`);

    // Check if workflow exists
    const existing = await prisma.workflow.findUnique({
      where: { id },
      select: { id: true, status: true, isActive: true, name: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // If activating workflow, deactivate other workflows with same trigger (optional logic)
    // This ensures only one workflow per trigger is active at a time (if desired)
    // Comment out if multiple workflows per trigger are allowed
    
    // Prepare update data
    const updateData: any = {
      ...validated,
      updatedBy: adminId,
    };

    // Update workflow
    const workflow = await prisma.workflow.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workEmail: true,
          },
        },
        updater: {
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
      AUDIT_ACTIONS.WORKFLOW_UPDATED,
      AUDIT_ENTITIES.WORKFLOW,
      workflow.id,
      request,
      {
        workflowName: workflow.name,
        changes: validated,
      }
    );

    console.log(`✅ [Workflow API] Workflow updated: ${workflow.id}`);

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (error: any) {
    console.error(`❌ [Workflow API] Error updating workflow ${params.id}:`, error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid update data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/workflows/[id]
 * Archive workflow (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    // Check admin permission (SUPER_ADMIN only for deletion)
    const authResult = await requireAdminRole('SUPER_ADMIN');
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

    const { id } = params;

    console.log(`🗑️ [Workflow API] Archiving workflow: ${id}`);

    // Check if workflow exists
    const existing = await prisma.workflow.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Archive workflow (soft delete)
    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        isActive: false,
        updatedBy: adminId,
      },
    });

    // Log action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.WORKFLOW_DELETED,
      AUDIT_ENTITIES.WORKFLOW,
      workflow.id,
      request,
      {
        workflowName: workflow.name,
      }
    );

    console.log(`✅ [Workflow API] Workflow archived: ${workflow.id}`);

    return NextResponse.json({
      success: true,
      message: 'Workflow archived successfully',
    });
  } catch (error: any) {
    console.error(`❌ [Workflow API] Error archiving workflow ${params.id}:`, error);

    return NextResponse.json(
      { success: false, error: 'Failed to archive workflow' },
      { status: 500 }
    );
  }
}

