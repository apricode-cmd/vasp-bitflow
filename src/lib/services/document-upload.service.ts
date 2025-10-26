/**
 * Document Upload Service
 * 
 * Handles document uploads to Vercel Blob and KYCAID verification
 */

import { put, del } from '@vercel/blob';
import prisma from '@/lib/prisma';
import { kycaidService } from './kycaid';

export interface UploadResult {
  documentId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

export interface VerificationResult {
  isLive: boolean;
  confidence: number;
  extractedData?: any;
  error?: string;
}

class DocumentUploadService {
  /**
   * Upload document to Vercel Blob and save to database
   */
  async uploadDocument(
    file: File,
    sessionId: string,
    documentType: string
  ): Promise<UploadResult> {
    try {
      // Validate file
      const maxSize = 10 * 1024 * 1024; // 10 MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Allowed MIME types
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/pdf'
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split('.').pop();
      const filename = `kyc/${sessionId}/${documentType}_${timestamp}_${random}.${extension}`;

      // Upload to Vercel Blob
      const blob = await put(filename, file, {
        access: 'public',
        addRandomSuffix: false
      });

      // Save to database
      const document = await prisma.kycDocument.create({
        data: {
          kycSessionId: sessionId,
          documentType,
          fileUrl: blob.url,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        }
      });

      return {
        documentId: document.id,
        fileUrl: document.fileUrl,
        fileName: document.fileName,
        fileSize: document.fileSize
      };
    } catch (error: any) {
      console.error('Document upload error:', error);
      throw new Error(`Failed to upload document: ${error.message}`);
    }
  }

  /**
   * Verify document with KYCAID liveness check
   */
  async verifyDocumentWithKycaid(documentId: string): Promise<VerificationResult> {
    try {
      // Get document from database
      const document = await prisma.kycDocument.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Send to KYCAID for liveness check
      const verificationResult = await kycaidService.verifyDocumentLiveness(
        document.fileUrl
      );

      // Update document with verification result
      await prisma.kycDocument.update({
        where: { id: documentId },
        data: {
          verifiedByAI: verificationResult.isLive,
          verificationData: verificationResult as any
        }
      });

      return verificationResult;
    } catch (error: any) {
      console.error('Document verification error:', error);
      return {
        isLive: false,
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      // Get document
      const document = await prisma.kycDocument.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Delete from Vercel Blob
      try {
        await del(document.fileUrl);
      } catch (error) {
        console.error('Failed to delete from blob storage:', error);
        // Continue even if blob deletion fails
      }

      // Delete from database
      await prisma.kycDocument.delete({
        where: { id: documentId }
      });
    } catch (error: any) {
      console.error('Delete document error:', error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * Get documents for KYC session
   */
  async getSessionDocuments(sessionId: string): Promise<any[]> {
    return await prisma.kycDocument.findMany({
      where: { kycSessionId: sessionId },
      orderBy: { uploadedAt: 'desc' }
    });
  }

  /**
   * Check if required documents are uploaded
   */
  async checkRequiredDocuments(sessionId: string): Promise<{
    complete: boolean;
    missing: string[];
  }> {
    const documents = await this.getSessionDocuments(sessionId);
    
    const requiredTypes = ['passport', 'id_card', 'selfie'];
    const uploadedTypes = documents.map(d => d.documentType);
    
    const missing = requiredTypes.filter(type => !uploadedTypes.includes(type));

    return {
      complete: missing.length === 0,
      missing
    };
  }
}

// Export singleton instance
export const documentUploadService = new DocumentUploadService();


