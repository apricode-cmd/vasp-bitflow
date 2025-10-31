/**
 * Admin Users Management API
 * 
 * GET /api/admin/users - List all users with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/middleware/admin-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const usersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['CLIENT', 'ADMIN']).optional(),
  isActive: z.coerce.boolean().optional(),
  kycStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20)
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireAdminRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      kycStatus: searchParams.get('kycStatus') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined
    };

    // Validate
    const validated = usersQuerySchema.parse(params);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (validated.search) {
      where.OR = [
        { email: { contains: validated.search, mode: 'insensitive' } },
        {
          profile: {
            OR: [
              { firstName: { contains: validated.search, mode: 'insensitive' } },
              { lastName: { contains: validated.search, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }

    if (validated.role) {
      where.role = validated.role;
    }

    if (validated.isActive !== undefined) {
      where.isActive = validated.isActive;
    }

    if (validated.kycStatus) {
      where.kycSession = {
        status: validated.kycStatus
      };
    }

    // Calculate pagination
    const skip = (validated.page - 1) * validated.limit;

    // Fetch users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          kycSession: {
            select: {
              status: true,
              submittedAt: true,
              reviewedAt: true
            }
          },
          _count: {
            select: {
              orders: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: validated.limit
      }),
      prisma.user.count({ where })
    ]);

    // Remove password from results
    const safeUsers = users.map(({ password, ...user }) => user);

    return NextResponse.json({
      success: true,
      data: safeUsers,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages: Math.ceil(total / validated.limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve users'
      },
      { status: 500 }
    );
  }
}

