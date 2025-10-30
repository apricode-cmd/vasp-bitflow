/**
 * Admin Payment Methods API
 * 
 * GET /api/admin/payment-methods - List all payment methods
 * POST /api/admin/payment-methods - Create new payment method
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, getCurrentUserId } from '@/lib/auth-utils';
import { paymentMethodService } from '@/lib/services/payment-method.service';
import { createPaymentMethodSchema } from '@/lib/validations/payment-method';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { z } from 'zod';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Get all payment methods with full details
    const methods = await paymentMethodService.getAllMethods();

    return NextResponse.json({
      success: true,
      methods,
      total: methods.length,
    });
  } catch (error) {
    console.error('Get payment methods error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve payment methods'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const body = await request.json();

    // Validate
    const validated = createPaymentMethodSchema.parse(body);

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

    // Create payment method
    const method = await paymentMethodService.createMethod(validated);

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.PAYMENT_METHOD_UPDATED,
      AUDIT_ENTITIES.PAYMENT_METHOD,
      method.code, // PaymentMethod uses 'code' as primary key, not 'id'
      {},
      {
        name: method.name,
        type: method.type,
        currency: method.currency,
        isActive: method.isActive
      }
    );

    return NextResponse.json({
      success: true,
      data: method
    }, { status: 201 });
  } catch (error) {
    console.error('Create payment method error:', error);

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
        error: 'Failed to create payment method'
      },
      { status: 500 }
    );
  }
}

