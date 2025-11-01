/**
 * Single Role API
 * 
 * GET - Get role details with permissions
 * PUT - Update role
 * DELETE - Delete custom role
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { permissionService } from '@/lib/services/permission.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await requireAdminRole('SUPER_ADMIN');
    if (session instanceof NextResponse) return session;

    const role = await permissionService.getRoleDetails(params.code);

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      role,
    });
  } catch (error) {
    console.error('❌ Get role details error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await requireAdminRole('SUPER_ADMIN');
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const validatedData = updateRoleSchema.parse(body);

    // Check if role exists
    const role = await prisma.roleModel.findUnique({
      where: { code: params.code },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    // Update role details (only if not system role for name change)
    if (validatedData.name || validatedData.description !== undefined) {
      await prisma.roleModel.update({
        where: { code: params.code },
        data: {
          ...(validatedData.name && !role.isSystem ? { name: validatedData.name } : {}),
          ...(validatedData.description !== undefined ? { description: validatedData.description } : {}),
        },
      });
    }

    // Update permissions
    if (validatedData.permissions) {
      // Delete existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleCode: params.code },
      });

      // Add new permissions
      if (validatedData.permissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: validatedData.permissions.map(permCode => ({
            roleCode: params.code,
            permissionCode: permCode,
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('❌ Update role error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await requireAdminRole('SUPER_ADMIN');
    if (session instanceof NextResponse) return session;

    // Check if role exists
    const role = await prisma.roleModel.findUnique({
      where: { code: params.code },
      include: {
        _count: {
          select: { admins: true },
        },
      },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    // Cannot delete system roles
    if (role.isSystem) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete system roles' },
        { status: 400 }
      );
    }

    // Cannot delete role with admins assigned
    if (role._count.admins > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete role with ${role._count.admins} assigned admin(s)` },
        { status: 400 }
      );
    }

    // Delete role permissions first (cascade should handle this, but explicit is better)
    await prisma.rolePermission.deleteMany({
      where: { roleCode: params.code },
    });

    // Delete role
    await prisma.roleModel.delete({
      where: { code: params.code },
    });

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete role error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

