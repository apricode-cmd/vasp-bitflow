// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * GET /api/admin/notification-categories/[id]
 * Get a single category by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const category = await prisma.notificationEventCategory.findUnique({
      where: { id: params.id },
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
        events: {
          select: {
            id: true,
            eventKey: true,
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
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error: any) {
    console.error(`❌ GET /api/admin/notification-categories/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/notification-categories/[id]
 * Update a category
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('SUPER_ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const body = await request.json();
    const validated = updateCategorySchema.parse(body);

    // Check if category exists
    const existing = await prisma.notificationEventCategory.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Prevent editing system categories (code only)
    if (existing.isSystem && validated.name !== undefined) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify system category name' },
        { status: 403 }
      );
    }

    // Validate parent exists if provided
    if (validated.parentId !== undefined && validated.parentId !== null) {
      const parent = await prisma.notificationEventCategory.findUnique({
        where: { id: validated.parentId },
      });

      if (!parent) {
        return NextResponse.json(
          { success: false, error: 'Parent category not found' },
          { status: 404 }
        );
      }

      // Prevent circular reference
      if (validated.parentId === params.id) {
        return NextResponse.json(
          { success: false, error: 'Category cannot be its own parent' },
          { status: 400 }
        );
      }
    }

    const category = await prisma.notificationEventCategory.update({
      where: { id: params.id },
      data: validated,
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
      message: 'Category updated successfully',
    });
  } catch (error: any) {
    console.error(`❌ PATCH /api/admin/notification-categories/${params.id} error:`, error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/notification-categories/[id]
 * Delete a category (soft delete by setting isActive = false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminRole('SUPER_ADMIN');
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    // Check if category exists
    const existing = await prisma.notificationEventCategory.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            events: true,
            children: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Prevent deleting system categories
    if (existing.isSystem) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete system category' },
        { status: 403 }
      );
    }

    // Prevent deleting if has active events
    if (existing._count.events > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete category with ${existing._count.events} associated events. Please reassign or delete events first.` 
        },
        { status: 400 }
      );
    }

    // Prevent deleting if has children
    if (existing._count.children > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete category with ${existing._count.children} child categories. Please reassign or delete children first.` 
        },
        { status: 400 }
      );
    }

    // Soft delete (set isActive = false)
    await prisma.notificationEventCategory.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error: any) {
    console.error(`❌ DELETE /api/admin/notification-categories/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

