// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Email Templates for Notification Events API
 * 
 * GET: List available email templates for events
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const onlyPublished = searchParams.get('onlyPublished') === 'true';

    const where: any = {
      isActive: true,
    };

    if (onlyPublished) {
      where.status = 'PUBLISHED';
    }

    if (category) {
      // Map event category to email category
      const categoryMap: Record<string, string[]> = {
        'ORDER': ['TRANSACTIONAL', 'NOTIFICATION'],
        'KYC': ['COMPLIANCE', 'NOTIFICATION'],
        'PAYMENT': ['TRANSACTIONAL', 'NOTIFICATION'],
        'SECURITY': ['SYSTEM', 'NOTIFICATION'],
        'SYSTEM': ['SYSTEM', 'NOTIFICATION'],
        'ADMIN': ['SYSTEM', 'NOTIFICATION'],
        'MARKETING': ['MARKETING'],
      };

      const emailCategories = categoryMap[category] || [];
      if (emailCategories.length > 0) {
        where.category = { in: emailCategories };
      }
    }

    const templates = await prisma.emailTemplate.findMany({
      where,
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        category: true,
        subject: true,
        variables: true,
        status: true,
        version: true,
        isDefault: true,
        _count: {
          select: {
            notificationEvents: true,
            emailLogs: true,
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Format response
    const formattedTemplates = templates.map(template => ({
      id: template.id,
      key: template.key,
      name: template.name,
      description: template.description,
      category: template.category,
      subject: template.subject,
      variables: template.variables,
      status: template.status,
      version: template.version,
      isDefault: template.isDefault,
      usageCount: template._count.notificationEvents,
      emailsSent: template._count.emailLogs,
    }));

    return NextResponse.json({
      success: true,
      templates: formattedTemplates,
    });
  } catch (error: any) {
    console.error('❌ GET /api/admin/notification-events/templates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

