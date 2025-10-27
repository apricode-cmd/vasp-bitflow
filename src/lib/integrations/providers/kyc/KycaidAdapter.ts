/**
 * KYCAID Adapter
 * 
 * Adapter for existing KYCAID service to implement IKycProvider interface
 * Wraps the existing kycaidService for backward compatibility
 */

import {
  IKycProvider,
  KycUserData,
  KycVerificationSession,
  KycVerificationResult,
  KycDocumentVerification,
  KycVerificationStatus
} from '../../categories/IKycProvider';
import {
  BaseIntegrationConfig,
  IntegrationCategory,
  IntegrationTestResult
} from '../../types';
import { kycaidService } from '@/lib/services/kycaid';
import crypto from 'crypto';

/**
 * KYCAID-specific configuration
 */
interface KycaidConfig extends BaseIntegrationConfig {
  formId?: string;
  baseUrl?: string;
}

/**
 * KYCAID adapter implementing IKycProvider
 * 
 * This adapter wraps the existing kycaidService to provide
 * a standard interface for KYC operations
 */
export class KycaidAdapter implements IKycProvider {
  public readonly providerId = 'kycaid';
  public readonly category = IntegrationCategory.KYC as const;

  private config: KycaidConfig = {};
  private initialized = false;

  /**
   * Initialize the provider with configuration
   */
  async initialize(config: BaseIntegrationConfig): Promise<void> {
    this.config = config as KycaidConfig;
    this.initialized = true;

    // Note: Existing kycaidService reads from environment variables
    // This adapter maintains compatibility while allowing future flexibility
  }

  /**
   * Test KYCAID connection
   */
  async test(): Promise<IntegrationTestResult> {
    try {
      if (!this.config.apiKey) {
        return {
          success: false,
          message: 'API key not configured',
          timestamp: new Date()
        };
      }

      // Test KYCAID API with a simple ping
      const response = await fetch('https://api.kycaid.com/verifications', {
        method: 'GET',
        headers: {
          'Authorization': `Token ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return {
          success: true,
          message: 'KYCAID connection successful',
          timestamp: new Date()
        };
      }

      return {
        success: false,
        message: `KYCAID test failed: ${response.statusText}`,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        message: `KYCAID connection error: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return this.initialized && !!this.config.apiKey;
  }

  /**
   * Get configuration (without sensitive data)
   */
  getConfig(): Partial<BaseIntegrationConfig> {
    return {
      apiEndpoint: this.config.apiEndpoint || this.config.baseUrl,
      metadata: {
        formId: this.config.formId
      }
    };
  }

  /**
   * Create verification session
   */
  async createVerification(
    userId: string,
    userData: KycUserData
  ): Promise<KycVerificationSession> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    // Use existing kycaidService
    const result = await kycaidService.createVerification(userId, {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      country: userData.country
    });

    return {
      verificationId: result.verificationId,
      formUrl: result.formUrl,
      metadata: {}
    };
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(verificationId: string): Promise<KycVerificationResult> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    // Use existing kycaidService
    const result = await kycaidService.getVerificationStatus(verificationId);

    // Map KYCAID status to standard status
    let status: KycVerificationStatus;
    switch (result.status) {
      case 'approved':
        status = 'approved';
        break;
      case 'rejected':
        status = 'rejected';
        break;
      default:
        status = 'pending';
    }

    return {
      status,
      verificationId,
      rejectionReason: result.rejectionReason,
      metadata: {}
    };
  }

  /**
   * Generate form URL
   */
  generateFormUrl(userId: string, verificationId?: string): string {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    // Use existing kycaidService
    return kycaidService.generateFormUrl(userId);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Verify document liveness
   */
  async verifyDocumentLiveness(documentUrl: string): Promise<KycDocumentVerification> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    // Use existing kycaidService
    const result = await kycaidService.verifyDocumentLiveness(documentUrl);

    return {
      isLive: result.isLive,
      confidence: result.confidence,
      extractedData: result.extractedData
    };
  }
}

// Export singleton instance for backward compatibility
export const kycaidAdapter = new KycaidAdapter();

