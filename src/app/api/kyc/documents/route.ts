/**
 * KYC Documents API
 * 
 * GET /api/kyc/documents - Get user's KYC documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getCurrentUserId } from '@/lib/auth-utils';
import { documentUploadService } from '@/lib/services/document-upload.service';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const sessionOrError = await requireAuth();
    if (sessionOrError.error) {
      return sessionOrError.error;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Get KYC session
    const kycSession = await prisma.kycSession.findUnique({
      where: { userId }
    });

    if (!kycSession) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Get documents
    const documents = await documentUploadService.getSessionDocuments(kycSession.id);

    return NextResponse.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get documents error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve documents'
      },
      { status: 500 }
    );
  }
}

