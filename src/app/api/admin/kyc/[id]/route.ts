/**
 * Admin KYC Session Details API
 * 
 * GET /api/admin/kyc/[id] - Get detailed KYC session information
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { kycFormService } from '@/lib/services/kyc-form.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Check admin permission
    const sessionOrError = await requireRole('ADMIN');
    if (sessionOrError instanceof NextResponse) {
      return sessionOrError;
    }

    const { id } = await params;

    // Get KYC session with all details
    const kycSession = await prisma.kycSession.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' }
        },
        formData: true
      }
    });

    if (!kycSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC session not found'
        },
        { status: 404 }
      );
    }

    // Get form fields configuration
    const formFields = await kycFormService.getEnabledFields();

    // Format form data as object
    const formDataObject: Record<string, string> = {};
    kycSession.formData.forEach((item) => {
      formDataObject[item.fieldName] = item.fieldValue;
    });

    return NextResponse.json({
      success: true,
      data: {
        ...kycSession,
        formDataObject,
        formFields
      }
    });
  } catch (error) {
    console.error('Get KYC session error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve KYC session'
      },
      { status: 500 }
    );
  }
}

