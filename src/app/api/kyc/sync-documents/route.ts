/**
 * KYC Sync Documents to Provider
 * POST /api/kyc/sync-documents
 * 
 * Sends all locally uploaded documents to the KYC provider (Sumsub)
 * Called after form submission to sync documents with the provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/auth-client';
import { prisma } from '@/lib/prisma';
import { integrationFactory } from '@/lib/integrations/IntegrationFactory';
import { auditService, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/services/audit.service';
import { readFile } from 'fs/promises';
import path from 'path';

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

    console.log('📤 Syncing documents to KYC provider for user:', userId);

    // Get KYC session
    const kycSession = await prisma.kycSession.findUnique({
      where: { userId }
    });

    if (!kycSession) {
      console.error('❌ No KYC session found for user:', userId);
      return NextResponse.json(
        { success: false, error: 'KYC session not found. Please start KYC verification first.' },
        { status: 400 }
      );
    }

    // Get applicant ID (from top-level field, not metadata)
    const applicantId = kycSession.applicantId;

    console.log('🔍 KYC session data:', {
      sessionId: kycSession.id,
      applicantId: applicantId,
      kycProviderId: kycSession.kycProviderId,
      status: kycSession.status
    });

    if (!applicantId) {
      console.error('❌ No applicant ID found in session');
      return NextResponse.json(
        { success: false, error: 'No applicant ID found. Please restart KYC verification.' },
        { status: 400 }
      );
    }

    console.log('✅ KYC session found:', {
      sessionId: kycSession.id,
      applicantId,
      status: kycSession.status
    });

    // Get KYC provider
    const kycProvider = await integrationFactory.getKycProvider();

    if (!kycProvider.uploadDocument) {
      return NextResponse.json(
        { success: false, error: 'Current KYC provider does not support document upload' },
        { status: 501 }
      );
    }

    // Get all documents for this user that are not yet linked to a session
    const documents = await prisma.kycDocument.findMany({
      where: {
        userId,
        OR: [
          { kycSessionId: null },
          { kycSessionId: kycSession.id }
        ]
      },
      orderBy: { uploadedAt: 'asc' }
    });

    if (documents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No documents to sync',
        synced: 0,
        failed: 0
      });
    }

    console.log(`📦 Found ${documents.length} documents to sync`);

    // FIRST: Get applicant details to see what's required
    console.log('🔍 Fetching applicant details from Sumsub...');
    
    let requiredIdDocs: any = null;
    try {
      const applicantDetails = await kycProvider.getApplicant(applicantId);
      console.log('📋 Applicant details:', JSON.stringify(applicantDetails.metadata, null, 2));
      
      // Check requiredIdDocs structure
      if (applicantDetails.metadata?.requiredIdDocs) {
        requiredIdDocs = applicantDetails.metadata.requiredIdDocs;
        console.log('📄 Required ID Docs structure:', JSON.stringify(requiredIdDocs, null, 2));
        
        // Check if requiredIdDocs has docSets
        if (requiredIdDocs.docSets && requiredIdDocs.docSets.length > 0) {
          console.log('📱 DocSets detected:', JSON.stringify(requiredIdDocs.docSets, null, 2));
          
          // Check IDENTITY docSet for videoRequired
          const identityDocSet = requiredIdDocs.docSets.find((ds: any) => ds.idDocSetType === 'IDENTITY');
          
          if (identityDocSet) {
            const videoRequired = identityDocSet.videoRequired;
            console.log(`📹 IDENTITY videoRequired: ${videoRequired}`);
            
            // If video capture is required (docapture, photoRequired, videoIdent), documents must be uploaded via SDK
            if (videoRequired === 'docapture' || videoRequired === 'photoRequired' || videoRequired === 'videoIdent') {
              console.log('⚠️ IDENTITY requires video capture - SDK only for ID documents!');
              console.log('ℹ️ UTILITY_BILL can still be uploaded via API');
              
              // Filter documents: only upload non-IDENTITY documents via API (e.g. UTILITY_BILL)
              // IDENTITY docs (PASSPORT, ID_CARD, DRIVERS) will be handled by SDK
            } else if (videoRequired === 'disabled' || videoRequired === 'off' || !videoRequired) {
              console.log('✅ IDENTITY video capture disabled - can upload via API!');
            }
          }
          
          // Check for SELFIE docSet (always SDK-only)
          const selfieDocSet = requiredIdDocs.docSets.find((ds: any) => ds.idDocSetType === 'SELFIE');
          if (selfieDocSet) {
            console.log('📸 SELFIE detected - will use SDK for liveness');
          }
        }
      }
      
      // Check review status
      if (applicantDetails.metadata?.review) {
        console.log('📊 Review status:', JSON.stringify(applicantDetails.metadata.review, null, 2));
      }
      
      // Check fixedInfo to verify APPLICANT_DATA is complete
      if (applicantDetails.metadata?.info) {
        console.log('👤 Fixed Info:', JSON.stringify(applicantDetails.metadata.info, null, 2));
      }
    } catch (error: any) {
      console.error('⚠️ Failed to get applicant details:', error.message);
    }
    
    // Also check required documents status
    let requiredDocs: any = null;
    if (kycProvider.checkRequiredDocuments) {
      try {
        const requiredResult = await kycProvider.checkRequiredDocuments(applicantId);
        requiredDocs = requiredResult;
        console.log('📋 Required documents status:', JSON.stringify(requiredResult, null, 2));
      } catch (error: any) {
        console.error('⚠️ Failed to check required documents:', error.message);
      }
    }

    // Determine which document types can be uploaded via API
    const sdkOnlyDocTypes: string[] = ['SELFIE']; // SELFIE always SDK-only
    let needsSdkForIdentity = false;
    
    if (requiredIdDocs?.docSets) {
      const identityDocSet = requiredIdDocs.docSets.find((ds: any) => ds.idDocSetType === 'IDENTITY');
      if (identityDocSet) {
        const videoRequired = identityDocSet.videoRequired;
        // If video capture required, IDENTITY docs must go through SDK
        if (videoRequired === 'docapture' || videoRequired === 'photoRequired' || videoRequired === 'videoIdent') {
          needsSdkForIdentity = true;
          sdkOnlyDocTypes.push('PASSPORT', 'ID_CARD', 'DRIVERS', 'RESIDENCE_PERMIT');
          console.log('🔒 IDENTITY documents will use SDK (video capture required)');
        }
      }
    }
    
    console.log('📋 SDK-only document types:', sdkOnlyDocTypes);
    console.log('✅ Can upload via API:', documents.filter(d => !sdkOnlyDocTypes.includes(d.documentType)).map(d => d.documentType));

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
      skippedForSdk: 0
    };

    // Sync each document
    for (const doc of documents) {
      try {
        const verificationData = doc.verificationData as any;
        
        // Skip if already synced to provider
        if (verificationData?.providerId && verificationData?.documentId) {
          console.log(`⏭️ Document ${doc.id} already synced, skipping`);
          results.synced++;
          
          // Link to session if not linked
          if (!doc.kycSessionId) {
            await prisma.kycDocument.update({
              where: { id: doc.id },
              data: { kycSessionId: kycSession.id }
            });
          }
          continue;
        }
        
        // Skip SDK-only document types
        if (sdkOnlyDocTypes.includes(doc.documentType)) {
          console.log(`⏭️ Document ${doc.id} (${doc.documentType}) requires SDK, skipping API upload`);
          results.skippedForSdk++;
          
          // Link to session if not linked
          if (!doc.kycSessionId) {
            await prisma.kycDocument.update({
              where: { id: doc.id },
              data: { kycSessionId: kycSession.id }
            });
          }
          continue;
        }

        console.log(`📤 Syncing document ${doc.id} (${doc.documentType}) via API`);

        // Read file from local storage
        let fileBuffer: Buffer;
        if (doc.fileUrl.startsWith('/uploads/')) {
          const filePath = path.join(process.cwd(), 'public', doc.fileUrl);
          fileBuffer = await readFile(filePath);
        } else if (doc.fileUrl.startsWith('http')) {
          // Vercel Blob URL - download file
          const response = await fetch(doc.fileUrl);
          const arrayBuffer = await response.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);
        } else {
          throw new Error(`Unsupported file URL format: ${doc.fileUrl}`);
        }

        // Prepare document metadata
        const docMetadata = verificationData?.metadata || {};
        const uploadMetadata: any = {
          idDocType: doc.documentType,
          country: docMetadata.country || 'POL'
        };

        if (docMetadata.idDocSubType) {
          uploadMetadata.idDocSubType = docMetadata.idDocSubType;
        }
        if (docMetadata.number) {
          uploadMetadata.number = docMetadata.number;
        }
        if (docMetadata.issuedDate) {
          uploadMetadata.issuedDate = docMetadata.issuedDate;
        }
        if (docMetadata.validUntil) {
          uploadMetadata.validUntil = docMetadata.validUntil;
        }

        // Upload to provider
        console.log(`📡 Uploading to ${kycProvider.providerId}:`, uploadMetadata);
        
        const uploadResult = await kycProvider.uploadDocument(
          applicantId,
          fileBuffer,
          doc.fileName,
          uploadMetadata,
          true // returnWarnings
        );

        if (!uploadResult.success) {
          console.error(`❌ Upload failed for ${doc.id}:`, uploadResult.error);
          results.failed++;
          results.errors.push(`${doc.fileName}: ${uploadResult.error}`);
          continue;
        }

        console.log(`✅ Document ${doc.id} uploaded:`, uploadResult);

        // Update document record
        await prisma.kycDocument.update({
          where: { id: doc.id },
          data: {
            kycSessionId: kycSession.id,
            verificationData: {
              ...verificationData,
              providerId: kycProvider.providerId,
              documentId: uploadResult.documentId,
              imageIds: uploadResult.imageIds,
              status: uploadResult.status,
              warnings: uploadResult.warnings,
              syncedAt: new Date().toISOString()
            }
          }
        });

        results.synced++;

      } catch (error: any) {
        console.error(`❌ Error syncing document ${doc.id}:`, error);
        results.failed++;
        results.errors.push(`${doc.fileName}: ${error.message}`);
      }
    }

    console.log('📊 Sync results:', results);

    // If all documents synced successfully, submit for review
    if (results.synced > 0 && results.failed === 0) {
      console.log('✅ All documents synced, submitting for review...');
      
      if (kycProvider.submitForReview) {
        try {
          const submitResult = await kycProvider.submitForReview(applicantId);
          
          if (submitResult.success) {
            console.log('✅ Applicant submitted for review to Sumsub');
            
            // Update KYC session status to PENDING_REVIEW
            await prisma.kycSession.update({
              where: { id: kycSession.id },
              data: {
                status: 'PENDING_REVIEW',
                submittedAt: new Date(),
                metadata: {
                  ...(kycSession.metadata as any || {}),
                  submittedForReview: true,
                  submittedAt: new Date().toISOString()
                }
              }
            });
          } else {
            console.warn('⚠️ Failed to submit for review:', submitResult.error);
          }
        } catch (submitError: any) {
          console.error('❌ Submit for review error:', submitError);
        }
      }
    }

    // Log audit
    await auditService.logUserAction(
      userId,
      AUDIT_ACTIONS.KYC_DOCUMENTS_SYNCED,
      AUDIT_ENTITIES.KYC_SESSION,
      kycSession.id,
      {
        synced: results.synced,
        failed: results.failed,
        total: documents.length,
        provider: kycProvider.providerId
      }
    );

    return NextResponse.json({
      success: true,
      synced: results.synced,
      failed: results.failed,
      skippedForSdk: results.skippedForSdk,
      total: documents.length,
      useSdk: needsSdkForIdentity, // True if IDENTITY documents need SDK
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: needsSdkForIdentity 
        ? `${results.synced} document(s) synced via API. ${results.skippedForSdk} IDENTITY document(s) require SDK (Mobile Link).`
        : `${results.synced} document(s) synced successfully.`
    });

  } catch (error: any) {
    console.error('❌ Sync documents error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync documents' },
      { status: 500 }
    );
  }
}

