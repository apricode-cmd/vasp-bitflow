/**
 * KYC Document Upload API
 * POST /api/kyc/upload-document
 * 
 * Uploads KYC documents to Vercel Blob (temporary storage).
 * Documents are later sent to KYC provider when user submits the form.
 * 
 * FormData fields:
 * - file: File (required)
 * - documentType: PASSPORT | ID_CARD | UTILITY_BILL | etc (required)
 * - documentSubType: FRONT_SIDE | BACK_SIDE (optional)
 * - country: ISO-3 code (required)
 * - number: Document number (optional)
 * - issuedDate: YYYY-MM-DD (optional)
 * - validUntil: YYYY-MM-DD (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { prisma } from '@/lib/prisma';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { uploadToBlob } from '@/lib/storage/blob.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getClientSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse FormData
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
        { success: false, error: 'Missing required fields: file, documentType, country' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}` },
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

    // Upload to Vercel Blob (temporary storage before KYC submission)
    console.log('☁️ Uploading to Vercel Blob...');
    const blobResult = await uploadToBlob(file, file.name, `kyc/${userId}`);
    
    console.log('✅ Blob upload successful:', {
      url: blobResult.url,
      size: blobResult.size
    });

    // Prepare document metadata
    const docMetadata: any = {
      idDocType: documentType,
      country: country,
      uploadedVia: 'client_form',
      blobPath: blobResult.pathname
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

    // Save document record in database (without kycSessionId - will be linked later)
    const document = await prisma.kycDocument.create({
      data: {
        userId: userId,
        kycSessionId: null, // Will be linked when KYC session is created
        documentType: documentType,
        fileUrl: blobResult.url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        verifiedByAI: false,
        verificationData: {
          storedIn: 'vercel_blob',
          blobUrl: blobResult.url,
          blobPathname: blobResult.pathname,
          metadata: docMetadata,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    console.log('✅ Document saved to database:', document.id);

    // Audit log
    await auditService.logUserAction(
      userId,
      AUDIT_ACTIONS.KYC_DOCUMENT_UPLOADED,
      AUDIT_ENTITIES.USER,
      userId,
      {
        documentId: document.id,
        documentType,
        fileName: file.name,
        fileSize: file.size,
        storedIn: 'vercel_blob'
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        documentId: document.id,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: document.uploadedAt,
        status: 'uploaded_to_storage' // Not yet submitted to KYC provider
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Upload document error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}
