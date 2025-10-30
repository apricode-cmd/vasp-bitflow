/**
 * KYCAID Service
 * 
 * Integration with KYCAID API for KYC verification.
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '@/lib/config';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

interface KycaidConfig {
  baseUrl: string;
  apiKey: string;
  formId: string;
  webhookSecret: string;
}

class KycaidService {
  private client: AxiosInstance | null = null;
  private config: KycaidConfig | null = null;

  /**
   * Initialize KYCAID client with config from database
   */
  private async initializeClient(): Promise<void> {
    if (this.client && this.config) return; // Already initialized

    try {
      // Try to get config from database integration
      const integration = await prisma.integration.findFirst({
        where: { service: 'kycaid' }
      });

      if (integration?.apiEndpoint && integration?.apiKey) {
        // Decrypt API key
        const { decrypt } = await import('@/lib/services/encryption.service');
        const decryptedApiKey = decrypt(integration.apiKey);

        // Parse config from JSON
        let parsedConfig: any = {};
        if (integration.config && typeof integration.config === 'string') {
          try {
            parsedConfig = JSON.parse(integration.config);
          } catch (e) {
            console.warn('⚠️ Failed to parse KYCAID config JSON');
          }
        }

        this.config = {
          baseUrl: integration.apiEndpoint,
          apiKey: decryptedApiKey,
          formId: parsedConfig.formId || config.kycaid.formId,
          webhookSecret: parsedConfig.webhookSecret || config.kycaid.webhookSecret
        };

        console.log('✅ Using KYCAID config from database:', {
          baseUrl: this.config.baseUrl,
          formId: this.config.formId,
          hasApiKey: !!this.config.apiKey,
          hasWebhookSecret: !!this.config.webhookSecret
        });
      } else {
        // Fallback to env variables
        this.config = {
          baseUrl: config.kycaid.baseUrl,
          apiKey: config.kycaid.apiKey,
          formId: config.kycaid.formId,
          webhookSecret: config.kycaid.webhookSecret
        };

        console.log('⚠️ Using KYCAID config from env/fallback');
      }
    } catch (error) {
      console.error('❌ Failed to load KYCAID config from DB, using fallback:', error);
      
      // Fallback to env variables
      this.config = {
        baseUrl: config.kycaid.baseUrl,
        apiKey: config.kycaid.apiKey,
        formId: config.kycaid.formId,
        webhookSecret: config.kycaid.webhookSecret
      };
    }

    // Create axios client
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Authorization': `Token ${this.config.apiKey}`,
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
      // Initialize client if needed
      await this.initializeClient();

      if (!this.client || !this.config) {
        throw new Error('Failed to initialize KYCAID client');
      }

      const response = await this.client.post('/verifications', {
        external_applicant_id: userId,
        form_id: this.config.formId,
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
      // Initialize client if needed
      await this.initializeClient();

      if (!this.client) {
        throw new Error('Failed to initialize KYCAID client');
      }

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
  async generateFormUrl(userId: string): Promise<string> {
    // Initialize client if needed
    await this.initializeClient();

    if (!this.config) {
      throw new Error('Failed to initialize KYCAID config');
    }

    // This would typically use KYCAID SDK or direct form URL
    return `${this.config.baseUrl}/forms/${this.config.formId}?external_applicant_id=${userId}`;
  }

  /**
   * Verifies webhook signature from KYCAID
   */
  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    // Initialize config if needed
    await this.initializeClient();

    if (!this.config) {
      throw new Error('Failed to initialize KYCAID config');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
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
      // Initialize client if needed
      await this.initializeClient();

      if (!this.client) {
        throw new Error('Failed to initialize KYCAID client');
      }

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

