import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const createCategorySchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z_]+$/, 'Code must be uppercase letters and underscores only'),
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

/**
 * GET /api/admin/notification-categories
 * List all notification event categories
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminRole('ADMIN');
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const parentId = searchParams.get('parentId');

    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (parentId !== null) {
      where.parentId = parentId === 'null' ? null : parentId;
    }

    const categories = await prisma.notificationEventCategory.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            events: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error: any) {
    console.error('❌ GET /api/admin/notification-categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/notification-categories
 * Create a new notification event category
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminRole('SUPER_ADMIN');
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const validated = createCategorySchema.parse(body);

    // Check if code already exists
    const existing = await prisma.notificationEventCategory.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Category with this code already exists' },
        { status: 400 }
      );
    }

    // Validate parent exists if provided
    if (validated.parentId) {
      const parent = await prisma.notificationEventCategory.findUnique({
        where: { id: validated.parentId },
      });

      if (!parent) {
        return NextResponse.json(
          { success: false, error: 'Parent category not found' },
          { status: 404 }
        );
      }
    }

    const category = await prisma.notificationEventCategory.create({
      data: {
        ...validated,
        createdBy: session.user.id,
      },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      category,
      message: 'Category created successfully',
    });
  } catch (error: any) {
    console.error('❌ POST /api/admin/notification-categories error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

