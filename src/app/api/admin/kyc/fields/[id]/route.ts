/**
 * Admin KYC Field Management API
 * 
 * PATCH /api/admin/kyc/fields/[id] - Update KYC field configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, getCurrentUserId } from '@/lib/middleware/admin-auth';
import { kycFormService } from '@/lib/services/kyc-form.service';
import { updateKycFieldSchema } from '@/lib/validations/kyc-admin';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;
    const body = await request.json();

    // Validate
    const validated = updateKycFieldSchema.parse(body);

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

    // Get current field
    const currentField = await prisma.kycFormField.findUnique({
      where: { id }
    });

    if (!currentField) {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC field not found'
        },
        { status: 404 }
      );
    }

    // Update field
    const updatedField = await kycFormService.updateField(id, validated);

    // Log admin action
    await auditService.logAdminAction(
      adminId,
      AUDIT_ACTIONS.SETTINGS_UPDATED,
      'KycFormField',
      id,
      {
        label: currentField.label,
        isRequired: currentField.isRequired,
        isEnabled: currentField.isEnabled
      },
      {
        label: updatedField.label,
        isRequired: updatedField.isRequired,
        isEnabled: updatedField.isEnabled
      },
      {
        fieldName: currentField.fieldName
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedField
    });
  } catch (error) {
    console.error('Update KYC field error:', error);

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
        error: 'Failed to update KYC field'
      },
      { status: 500 }
    );
  }
}

