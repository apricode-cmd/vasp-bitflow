/**
 * Entity Audit Trail API
 * 
 * GET /api/admin/audit/[entity]/[entityId] - Get audit trail for specific entity
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { auditService } from '@/lib/services/audit.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; entityId: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { entity, entityId } = await params;

    // Get audit trail
    const trail = await auditService.getEntityAuditTrail(entity, entityId);

    return NextResponse.json({
      success: true,
      data: trail
    });
  } catch (error) {
    console.error('Get entity audit trail error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve audit trail'
      },
      { status: 500 }
    );
  }
}



