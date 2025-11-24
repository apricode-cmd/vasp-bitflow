// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/kyc/[id]
 * PUT /api/admin/kyc/[id]
 * DELETE /api/admin/kyc/[id]
 * 
 * Single KYC session operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdminAuth } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

interface RouteContext {
  params: {
    id: string;
  };
}

// GET: Fetch single KYC session with full details
export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = params;

    const kycSession = await prisma.kycSession.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        profile: true,
        formData: {
          orderBy: { fieldName: 'asc' }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' }
        },
      },
    });

    if (!kycSession) {
      return NextResponse.json(
        { success: false, error: 'KYC session not found' },
        { status: 404 }
      );
    }

    // Get provider info from Integration if available
    let providerInfo = null;
    const providerId = (kycSession.metadata as any)?.provider;
    if (providerId) {
      const integration = await prisma.integration.findUnique({
        where: { service: providerId }
      });

      if (integration) {
        providerInfo = {
          name: integration.service.toUpperCase(),
          service: integration.service,
          status: integration.status,
          isEnabled: integration.isEnabled
        };
      }
    }

    // Add provider info to response
    const sessionWithProvider = {
      ...kycSession,
      provider: providerInfo
    };

    return NextResponse.json({
      success: true,
      data: sessionWithProvider,
    });
  } catch (error) {
    console.error('Failed to fetch KYC session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KYC session' },
      { status: 500 }
    );
  }
}

// PUT: Update KYC status (approve/reject)
const updateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = params;
    const body = await request.json();
    const { status, rejectionReason } = updateSchema.parse(body);

    // Validate rejection reason if rejecting
    if (status === 'REJECTED' && !rejectionReason?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Get old session state for audit
    const oldSession = await prisma.kycSession.findUnique({
      where: { id }
    });

    if (!oldSession) {
      return NextResponse.json(
        { success: false, error: 'KYC session not found' },
        { status: 404 }
      );
    }

    const kycSession = await prisma.kycSession.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        reviewedAt: new Date(),
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    // Log admin action
    const action = status === 'APPROVED' ? AUDIT_ACTIONS.KYC_APPROVED : AUDIT_ACTIONS.KYC_REJECTED;
    await auditService.logAdminAction(
      authResult.admin.id,
      action,
      AUDIT_ENTITIES.KYC_SESSION,
      id,
      { status: oldSession.status },
      { status, rejectionReason },
      {
        userId: kycSession.userId,
        userEmail: kycSession.user.email,
        provider: kycSession.kycProviderId,
        attempt: kycSession.attempts
      }
    );

    // Revalidate cache after status update
    revalidatePath('/admin/kyc');
    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${kycSession.userId}`);
    revalidatePath(`/admin/kyc/${id}`);
    revalidateTag('kyc-sessions');
    revalidateTag(`kyc-${kycSession.userId}`);

    // Send email notification to user
    try {
      const { eventEmitter } = await import('@/lib/services/event-emitter.service');
      
      if (status === 'APPROVED') {
        await eventEmitter.emit('KYC_APPROVED', {
          userId: kycSession.userId,
          recipientEmail: kycSession.user.email,
        });
        console.log(`✅ [NOTIFICATION] Sent KYC_APPROVED for user ${kycSession.userId}`);
      } else if (status === 'REJECTED') {
        await eventEmitter.emit('KYC_REJECTED', {
          userId: kycSession.userId,
          recipientEmail: kycSession.user.email,
          reason: rejectionReason,
        });
        console.log(`✅ [NOTIFICATION] Sent KYC_REJECTED for user ${kycSession.userId}`);
      }
    } catch (notifError) {
      // Don't fail the request if notification fails
      console.error('❌ [NOTIFICATION] Failed to send KYC notification:', notifError);
    }

    return NextResponse.json({
      success: true,
      data: kycSession,
    });
  } catch (error) {
    console.error('Failed to update KYC session:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update KYC session' },
      { status: 500 }
    );
  }
}

// DELETE: Delete KYC session
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = params;

    // Get session before deleting to get userId
    const session = await prisma.kycSession.findUnique({
      where: { id },
      select: { userId: true }
    });

    await prisma.kycSession.delete({
      where: { id },
    });

    // Revalidate cache after deletion
    if (session?.userId) {
      revalidatePath('/admin/kyc');
      revalidatePath('/admin/users');
      revalidatePath(`/admin/users/${session.userId}`);
      revalidateTag('kyc-sessions');
      revalidateTag(`kyc-${session.userId}`);
      console.log('✅ Cache invalidated after KYC deletion for user:', session.userId);
    }

    return NextResponse.json({
      success: true,
      message: 'KYC session deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete KYC session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete KYC session' },
      { status: 500 }
    );
  }
}
