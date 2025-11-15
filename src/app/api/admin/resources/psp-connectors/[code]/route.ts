// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * PSP Connector by Code API
 * GET: Get single connector
 * PUT: Update connector
 * DELETE: Delete connector
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS } from '@/lib/services/audit.service';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  settlementCurrency: z.string().optional(),
  apiConfig: z.record(z.any()).optional(),
  isEnabled: z.boolean().optional(),
  status: z.string().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
): Promise<NextResponse> {
  try {
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const connector = await prisma.pspConnector.findUnique({
      where: { code: params.code }
    });

    if (!connector) {
      return NextResponse.json(
        { success: false, error: 'PSP Connector not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: connector });
  } catch (error) {
    console.error('Error fetching PSP connector:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PSP connector' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { code: string } }
): Promise<NextResponse> {
  try {
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const body = await request.json();
    const validated = updateSchema.parse(body);

    // Get existing connector for audit
    const existingConnector = await prisma.pspConnector.findUnique({
      where: { code: params.code }
    });

    if (!existingConnector) {
      return NextResponse.json(
        { success: false, error: 'PSP Connector not found' },
        { status: 404 }
      );
    }

    const updatedConnector = await prisma.pspConnector.update({
      where: { code: params.code },
      data: validated
    });

    // Audit log
    const adminId = await getCurrentUserId();
    if (adminId) {
      await auditService.logAdminAction(
        adminId,
        AUDIT_ACTIONS.SETTINGS_UPDATED,
        'PspConnector',
        params.code,
        existingConnector,
        updatedConnector
      );
    }

    return NextResponse.json({ success: true, data: updatedConnector });
  } catch (error) {
    console.error('Error updating PSP connector:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update PSP connector' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { code: string } }
): Promise<NextResponse> {
  try {
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    // Check if connector exists
    const connector = await prisma.pspConnector.findUnique({
      where: { code: params.code },
      include: {
        _count: {
          select: {
            paymentMethods: true
          }
        }
      }
    });

    if (!connector) {
      return NextResponse.json(
        { success: false, error: 'PSP Connector not found' },
        { status: 404 }
      );
    }

    // Prevent deletion if there are related payment methods
    if (connector._count.paymentMethods > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete PSP connector with ${connector._count.paymentMethods} related payment methods. Disable it instead.` 
        },
        { status: 400 }
      );
    }

    await prisma.pspConnector.delete({
      where: { code: params.code }
    });

    // Audit log
    const adminId = await getCurrentUserId();
    if (adminId) {
      await auditService.logAdminAction(
        adminId,
        AUDIT_ACTIONS.SETTINGS_UPDATED,
        'PspConnector',
        params.code,
        connector,
        null
      );
    }

    return NextResponse.json({
      success: true,
      message: 'PSP Connector deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting PSP connector:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete PSP connector' },
      { status: 500 }
    );
  }
}

