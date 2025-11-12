/**
 * Email Template Detail API
 * 
 * GET: Get single template
 * PATCH: Update template
 * DELETE: Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(['TRANSACTIONAL', 'NOTIFICATION', 'MARKETING', 'SYSTEM', 'COMPLIANCE']).optional(),
  subject: z.string().min(1).optional(),
  htmlContent: z.string().min(1).optional(),
  textContent: z.string().optional(),
  preheader: z.string().optional(),
  layout: z.string().optional(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const template = await prisma.emailTemplate.findUnique({
      where: { id: params.id }
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get usage stats
    const usageCount = await prisma.emailLog.count({
      where: {
        templateId: template.id,
        status: 'SENT'
      }
    });

    const lastUsed = await prisma.emailLog.findFirst({
      where: {
        templateId: template.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        usageCount,
        lastUsed: lastUsed?.createdAt || null
      }
    });
  } catch (error: any) {
    console.error('❌ GET /api/admin/email-templates/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const body = await request.json();
    const validatedData = updateTemplateSchema.parse(body);

    // Check if template exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Update template
    const updateData: any = {
      ...validatedData,
      updatedBy: session.user.id,
    };

    // If publishing, set publishedAt and publishedBy
    if (validatedData.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      updateData.publishedAt = new Date();
      updateData.publishedBy = session.user.id;
    }

    // If content changed, increment version
    if (validatedData.htmlContent && validatedData.htmlContent !== existing.htmlContent) {
      updateData.version = existing.version + 1;
    }

    const template = await prisma.emailTemplate.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      template
    });
  } catch (error: any) {
    console.error('❌ PATCH /api/admin/email-templates/[id] error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('SUPER_ADMIN'); // Only super admin can delete
    if (authResult instanceof NextResponse) return authResult; // Only super admin can delete
    const { session } = authResult;

    // Check if template exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of default templates
    if (existing.isDefault) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete default template' },
        { status: 400 }
      );
    }

    // Delete template
    await prisma.emailTemplate.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ DELETE /api/admin/email-templates/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

