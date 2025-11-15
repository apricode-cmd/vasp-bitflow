// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Email Templates Management API
 * 
 * GET: List all email templates
 * POST: Create new email template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTemplateSchema = z.object({
  key: z.string().min(1, 'Template key is required'),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  category: z.enum(['TRANSACTIONAL', 'NOTIFICATION', 'MARKETING', 'SYSTEM', 'COMPLIANCE']),
  subject: z.string().min(1, 'Subject is required'),
  htmlContent: z.string().min(1, 'HTML content is required'),
  textContent: z.string().optional(),
  preheader: z.string().optional(),
  layout: z.string().default('default'),
  variables: z.array(z.string()).default([]),
  orgId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const orgId = searchParams.get('orgId');

    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (orgId) where.orgId = orgId;

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        category: true,
        subject: true,
        preheader: true,
        layout: true,
        variables: true,
        version: true,
        isActive: true,
        isDefault: true,
        status: true,
        publishedAt: true,
        publishedBy: true,
        orgId: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
      }
    });

    // Get usage stats for each template
    const templatesWithStats = await Promise.all(
      templates.map(async (template) => {
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

        return {
          ...template,
          usageCount,
          lastUsed: lastUsed?.createdAt || null
        };
      })
    );

    return NextResponse.json({
      success: true,
      templates: templatesWithStats
    });
  } catch (error: any) {
    console.error('❌ GET /api/admin/email-templates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);

    // Check if template key already exists
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        key: validatedData.key,
        orgId: validatedData.orgId || null
      }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Template with this key already exists' },
        { status: 400 }
      );
    }

    // Create template
    const template = await prisma.emailTemplate.create({
      data: {
        ...validatedData,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      template
    });
  } catch (error: any) {
    console.error('❌ POST /api/admin/email-templates error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

