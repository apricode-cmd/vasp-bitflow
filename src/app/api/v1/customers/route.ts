/**
 * Public API v1 - Customers
 * 
 * POST /api/v1/customers - Create new customer (requires API key)
 * GET /api/v1/customers - List customers (requires API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey, logApiRequest } from '@/lib/middleware/api-auth';
import { prisma } from '@/lib/prisma';
import { createCustomerSchema } from '@/lib/validations/customer';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate API key
    const authResult = await requireApiKey(request, 'customers', 'create');

    if (!authResult.authorized) {
      return authResult.error!;
    }

    const { apiKey } = authResult;

    const body = await request.json();
    const validated = createCustomerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email }
    });

    if (existingUser) {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 409, responseTime, 'User already exists');

      return NextResponse.json(
        {
          success: false,
          error: 'User already exists',
          message: 'A user with this email address already exists',
          meta: { version: '1.0', responseTime: `${responseTime}ms` }
        },
        { status: 409 }
      );
    }

    // Generate random password (customer will reset via email)
    const randomPassword = Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Create user and profile
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        role: 'CLIENT',
        profile: {
          create: {
            firstName: validated.firstName,
            lastName: validated.lastName,
            phoneNumber: validated.phoneNumber,
            phoneCountry: validated.phoneCountry,
            dateOfBirth: validated.dateOfBirth,
            nationality: validated.nationality,
          }
        }
      },
      include: {
        profile: true
      }
    });

    // Store metadata if provided
    if (validated.metadata) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          profile: {
            update: {
              // Store metadata in a JSON field (you may need to add this to schema)
              // For now, we'll skip it or you can add a metadata field to UserProfile
            }
          }
        }
      });
    }

    // Audit log
    await auditService.logUserAction(
      user.id,
      AUDIT_ACTIONS.USER_REGISTERED,
      AUDIT_ENTITIES.USER,
      user.id,
      {
        source: 'api',
        apiKeyId: apiKey.id,
        email: user.email
      }
    );

    const responseTime = Date.now() - startTime;
    await logApiRequest(apiKey.id, request, 201, responseTime);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
          phoneNumber: user.profile?.phoneNumber,
          phoneCountry: user.profile?.phoneCountry,
          dateOfBirth: user.profile?.dateOfBirth,
          nationality: user.profile?.nationality,
          kycStatus: 'NOT_STARTED',
          createdAt: user.createdAt.toISOString(),
        },
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('API v1 create customer error:', error);

    const responseTime = Date.now() - startTime;

    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
          meta: {
            version: '1.0',
            responseTime: `${responseTime}ms`
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create customer',
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate API key
    const authResult = await requireApiKey(request, 'customers', 'read');

    if (!authResult.authorized) {
      return authResult.error!;
    }

    const { apiKey } = authResult;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const createdAfter = searchParams.get('createdAfter');
    const createdBefore = searchParams.get('createdBefore');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      role: 'CLIENT' // Only return client users, not admins
    };

    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) {
        where.createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        where.createdAt.lte = new Date(createdBefore);
      }
    }

    // Fetch customers
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          kycSession: {
            select: {
              status: true,
              verifiedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    // Format response
    const customers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
      phoneNumber: user.profile?.phoneNumber,
      phoneCountry: user.profile?.phoneCountry,
      dateOfBirth: user.profile?.dateOfBirth,
      nationality: user.profile?.nationality,
      kycStatus: user.kycSession?.status || 'NOT_STARTED',
      kycVerifiedAt: user.kycSession?.verifiedAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
    }));

    const responseTime = Date.now() - startTime;
    await logApiRequest(apiKey.id, request, 200, responseTime);

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      meta: {
        version: '1.0',
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error) {
    console.error('API v1 get customers error:', error);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve customers',
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      },
      { status: 500 }
    );
  }
}

