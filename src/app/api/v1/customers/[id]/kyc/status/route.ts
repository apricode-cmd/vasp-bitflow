// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Public API v1 - Customer KYC Status
 * 
 * GET /api/v1/customers/[id]/kyc/status - Get KYC verification status (requires API key)
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
    const authResult = await requireApiKey(request, 'kyc', 'read');

    if (!authResult.authorized) {
      return authResult.error!;
    }

    const { apiKey } = authResult;
    const { id: userId } = await params;

    // Get customer with KYC session
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        kycSession: {
          select: {
            id: true,
            status: true,
            verifiedAt: true,
            rejectedAt: true,
            rejectionReason: true,
            kycaidUrl: true,
            createdAt: true,
            updatedAt: true
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

    // If no KYC session exists
    if (!user.kycSession) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'NOT_STARTED',
          message: 'KYC verification has not been initiated for this customer'
        },
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      });
    }

    // Return KYC status
    const kycData: any = {
      sessionId: user.kycSession.id,
      status: user.kycSession.status,
      createdAt: user.kycSession.createdAt.toISOString(),
      updatedAt: user.kycSession.updatedAt.toISOString()
    };

    if (user.kycSession.status === 'APPROVED') {
      kycData.verifiedAt = user.kycSession.verifiedAt?.toISOString();
      kycData.message = 'KYC verification approved';
    } else if (user.kycSession.status === 'REJECTED') {
      kycData.rejectedAt = user.kycSession.rejectedAt?.toISOString();
      kycData.rejectionReason = user.kycSession.rejectionReason;
      kycData.message = 'KYC verification rejected';
    } else if (user.kycSession.status === 'PENDING') {
      kycData.kycUrl = user.kycSession.kycaidUrl;
      kycData.message = 'KYC verification in progress';
    }

    return NextResponse.json({
      success: true,
      data: kycData,
      meta: {
        version: '1.0',
        responseTime: `${responseTime}ms`
      }
    });
  } catch (error) {
    console.error('API v1 get KYC status error:', error);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve KYC status',
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      },
      { status: 500 }
    );
  }
}

