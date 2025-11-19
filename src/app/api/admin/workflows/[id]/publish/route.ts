// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Workflow Publish API
 * 
 * POST /api/admin/workflows/[id]/publish - Publish workflow (DRAFT -> ACTIVE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * POST /api/admin/workflows/[id]/publish
 * Publish workflow (change status from DRAFT to ACTIVE and enable)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    // Check admin permission (SUPER_ADMIN only for publishing)
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

    console.log(`📢 [Workflow Publish API] Publishing workflow: ${id}`);

    // Check if workflow exists and is in DRAFT status
    const existing = await prisma.workflow.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true, 
        status: true,
        logicState: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: `Workflow is already ${existing.status}. Only DRAFT workflows can be published.` },
        { status: 400 }
      );
    }

    // Validate logic state (optional - ensure workflow is executable)
    // This can be skipped if validation happens on save
    
    // Publish workflow
    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        isActive: true,
        updatedBy: adminId,
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

    // Log action (with higher severity)
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.WORKFLOW_PUBLISHED,
      AUDIT_ENTITIES.WORKFLOW,
      workflow.id,
      request,
      {
        workflowName: workflow.name,
        trigger: workflow.trigger,
      },
      'HIGH' // High severity for publishing workflows
    );

    console.log(`✅ [Workflow Publish API] Workflow published: ${workflow.id}`);

    return NextResponse.json({
      success: true,
      workflow,
      message: 'Workflow published successfully',
    });
  } catch (error: any) {
    console.error(`❌ [Workflow Publish API] Error publishing workflow ${params.id}:`, error);

    return NextResponse.json(
      { success: false, error: 'Failed to publish workflow' },
      { status: 500 }
    );
  }
}

