/**
 * Admin KYC Session Details API
 * 
 * GET /api/admin/kyc/[id] - Get detailed KYC session information
 * PUT /api/admin/kyc/[id] - Update KYC session (approve/reject)
 * DELETE /api/admin/kyc/[id] - Delete KYC session
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { kycFormService } from '@/lib/services/kyc-form.service';
import { auditService } from '@/lib/services/audit.service';
import { z } from 'zod';

const updateKycSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  rejectionReason: z.string().optional(),
  reviewNotes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const { error } = await requireAdminRole('ADMIN');
    if (error) return error;

    const { id } = await params;

    // Get KYC session with all details
    const kycSession = await prisma.kycSession.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' }
        },
        formData: true,
        profile: true, // Extended KYC profile
        provider: true // KYC provider info
      }
    });

    if (!kycSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC session not found'
        },
        { status: 404 }
      );
    }

    // Get form fields configuration
    const formFields = await kycFormService.getEnabledFields();

    // Format form data as object
    const formDataObject: Record<string, string> = {};
    kycSession.formData.forEach((item) => {
      formDataObject[item.fieldName] = item.fieldValue;
    });

    return NextResponse.json({
      success: true,
      data: {
        ...kycSession,
        formDataObject,
        formFields
      }
    });
  } catch (error) {
    console.error('Get KYC session error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve KYC session'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/kyc/[id]
 * Update KYC session (approve/reject)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const { error, session } = await requireAdminRole('ADMIN');
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    
    console.log('[UPDATE KYC] Starting update for ID:', id, 'with data:', body);
    
    // Validate input
    const validated = updateKycSchema.parse(body);

    // Get existing session
    const existingSession = await prisma.kycSession.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!existingSession) {
      console.log('[UPDATE KYC] Session not found:', id);
      return NextResponse.json(
        { success: false, error: 'KYC session not found' },
        { status: 404 }
      );
    }

    console.log('[UPDATE KYC] Found session, updating...');

    // Update KYC session
    const now = new Date();
    const updateData: any = {
      reviewedAt: now,
      reviewedBy: session?.user?.id,
    };

    if (validated.status) {
      updateData.status = validated.status;
      if (validated.status === 'APPROVED') {
        updateData.completedAt = now;
      }
    }

    if (validated.rejectionReason) {
      updateData.rejectionReason = validated.rejectionReason;
    }

    if (validated.reviewNotes) {
      updateData.reviewNotes = validated.reviewNotes;
    }

    const updatedSession = await prisma.kycSession.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          include: { profile: true }
        }
      }
    });

    console.log('[UPDATE KYC] Session updated successfully');

    // Audit log
    try {
      await auditService.log({
        userId: session?.user?.id || 'system',
        action: validated.status === 'APPROVED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
        entity: 'KYC',
        entityId: id,
        oldValue: existingSession.status,
        newValue: validated.status,
        metadata: {
          userEmail: existingSession.user.email,
          rejectionReason: validated.rejectionReason
        }
      });
      console.log('[UPDATE KYC] Audit log created');
    } catch (auditError) {
      console.error('[UPDATE KYC] Audit log error (non-critical):', auditError);
    }

    return NextResponse.json({
      success: true,
      data: updatedSession
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[UPDATE KYC] Validation error:', error.errors);
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[UPDATE KYC] Error details:', error);
    console.error('[UPDATE KYC] Error name:', (error as Error)?.name);
    console.error('[UPDATE KYC] Error message:', (error as Error)?.message);
    return NextResponse.json(
      { success: false, error: 'Failed to update KYC session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/kyc/[id]
 * Delete KYC session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const { error, session } = await requireAdminRole('ADMIN');
    if (error) return error;

    const { id } = await params;

    console.log('[DELETE KYC] Starting deletion for ID:', id);

    // Get existing session
    const existingSession = await prisma.kycSession.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!existingSession) {
      console.log('[DELETE KYC] Session not found:', id);
      return NextResponse.json(
        { success: false, error: 'KYC session not found' },
        { status: 404 }
      );
    }

    console.log('[DELETE KYC] Found session, attempting delete...');

    // Delete KYC session (cascade will delete documents, formData, and profile)
    await prisma.kycSession.delete({
      where: { id }
    });

    console.log('[DELETE KYC] Session deleted successfully');

    // Audit log
    try {
      await auditService.log({
        userId: session?.user?.id || 'system',
        action: 'KYC_DELETED',
        entity: 'KYC',
        entityId: id,
        oldValue: existingSession.status,
        metadata: {
          userEmail: existingSession.user.email
        }
      });
      console.log('[DELETE KYC] Audit log created');
    } catch (auditError) {
      console.error('[DELETE KYC] Audit log error (non-critical):', auditError);
      // Don't fail the whole operation if audit log fails
    }

    return NextResponse.json({
      success: true,
      message: 'KYC session deleted successfully'
    });
  } catch (error) {
    console.error('[DELETE KYC] Error details:', error);
    console.error('[DELETE KYC] Error name:', (error as Error)?.name);
    console.error('[DELETE KYC] Error message:', (error as Error)?.message);
    return NextResponse.json(
      { success: false, error: 'Failed to delete KYC session' },
      { status: 500 }
    );
  }
}
