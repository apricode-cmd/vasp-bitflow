/**
 * Public API v1 - Customer Details
 * 
 * GET /api/v1/customers/[id] - Get customer details (requires API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey, logApiRequest } from '@/lib/middleware/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate API key
    const authResult = await requireApiKey(request, 'customers', 'read');

    if (!authResult.authorized) {
      return authResult.error!;
    }

    const { apiKey } = authResult;
    const { id } = await params;

    // Get customer
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        kycSession: {
          select: {
            status: true,
            verifiedAt: true,
            rejectedAt: true,
            rejectionReason: true
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      }
    });

    if (!user || user.role !== 'CLIENT') {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 404, responseTime, 'Customer not found');

      return NextResponse.json(
        {
          success: false,
          error: 'Customer not found',
          meta: {
            version: '1.0',
            responseTime: `${responseTime}ms`
          }
        },
        { status: 404 }
      );
    }

    const responseTime = Date.now() - startTime;
    await logApiRequest(apiKey.id, request, 200, responseTime);

    return NextResponse.json({
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
        country: user.profile?.country,
        city: user.profile?.city,
        address: user.profile?.address,
        postalCode: user.profile?.postalCode,
        kyc: {
          status: user.kycSession?.status || 'NOT_STARTED',
          verifiedAt: user.kycSession?.verifiedAt?.toISOString(),
          rejectedAt: user.kycSession?.rejectedAt?.toISOString(),
          rejectionReason: user.kycSession?.rejectionReason
        },
        stats: {
          totalOrders: user._count.orders
        },
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      },
      meta: {
        version: '1.0',
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error) {
    console.error('API v1 get customer error:', error);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve customer',
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      },
      { status: 500 }
    );
  }
}

