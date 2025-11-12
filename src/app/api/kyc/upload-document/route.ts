/**
 * KYC Document Upload API
 * 
 * POST /api/kyc/upload-document - Upload KYC document directly to provider (Sumsub/KYCAID)
 * 
 * FormData params:
 * - file: File (required)
 * - documentType: 'PASSPORT' | 'ID_CARD' | 'UTILITY_BILL' | 'SELFIE' (required)
 * - documentSubType: 'FRONT_SIDE' | 'BACK_SIDE' (optional, for ID_CARD)
 * - country: ISO-3 country code (required, e.g. "POL", "USA")
 * - number: Document number (optional)
 * - issuedDate: YYYY-MM-DD (optional)
 * - validUntil: YYYY-MM-DD (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { prisma } from '@/lib/prisma';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getClientSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;
    const documentSubType = formData.get('documentSubType') as string | null;
    const country = formData.get('country') as string;
    const number = formData.get('number') as string | null;
    const issuedDate = formData.get('issuedDate') as string | null;
    const validUntil = formData.get('validUntil') as string | null;

    // Validate required fields
    if (!file || !documentType || !country) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: file, documentType, country'
        },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: 'File size exceeds 10MB limit'
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and PDF are allowed'
        },
        { status: 400 }
      );
    }

    console.log('📤 Document upload request:', {
      userId,
      documentType,
      documentSubType,
      country,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type
    });

    // Get or create KYC session
    let kycSession = await prisma.kycSession.findUnique({
      where: { userId }
    });

    if (!kycSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC session not found. Please start KYC verification first.'
        },
        { status: 400 }
      );
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

    // Extract applicant ID from session metadata
    const metadata = kycSession.metadata as any;
    const applicantId = metadata?.applicant?.id || metadata?.applicantId;

    if (!applicantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No applicant ID found. Please restart KYC verification.'
        },
        { status: 400 }
      );
    }

    // Get KYC provider (Sumsub/KYCAID)
    const kycProvider = await integrationFactory.getKycProvider();

    // Check if provider supports document upload
    if (!kycProvider.uploadDocument) {
      return NextResponse.json(
        {
          success: false,
          error: 'Current KYC provider does not support direct document upload'
        },
        { status: 501 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Prepare document metadata
    const docMetadata: any = {
      idDocType: documentType,
      country: country
    };

    if (documentSubType) {
      docMetadata.idDocSubType = documentSubType;
    }
    if (number) {
      docMetadata.number = number;
    }
    if (issuedDate) {
      docMetadata.issuedDate = issuedDate;
    }
    if (validUntil) {
      docMetadata.validUntil = validUntil;
    }

    // Upload to provider
    console.log('📡 Uploading to KYC provider:', kycProvider.providerId);
    const uploadResult = await kycProvider.uploadDocument(
      applicantId,
      buffer,
      file.name,
      docMetadata,
      true // returnWarnings
    );

    if (!uploadResult.success) {
      console.error('❌ Provider upload failed:', uploadResult.error);
      return NextResponse.json(
        {
          success: false,
          error: uploadResult.error || 'Failed to upload document to KYC provider'
        },
        { status: 500 }
      );
    }

    console.log('✅ Document uploaded to provider:', uploadResult);

    // Save document record to database
    const document = await prisma.kycDocument.create({
      data: {
        kycSessionId: kycSession.id,
        documentType: documentType,
        fileUrl: '', // Provider manages files, we don't store URL
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        verifiedByAI: false,
        verificationData: {
          providerId: kycProvider.providerId,
          documentId: uploadResult.documentId,
          imageIds: uploadResult.imageIds,
          status: uploadResult.status,
          warnings: uploadResult.warnings,
          uploadedAt: new Date().toISOString(),
          metadata: docMetadata
        }
      }
    });

    // Log user action
    await auditService.logUserAction(
      userId,
      AUDIT_ACTIONS.KYC_DOCUMENT_UPLOADED,
      AUDIT_ENTITIES.KYC_SESSION,
      kycSession.id,
      {
        documentType,
        documentId: uploadResult.documentId,
        fileName: file.name,
        fileSize: file.size,
        provider: kycProvider.providerId
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        documentId: document.id,
        providerDocumentId: uploadResult.documentId,
        imageIds: uploadResult.imageIds,
        status: uploadResult.status,
        warnings: uploadResult.warnings
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Upload document error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to upload document'
      },
      { status: 500 }
    );
  }
}

