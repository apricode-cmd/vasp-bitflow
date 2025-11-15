// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * Public API v1 - Customer KYC Initiation
 * 
 * POST /api/v1/customers/[id]/kyc - Initiate KYC verification (requires API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey, logApiRequest } from '@/lib/middleware/api-auth';
import { prisma } from '@/lib/prisma';
import { startKycVerification } from '@/lib/services/kyc.service';
import { z } from 'zod';

const initiateKycSchema = z.object({
  redirectUrl: z.string().url().optional(),
  locale: z.enum(['en', 'pl', 'de', 'fr', 'es']).optional().default('en'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Validate API key
    const authResult = await requireApiKey(request, 'kyc', 'initiate');

    if (!authResult.authorized) {
      return authResult.error!;
    }

    const { apiKey } = authResult;
    const { id: userId } = await params;

    const body = await request.json().catch(() => ({}));
    const validated = initiateKycSchema.parse(body);

    // Get customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        kycSession: true
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

    // Check if KYC already approved
    if (user.kycSession?.status === 'APPROVED') {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 400, responseTime, 'KYC already approved');

      return NextResponse.json(
        {
          success: false,
          error: 'KYC already approved',
          message: 'This customer has already completed KYC verification',
          meta: {
            version: '1.0',
            responseTime: `${responseTime}ms`
          }
        },
        { status: 400 }
      );
    }

    // Check if KYC is pending
    if (user.kycSession?.status === 'PENDING') {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 200, responseTime);

      return NextResponse.json({
        success: true,
        data: {
          status: 'PENDING',
          message: 'KYC verification is already in progress',
          sessionId: user.kycSession.id,
          kycUrl: user.kycSession.kycaidUrl || undefined
        },
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      });
    }

    // Start KYC verification
    try {
      const kycSession = await startKycVerification(userId);

      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 201, responseTime);

      return NextResponse.json(
        {
          success: true,
          data: {
            status: 'INITIATED',
            sessionId: kycSession.id,
            kycUrl: kycSession.kycaidUrl,
            message: 'KYC verification initiated. Redirect customer to kycUrl to complete verification.',
            redirectUrl: validated.redirectUrl
          },
          meta: {
            version: '1.0',
            responseTime: `${responseTime}ms`
          }
        },
        { status: 201 }
      );
    } catch (kycError: any) {
      const responseTime = Date.now() - startTime;
      await logApiRequest(apiKey.id, request, 400, responseTime, kycError.message);

      return NextResponse.json(
        {
          success: false,
          error: 'KYC initiation failed',
          message: kycError.message || 'Failed to initiate KYC verification',
          meta: {
            version: '1.0',
            responseTime: `${responseTime}ms`
          }
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('API v1 initiate KYC error:', error);

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
        error: 'Failed to initiate KYC',
        meta: {
          version: '1.0',
          responseTime: `${responseTime}ms`
        }
      },
      { status: 500 }
    );
  }
}

