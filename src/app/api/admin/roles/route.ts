/**
 * Roles API
 * 
 * GET - Get all roles with their permissions
 * POST - Create a new custom role
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { permissionService } from '@/lib/services/permission.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createRoleSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z_]+$/, 'Code must be uppercase with underscores only'),
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminRole('SUPER_ADMIN');
    if (session instanceof NextResponse) return session;

    // Get all roles with counts
    const roles = await permissionService.getAllRoles();

    return NextResponse.json({
      success: true,
      roles,
    });
  } catch (error) {
    console.error('❌ Get roles error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminRole('SUPER_ADMIN');
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const validatedData = createRoleSchema.parse(body);

    // Check if role code already exists
    const existing = await prisma.roleModel.findUnique({
      where: { code: validatedData.code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Role with this code already exists' },
        { status: 400 }
      );
    }

    // Create role
    const role = await prisma.roleModel.create({
      data: {
        code: validatedData.code,
        name: validatedData.name,
        description: validatedData.description,
        isSystem: false,
        isActive: true,
      },
    });

    // Add permissions
    if (validatedData.permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: validatedData.permissions.map(permCode => ({
          roleCode: role.code,
          permissionCode: permCode,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      role,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('❌ Create role error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

