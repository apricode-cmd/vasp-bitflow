// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Orders Bulk Actions API
 * POST /api/admin/orders/bulk - Perform bulk operations on orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { CacheService } from '@/lib/services/cache.service';
import { z } from 'zod';

const bulkActionSchema = z.object({
  action: z.enum(['cancel', 'export', 'approve', 'assign']),
  orderIds: z.array(z.string()).min(1, 'At least one order must be selected'),
  assignTo: z.string().optional() // For assign action
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check admin authorization  
  const authResult = await requireAdminRole('ADMIN');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const adminId = authResult.session.user.id;

  try {
    const body = await request.json();
    const validated = bulkActionSchema.parse(body);

    const { action, orderIds, assignTo } = validated;

    const result: any = { success: true, processed: 0, failed: 0, errors: [] };

    switch (action) {
      case 'cancel':
        // Bulk cancel orders
        const cancelResult = await prisma.order.updateMany({
          where: {
            id: { in: orderIds },
            status: { notIn: ['COMPLETED', 'CANCELLED'] } // Can't cancel these
          },
          data: {
            status: 'CANCELLED',
            processedBy: adminId,
            processedAt: new Date()
          }
        });

        result.processed = cancelResult.count;
        result.failed = orderIds.length - cancelResult.count;

        // Log bulk cancel
        await auditService.logAdminAction(
          adminId,
          AUDIT_ACTIONS.ORDER_STATUS_CHANGED,
          AUDIT_ENTITIES.ORDER,
          null,
          {},
          {
            action: 'bulk_cancel',
            orderIds,
            count: cancelResult.count
          }
        );
        break;

      case 'approve':
        // Bulk approve orders (mark as PAYMENT_RECEIVED)
        const approveResult = await prisma.order.updateMany({
          where: {
            id: { in: orderIds },
            status: 'PAYMENT_PENDING'
          },
          data: {
            status: 'PAYMENT_RECEIVED',
            processedBy: adminId,
            processedAt: new Date()
          }
        });

        result.processed = approveResult.count;
        result.failed = orderIds.length - approveResult.count;

        // Log bulk approve
        await auditService.logAdminAction(
          adminId,
          AUDIT_ACTIONS.ORDER_STATUS_CHANGED,
          AUDIT_ENTITIES.ORDER,
          null,
          {},
          {
            action: 'bulk_approve',
            orderIds,
            count: approveResult.count
          }
        );
        break;

      case 'assign':
        if (!assignTo) {
          return NextResponse.json(
            { error: 'assignTo is required for assign action' },
            { status: 400 }
          );
        }

        // Bulk assign orders to admin
        const assignResult = await prisma.order.updateMany({
          where: {
            id: { in: orderIds }
          },
          data: {
            processedBy: assignTo
          }
        });

        result.processed = assignResult.count;

        // Log bulk assign
        await auditService.logAdminAction(
          adminId,
          'ORDER_ASSIGNED',
          AUDIT_ENTITIES.ORDER,
          null,
          {},
          {
            action: 'bulk_assign',
            orderIds,
            assignedTo: assignTo,
            count: assignResult.count
          }
        );
        break;

      case 'export':
        // Export will be handled client-side, just return success
        result.message = 'Export data prepared';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Clear cache after bulk action
    await CacheService.clearAdminStats();
    await CacheService.clearPattern('admin:orders:*');

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Orders Bulk API] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to perform bulk action' },
      { status: 500 }
    );
  }
}

