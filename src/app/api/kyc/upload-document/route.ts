/**
 * KYC Document Upload API
 * 
 * POST /api/kyc/upload-document - Upload KYC document
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getCurrentUserId } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { documentUploadService } from '@/lib/services/document-upload.service';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;

    if (!file || !documentType) {
      return NextResponse.json(
        {
          success: false,
          error: 'File and documentType are required'
        },
        { status: 400 }
      );
    }

    // Get or create KYC session
    let kycSession = await prisma.kycSession.findUnique({
      where: { userId }
    });

    if (!kycSession) {
      kycSession = await prisma.kycSession.create({
        data: {
          userId,
          status: 'PENDING'
        }
      });
    }

    // Check if already approved
    if (kycSession.status === 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC already approved'
        },
        { status: 400 }
      );
    }

    // Upload document
    const uploadResult = await documentUploadService.uploadDocument(
      file,
      kycSession.id,
      documentType
    );

    // Log user action
    await auditService.logUserAction(
      userId,
      AUDIT_ACTIONS.KYC_DOCUMENT_UPLOADED,
      AUDIT_ENTITIES.KYC_SESSION,
      kycSession.id,
      {
        documentType,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize
      }
    );

    // Trigger KYCAID verification in background (don't wait)
    documentUploadService.verifyDocumentWithKycaid(uploadResult.documentId)
      .catch(error => {
        console.error('Background verification failed:', error);
      });

    return NextResponse.json({
      success: true,
      data: uploadResult
    }, { status: 201 });
  } catch (error: any) {
    console.error('Upload document error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to upload document'
      },
      { status: 500 }
    );
  }
}

