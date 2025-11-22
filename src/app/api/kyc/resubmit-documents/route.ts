// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

/**
 * POST /api/kyc/resubmit-documents
 * 
 * Upload individual problematic documents for RETRY rejections
 * After upload, automatically requests new Sumsub review (sets status to PENDING)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { SumsubAdapter } from '@/lib/integrations/providers/kyc/SumsubAdapter';

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getClientSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('📤 [RESUBMIT] Document upload request from user:', session.user.id);

    // 2. Get KYC session
    const kycSession = await prisma.kycSession.findUnique({
      where: { userId: session.user.id }
    });

    if (!kycSession) {
      return NextResponse.json(
        { error: 'KYC session not found' },
        { status: 404 }
      );
    }

    // 3. Validate: must be REJECTED with RETRY type
    if (kycSession.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'KYC session is not rejected' },
        { status: 400 }
      );
    }

    if (kycSession.reviewRejectType !== 'RETRY') {
      return NextResponse.json(
        { error: 'Resubmission not allowed for this rejection type' },
        { status: 400 }
      );
    }

    // 4. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('documentType') as string | null;

    if (!file || !documentType) {
      return NextResponse.json(
        { error: 'Missing file or documentType' },
        { status: 400 }
      );
    }

    console.log('📄 [RESUBMIT] Processing document:', { 
      documentType, 
      fileName: file.name, 
      size: file.size 
    });

    // 5. Upload to Vercel Blob (optional - only if available)
    let fileUrl = '';
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`kyc/${session.user.id}/${Date.now()}-${file.name}`, file, {
          access: 'public',
          addRandomSuffix: true
        });
        fileUrl = blob.url;
        console.log('✅ [RESUBMIT] Document uploaded to Blob:', fileUrl);
      } else {
        // Blob not available - will use direct Sumsub upload only
        fileUrl = `temp://kyc/${session.user.id}/${file.name}`;
        console.log('ℹ️ [RESUBMIT] Blob not configured, using direct Sumsub upload');
      }
    } catch (blobError) {
      console.warn('⚠️ [RESUBMIT] Blob upload failed, continuing with direct Sumsub upload:', blobError);
      fileUrl = `temp://kyc/${session.user.id}/${file.name}`;
    }

    // 6. Save to database
    const kycDocument = await prisma.kycDocument.create({
      data: {
        userId: session.user.id,
        kycSessionId: kycSession.id,
        documentType,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        documentStatus: 'PENDING',
        attempt: (kycSession.attempts || 0) + 1
      }
    });

    console.log('✅ [RESUBMIT] Document saved to DB:', kycDocument.id);

    // 7. Upload to Sumsub (if Sumsub provider)
    if (kycSession.kycProviderId === 'sumsub' && kycSession.applicantId) {
      try {
        const provider = await integrationFactory.getProviderByService('sumsub');
        
        if (provider) {
          const integration = await prisma.integration.findUnique({
            where: { service: 'sumsub' }
          });

          if (integration) {
            await provider.initialize({
              apiKey: integration.apiKey ?? undefined,
              apiEndpoint: integration.apiEndpoint ?? undefined,
              ...(integration.config as Record<string, any> || {})
            });

            const sumsubAdapter = provider as SumsubAdapter;

            // Upload document to Sumsub
            console.log('📤 [RESUBMIT] Uploading to Sumsub...');
            
            await sumsubAdapter.uploadDocumentForResubmission(
              kycSession.applicantId,
              file,
              documentType
            );

            console.log('✅ [RESUBMIT] Document uploaded to Sumsub');

            // Request new review (set status to PENDING)
            console.log('🔄 [RESUBMIT] Requesting new review...');
            
            await sumsubAdapter.requestApplicantCheck(kycSession.applicantId);

            console.log('✅ [RESUBMIT] Review requested, status set to PENDING');

            // Update KYC session
            await prisma.kycSession.update({
              where: { id: kycSession.id },
              data: {
                status: 'PENDING',
                attempts: (kycSession.attempts || 0) + 1,
                lastAttemptAt: new Date()
              }
            });
          }
        }
      } catch (sumsubError) {
        console.error('❌ [RESUBMIT] Sumsub upload error:', sumsubError);
        // Continue anyway - document is saved locally
      }
    }

    return NextResponse.json({
      success: true,
      documentId: kycDocument.id,
      message: 'Document uploaded successfully'
    });

  } catch (error: any) {
    console.error('❌ [RESUBMIT] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}

