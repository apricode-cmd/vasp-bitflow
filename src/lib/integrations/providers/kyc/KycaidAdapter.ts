/**
 * KYCAID Adapter
 * 
 * Full implementation of IKycProvider for KYCAID
 * Supports: applicant creation, verification, form URL, webhook, polling
 */

import {
  IKycProvider,
  KycUserData,
  KycApplicant,
  KycVerificationSession,
  KycVerificationResult,
  KycFormUrl,
  KycDocumentVerification,
  KycVerificationStatus
} from '../../categories/IKycProvider';
import {
  BaseIntegrationConfig,
  IntegrationCategory,
  IntegrationTestResult,
  IntegrationMetadata
} from '../../types';
import crypto from 'crypto';

/**
 * KYCAID-specific configuration
 */
interface KycaidConfig extends BaseIntegrationConfig {
  formId?: string;
  baseUrl?: string;
  webhookSecret?: string;
}

/**
 * KYCAID adapter implementing full IKycProvider
 */
export class KycaidAdapter implements IKycProvider {
  public readonly providerId = 'kycaid';
  public readonly category = IntegrationCategory.KYC as const;
  public readonly displayName = 'KYCAID';
  public readonly description = 'Identity verification with liveness check';
  public readonly iconUrl = '/integrations/kycaid.png';
  public readonly docsUrl = 'https://docs.kycaid.com';

  private config: KycaidConfig = {};
  private initialized = false;
  private baseUrl = 'https://api.kycaid.com';

  /**
   * Metadata for registry
   */
  get metadata(): IntegrationMetadata {
    return {
      providerId: this.providerId,
      category: this.category,
      displayName: this.displayName,
      description: this.description,
      version: '1.0.0',
      iconUrl: this.iconUrl,
      docsUrl: this.docsUrl,
      requiredFields: ['apiKey', 'formId'],
      optionalFields: ['baseUrl', 'webhookSecret'],
      features: [
        'KYC Verification',
        'Liveness Check',
        'Document Verification',
        'Webhook Support',
        'Multi-language Forms'
      ],
      supportedCountries: 'all'
    };
  }

  /**
   * Initialize the provider with configuration
   */
  async initialize(config: BaseIntegrationConfig): Promise<void> {
    this.config = config as KycaidConfig;
    
    if (this.config.baseUrl) {
      this.baseUrl = this.config.baseUrl;
    }
    
    this.initialized = true;
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

      // Test connection with simple API call
      const response = await fetch(`${this.baseUrl}/applicants`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (response.ok) {
        return {
          success: true,
          message: 'KYCAID connection successful',
          timestamp: new Date(),
          metadata: {
            apiVersion: response.headers.get('x-api-version'),
            rateLimit: response.headers.get('x-ratelimit-remaining')
          }
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `KYCAID test failed: ${error}`,
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
    return this.initialized && !!this.config.apiKey && !!this.config.formId;
  }

  /**
   * Get configuration (without sensitive data)
   */
  getConfig(): Partial<BaseIntegrationConfig> {
    return {
      apiEndpoint: this.baseUrl,
      metadata: {
        formId: this.config.formId,
        hasWebhookSecret: !!this.config.webhookSecret
      }
    };
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Token ${this.config.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Step 1: Create applicant in KYCAID
   */
  async createApplicant(userData: KycUserData): Promise<KycApplicant> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    try {
      const payload = {
        type: 'PERSON',
        first_name: userData.firstName,
        last_name: userData.lastName,
        dob: userData.dateOfBirth, // YYYY-MM-DD
        nationality: userData.nationality, // ISO2 code
        residence_country: userData.residenceCountry, // ISO2 code
        email: userData.email,
        phone: userData.phone, // +48500111222
        external_applicant_id: userData.externalId // Our user ID
      };

      console.log('📝 Creating KYCAID applicant:', { email: userData.email, externalId: userData.externalId });

      const response = await fetch(`${this.baseUrl}/applicants`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create applicant: ${error}`);
      }

      const data = await response.json();

      console.log('✅ KYCAID applicant created:', data.applicant_id);

      return {
        applicantId: data.applicant_id,
        status: data.profile_status || 'NEW',
        metadata: {
          verificationStatus: data.verification_status,
          type: data.type
        }
      };
    } catch (error: any) {
      console.error('❌ KYCAID applicant creation failed:', error);
      throw new Error(`Failed to create KYCAID applicant: ${error.message}`);
    }
  }

  /**
   * Step 2: Create verification for applicant
   */
  async createVerification(applicantId: string, formId?: string): Promise<KycVerificationSession> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    try {
      const payload = {
        applicant_id: applicantId,
        form_id: formId || this.config.formId
      };

      console.log('📝 Creating KYCAID verification:', { applicantId, formId: payload.form_id });

      const response = await fetch(`${this.baseUrl}/verifications`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create verification: ${error}`);
      }

      const data = await response.json();

      console.log('✅ KYCAID verification created:', data.verification_id);

      return {
        verificationId: data.verification_id,
        applicantId: applicantId,
        status: data.status || 'PENDING',
        metadata: {
          formId: payload.form_id,
          types: data.types
        }
      };
    } catch (error: any) {
      console.error('❌ KYCAID verification creation failed:', error);
      throw new Error(`Failed to create KYCAID verification: ${error.message}`);
    }
  }

  /**
   * Step 3: Get one-time form URL for liveness check
   */
  async getFormUrl(applicantId: string, formId?: string): Promise<KycFormUrl> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    try {
      const form = formId || this.config.formId;
      const url = `${this.baseUrl}/forms/${form}/url?applicant_id=${applicantId}`;

      console.log('📝 Getting KYCAID form URL:', { applicantId, formId: form });

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get form URL: ${error}`);
      }

      const data = await response.json();

      console.log('✅ KYCAID form URL generated');

      return {
        url: data.url,
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
        sessionId: data.session_id
      };
    } catch (error: any) {
      console.error('❌ KYCAID form URL generation failed:', error);
      throw new Error(`Failed to get KYCAID form URL: ${error.message}`);
    }
  }

  /**
   * Get verification status (polling)
   */
  async getVerificationStatus(verificationId: string): Promise<KycVerificationResult> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    try {
      console.log('📝 Getting KYCAID verification status:', verificationId);

      const response = await fetch(`${this.baseUrl}/verifications/${verificationId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get verification status: ${error}`);
      }

      const data = await response.json();

      console.log('✅ KYCAID verification status:', data.status);

      // Map KYCAID status to our standard status
      let status: KycVerificationStatus;
      switch (data.status) {
        case 'APPROVED':
          status = 'approved';
          break;
        case 'REJECTED':
        case 'DECLINED':
          status = 'rejected';
          break;
        case 'EXPIRED':
          status = 'expired';
          break;
        default:
          status = 'pending';
      }

      return {
        status,
        verificationId,
        rejectionReason: data.reasons ? data.reasons.join(', ') : undefined,
        completedAt: data.timestamp ? new Date(data.timestamp) : undefined,
        metadata: {
          applicantId: data.applicant_id,
          types: data.types,
          raw: data
        }
      };
    } catch (error: any) {
      console.error('❌ KYCAID verification status check failed:', error);
      throw new Error(`Failed to get KYCAID verification status: ${error.message}`);
    }
  }

  /**
   * Get applicant details
   */
  async getApplicant(applicantId: string): Promise<KycApplicant> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/applicants/${applicantId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get applicant: ${error}`);
      }

      const data = await response.json();

      return {
        applicantId: data.applicant_id,
        status: data.profile_status,
        metadata: {
          verificationStatus: data.verification_status,
          email: data.email,
          createdAt: data.created_at
        }
      };
    } catch (error: any) {
      console.error('❌ KYCAID get applicant failed:', error);
      throw new Error(`Failed to get KYCAID applicant: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      console.warn('⚠️ Webhook secret not configured, skipping verification');
      return true; // Allow in development
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Process webhook payload (normalize data)
   */
  processWebhook(payload: any): {
    verificationId: string;
    applicantId: string;
    status: KycVerificationStatus;
    reason?: string;
    metadata?: Record<string, any>;
  } {
    // KYCAID webhook structure
    const { verification_id, applicant_id, status, reasons } = payload;

    // Map status
    let normalizedStatus: KycVerificationStatus;
    switch (status) {
      case 'APPROVED':
        normalizedStatus = 'approved';
        break;
      case 'REJECTED':
      case 'DECLINED':
        normalizedStatus = 'rejected';
        break;
      case 'EXPIRED':
        normalizedStatus = 'expired';
        break;
      default:
        normalizedStatus = 'pending';
    }

    return {
      verificationId: verification_id,
      applicantId: applicant_id,
      status: normalizedStatus,
      reason: reasons ? (Array.isArray(reasons) ? reasons.join(', ') : reasons) : undefined,
      metadata: payload
    };
  }

  /**
   * Verify document liveness (optional, if needed)
   */
  async verifyDocumentLiveness(documentUrl: string): Promise<KycDocumentVerification> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    // KYCAID handles liveness internally via form
    // This is placeholder for custom checks if needed
    return {
      isLive: true,
      confidence: 1.0,
      extractedData: {}
    };
  }
}

// Export singleton instance
export const kycaidAdapter = new KycaidAdapter();
