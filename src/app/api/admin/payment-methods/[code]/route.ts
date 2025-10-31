/**
 * Payment Method by Code API
 * PUT: Update payment method
 * DELETE: Delete payment method
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { paymentMethodService } from '@/lib/services/payment-method.service';
import { updatePaymentMethodSchema } from '@/lib/validations/payment-method';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { code: string } }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const body = await request.json();

    // Validate
    const validated = updatePaymentMethodSchema.parse(body);

    // Get admin ID
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Get existing method for audit
    const existingMethod = await prisma.paymentMethod.findUnique({
      where: { code: params.code },
    });

    if (!existingMethod) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment method not found'
        },
        { status: 404 }
      );
    }

    // Update payment method
    const method = await paymentMethodService.updateMethod(params.code, validated);

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.PAYMENT_METHOD_UPDATED,
      AUDIT_ENTITIES.PAYMENT_METHOD,
      method.code,
      existingMethod,
      method
    );

    return NextResponse.json({
      success: true,
      data: method
    });
  } catch (error) {
    console.error('Update payment method error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update payment method'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { code: string } }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Get admin ID
    const adminId = await getCurrentUserId();
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Check if method exists and has dependencies
    const method = await prisma.paymentMethod.findUnique({
      where: { code: params.code },
      include: {
        _count: {
          select: {
            orders: true,
            payIns: true,
            payOuts: true,
            limitsMatrix: true,
          },
        },
      },
    });

    if (!method) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment method not found'
        },
        { status: 404 }
      );
    }

    // Prevent deletion if there are related records
    const totalDependencies = 
      method._count.orders + 
      method._count.payIns + 
      method._count.payOuts + 
      method._count.limitsMatrix;

    if (totalDependencies > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete payment method with ${totalDependencies} related records. Deactivate it instead.`,
          dependencies: method._count
        },
        { status: 400 }
      );
    }

    // Delete payment method
    await prisma.paymentMethod.delete({
      where: { code: params.code },
    });

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      'PAYMENT_METHOD_DELETE',
      AUDIT_ENTITIES.PAYMENT_METHOD,
      params.code,
      method,
      null
    );

    return NextResponse.json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment method error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete payment method'
      },
      { status: 500 }
    );
  }
}

