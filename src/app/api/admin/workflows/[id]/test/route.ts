// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Workflow Test API
 * 
 * POST /api/admin/workflows/[id]/test - Test workflow with sample data (dry run)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/admin-auth-utils';
import { WorkflowExecutor } from '@/lib/services/workflow-executor.service';
import {
  testWorkflowSchema,
  type TestWorkflowInput,
} from '@/lib/validations/workflow';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * POST /api/admin/workflows/[id]/test
 * Test workflow with sample context data (dry run)
 */
export async function POST(
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

    // Parse body
    const body = await request.json();

    // Validate input
    const validated: TestWorkflowInput = testWorkflowSchema.parse(body);

    console.log(`🧪 [Workflow Test API] Testing workflow: ${id}`);

    // Execute workflow in test mode (dry run)
    const result = await WorkflowExecutor.test(id, validated.contextData);

    console.log(`✅ [Workflow Test API] Test complete:`, result);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error(`❌ [Workflow Test API] Error testing workflow ${params.id}:`, error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid test data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to test workflow' },
      { status: 500 }
    );
  }
}

