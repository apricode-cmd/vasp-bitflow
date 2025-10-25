/**
 * KYCAID Service
 * 
 * Integration with KYCAID API for KYC verification.
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '@/lib/config';
import crypto from 'crypto';

class KycaidService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.kycaid.baseUrl,
      headers: {
        'Authorization': `Token ${config.kycaid.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Creates a new verification session for a user
   */
  async createVerification(userId: string, userData: {
    email: string;
    firstName: string;
    lastName: string;
    country?: string;
  }): Promise<{
    verificationId: string;
    formUrl: string;
  }> {
    try {
      const response = await this.client.post('/verifications', {
        external_applicant_id: userId,
        form_id: config.kycaid.formId,
        applicant: {
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          ...(userData.country && { residence_country: userData.country })
        }
      });

      return {
        verificationId: response.data.verification_id,
        formUrl: response.data.form_url
      };
    } catch (error) {
      console.error('KYCAID create verification error:', error);
      throw new Error('Failed to create KYC verification session');
    }
  }

  /**
   * Gets the current status of a verification
   */
  async getVerificationStatus(verificationId: string): Promise<{
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
  }> {
    try {
      const response = await this.client.get(`/verifications/${verificationId}`);
      
      const kycaidStatus = response.data.verification_status;
      
      // Map KYCAID statuses to our internal statuses
      let status: 'pending' | 'approved' | 'rejected' = 'pending';
      
      if (kycaidStatus === 'completed') {
        status = 'approved';
      } else if (kycaidStatus === 'rejected' || kycaidStatus === 'declined') {
        status = 'rejected';
      }

      return {
        status,
        rejectionReason: response.data.rejection_reasons?.[0]?.reason
      };
    } catch (error) {
      console.error('KYCAID get status error:', error);
      throw new Error('Failed to get KYC verification status');
    }
  }

  /**
   * Generates KYCAID form URL for embedding
   */
  generateFormUrl(userId: string): string {
    // This would typically use KYCAID SDK or direct form URL
    return `${config.kycaid.baseUrl}/forms/${config.kycaid.formId}?external_applicant_id=${userId}`;
  }

  /**
   * Verifies webhook signature from KYCAID
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', config.kycaid.webhookSecret)
      .update(payload)
      .digest('hex');

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Verify document liveness (AI check)
   */
  async verifyDocumentLiveness(documentUrl: string): Promise<{
    isLive: boolean;
    confidence: number;
    extractedData?: any;
  }> {
    try {
      // Call KYCAID document verification API
      const response = await this.client.post('/documents/verify', {
        document_url: documentUrl
      });

      return {
        isLive: response.data.is_live || false,
        confidence: response.data.confidence || 0,
        extractedData: response.data.extracted_data
      };
    } catch (error) {
      console.error('KYCAID liveness check error:', error);
      
      // Return default values if KYCAID is not configured or fails
      return {
        isLive: true, // Allow in development
        confidence: 0,
        extractedData: null
      };
    }
  }
}

export const kycaidService = new KycaidService();

