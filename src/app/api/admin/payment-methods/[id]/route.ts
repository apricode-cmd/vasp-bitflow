/**
 * Admin Payment Method Management API
 * 
 * GET /api/admin/payment-methods/[id] - Get payment method details
 * PATCH /api/admin/payment-methods/[id] - Update payment method
 * DELETE /api/admin/payment-methods/[id] - Deactivate payment method
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { paymentMethodService } from '@/lib/services/payment-method.service';
import { updatePaymentMethodSchema } from '@/lib/validations/payment-method';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

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

    const { id } = await params;

    // Get payment method
    const method = await paymentMethodService.getMethodById(id);

    if (!method) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment method not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: method
    });
  } catch (error) {
    console.error('Get payment method error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve payment method'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;
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

    // Get current method
    const currentMethod = await paymentMethodService.getMethodById(id);

    if (!currentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment method not found'
        },
        { status: 404 }
      );
    }

    // Update payment method
    const updatedMethod = await paymentMethodService.updateMethod(id, validated);

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.PAYMENT_METHOD_UPDATED,
      AUDIT_ENTITIES.PAYMENT_METHOD,
      id,
      {
        name: currentMethod.name,
        isActive: currentMethod.isActive,
        feeFixed: currentMethod.feeFixed,
        feePercent: currentMethod.feePercent
      },
      {
        name: updatedMethod.name,
        isActive: updatedMethod.isActive,
        feeFixed: updatedMethod.feeFixed,
        feePercent: updatedMethod.feePercent
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedMethod
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
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;

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

    // Get method for logging
    const method = await paymentMethodService.getMethodById(id);

    if (!method) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment method not found'
        },
        { status: 404 }
      );
    }

    // Deactivate payment method
    await paymentMethodService.deleteMethod(id);

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.PAYMENT_METHOD_UPDATED,
      AUDIT_ENTITIES.PAYMENT_METHOD,
      id,
      { isActive: true },
      { isActive: false },
      {
        name: method.name,
        action: 'deactivated'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Payment method deactivated'
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

