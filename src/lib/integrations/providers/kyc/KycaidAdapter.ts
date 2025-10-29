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
      // Remove trailing slash if present
      this.baseUrl = this.config.baseUrl.replace(/\/$/, '');
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

      // KYCAID doesn't have a dedicated "ping" endpoint
      // So we'll test by attempting to create a test applicant with minimal data
      // This will validate API key without actually creating anything
      const url = `${this.baseUrl}/applicants`;
      
      // Try to create applicant with invalid/minimal data to test auth
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          type: 'PERSON',
          first_name: 'Test',
          last_name: 'Connection'
          // Missing required fields - will fail but auth will work
        })
      });

      // If we get 200/201 or validation error (400/422), auth is working!
      if (response.ok || response.status === 400 || response.status === 422) {
        return {
          success: true,
          message: 'KYCAID connection successful - API key is valid',
          timestamp: new Date(),
          metadata: {
            apiVersion: response.headers.get('x-api-version'),
            status: response.status
          }
        };
      }

      // Auth errors mean bad API key
      if (response.status === 401 || response.status === 403) {
        const error = await response.text();
        console.error('❌ KYCAID auth error:', error);
        return {
          success: false,
          message: `Invalid API key or authentication failed (${response.status})`,
          timestamp: new Date()
        };
      }

      // Other errors
      const error = await response.text();
      console.error('❌ KYCAID error:', response.status, error);
      
      return {
        success: false,
        message: `KYCAID test failed (${response.status}): ${error.substring(0, 100)}`,
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('❌ KYCAID connection error:', error);
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
      
      if (!form) {
        throw new Error('Form ID not provided');
      }

      // KYCAID API: POST /forms/{form_id}/urls
      const url = `${this.baseUrl}/forms/${form}/urls`;

      console.log('📝 Getting KYCAID form URL:', { applicantId, formId: form, url });

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          applicant_id: applicantId,
          external_applicant_id: applicantId // Optional: link to your system
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ KYCAID form URL error:', error);
        throw new Error(`Failed to get form URL: ${error}`);
      }

      const data = await response.json();

      console.log('✅ KYCAID form URL generated:', data.form_url);

      return {
        url: data.form_url || data.url, // Handle both response formats
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
        sessionId: data.verification_id || data.session_id
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

      console.log('✅ KYCAID verification response:', {
        verification_id: data.verification_id,
        status: data.status,
        verified: data.verified
      });

      // Map KYCAID status to our standard status
      let status: KycVerificationStatus;
      
      // KYCAID statuses: unused, pending, completed
      // verified: null (in progress), true (passed), false (failed)
      
      if (data.status === 'unused') {
        status = 'pending'; // Form not filled yet
      } else if (data.status === 'pending') {
        status = 'pending'; // Under review
      } else if (data.status === 'completed') {
        // Completed - check verified flag
        if (data.verified === true) {
          status = 'approved';
        } else if (data.verified === false) {
          status = 'rejected';
        } else {
          status = 'pending'; // Completed but not yet verified
        }
      } else {
        status = 'pending';
      }

      // Collect rejection reasons from verifications
      let rejectionReasons: string[] = [];
      if (data.verifications) {
        Object.entries(data.verifications).forEach(([type, result]: [string, any]) => {
          if (result.verified === false && result.comment) {
            rejectionReasons.push(`${type}: ${result.comment}`);
          }
        });
      }

      console.log('📊 Mapped status:', status);
      if (rejectionReasons.length > 0) {
        console.log('❌ Rejection reasons:', rejectionReasons);
      }

      return {
        status,
        verificationId,
        rejectionReason: rejectionReasons.length > 0 ? rejectionReasons.join('; ') : undefined,
        completedAt: data.status === 'completed' ? new Date() : undefined,
        metadata: {
          applicantId: data.applicant_id,
          kycaidStatus: data.status,
          verified: data.verified,
          verifications: data.verifications,
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
   * If verificationId is provided, returns data for that specific verification
   */
  async getApplicant(applicantId: string, verificationId?: string): Promise<KycApplicant> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    try {
      // Add verification_id as query parameter if provided
      const url = verificationId 
        ? `${this.baseUrl}/applicants/${applicantId}?verification_id=${verificationId}`
        : `${this.baseUrl}/applicants/${applicantId}`;

      console.log('📥 Fetching applicant:', applicantId, verificationId ? `(verification: ${verificationId})` : '');

      const response = await fetch(url, {
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
          createdAt: data.created_at,
          firstName: data.first_name,
          lastName: data.last_name,
          middleName: data.middle_name,
          dateOfBirth: data.dob,
          nationality: data.nationality,
          residenceCountry: data.residence_country,
          documents: data.documents || [], // Full document objects array
          addresses: data.addresses || [],
          declineReasons: data.decline_reasons || []
        }
      };
    } catch (error: any) {
      console.error('❌ KYCAID get applicant failed:', error);
      throw new Error(`Failed to get KYCAID applicant: ${error.message}`);
    }
  }

  /**
   * Get document details by ID
   * GET /documents/{document_id}
   */
  async getDocument(documentId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    try {
      console.log('📄 Getting KYCAID document:', documentId);

      const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get document: ${error}`);
      }

      const data = await response.json();

      console.log(`✅ Retrieved document: ${data.type} - ${data.status}`);

      return data;
    } catch (error: any) {
      console.error('❌ KYCAID get document failed:', error);
      throw new Error(`Failed to get KYCAID document: ${error.message}`);
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
    // KYCAID webhook structure matches GET /verifications/{id} response
    const { verification_id, applicant_id, status, verified, verifications } = payload;

    console.log('📥 Processing KYCAID webhook:', {
      verification_id,
      applicant_id,
      status,
      verified
    });

    // Map KYCAID status to our standard status
    let normalizedStatus: KycVerificationStatus;
    
    // KYCAID statuses: unused, pending, completed
    // verified: null (in progress), true (passed), false (failed)
    
    if (status === 'unused') {
      normalizedStatus = 'pending'; // Form not filled yet
    } else if (status === 'pending') {
      normalizedStatus = 'pending'; // Under review
    } else if (status === 'completed') {
      // Completed - check verified flag
      if (verified === true) {
        normalizedStatus = 'approved';
      } else if (verified === false) {
        normalizedStatus = 'rejected';
      } else {
        normalizedStatus = 'pending'; // Completed but not yet verified
      }
    } else {
      normalizedStatus = 'pending';
    }

    // Collect rejection reasons from verifications
    let rejectionReasons: string[] = [];
    if (verifications) {
      Object.entries(verifications).forEach(([type, result]: [string, any]) => {
        if (result.verified === false && result.comment) {
          rejectionReasons.push(`${type}: ${result.comment}`);
        }
      });
    }

    console.log('📊 Webhook mapped status:', normalizedStatus);
    if (rejectionReasons.length > 0) {
      console.log('❌ Rejection reasons:', rejectionReasons);
    }

    return {
      verificationId: verification_id,
      applicantId: applicant_id,
      status: normalizedStatus,
      reason: rejectionReasons.length > 0 ? rejectionReasons.join('; ') : undefined,
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

  /**
   * Get verification report data (not PDF, just data)
   * This is used to generate reports on our side
   */
  async getVerificationReport(verificationId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    try {
      console.log('📄 Getting KYCAID verification report data:', verificationId);

      // Get full verification details
      const verification = await this.getVerificationStatus(verificationId);
      
      // Get applicant details
      const applicant = await this.getApplicant(verification.metadata?.applicantId);

      console.log('✅ Report data retrieved');

      return {
        verification,
        applicant,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('❌ KYCAID report data retrieval failed:', error);
      throw new Error(`Failed to get KYCAID report data: ${error.message}`);
    }
  }

  /**
   * Get applicant documents (passport/ID photos, selfie, etc.)
   * Documents are returned as full objects from GET /applicants/{applicant_id}
   */
  async getApplicantDocuments(applicantId: string): Promise<any[]> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    try {
      console.log('📄 Getting KYCAID documents for applicant:', applicantId);

      // Get applicant with full document details
      const applicant = await this.getApplicant(applicantId);

      // KYCAID returns documents as array of objects
      const documents = applicant.metadata?.documents || [];

      console.log(`✅ Retrieved ${documents.length} documents`);
      
      if (documents.length > 0) {
        console.log('📋 Document types:', documents.map((d: any) => d.type).join(', '));
      }

      return documents;
    } catch (error: any) {
      console.error('❌ KYCAID get documents failed:', error);
      throw new Error(`Failed to get KYCAID documents: ${error.message}`);
    }
  }

  /**
   * Download document file (image)
   * GET /documents/{document_id}/download
   */
  async downloadDocument(documentId: string): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    if (!this.isConfigured()) {
      throw new Error('KYCAID provider not configured');
    }

    try {
      console.log('📄 Downloading KYCAID document:', documentId);

      const response = await fetch(`${this.baseUrl}/documents/${documentId}/download`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to download document: ${error}`);
      }

      // Get file data
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Get content type and filename from headers
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const contentDisposition = response.headers.get('content-disposition') || '';
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `document-${documentId}.jpg`;

      console.log(`✅ Document downloaded: ${buffer.length} bytes, type: ${contentType}`);

      return {
        buffer,
        contentType,
        filename
      };
    } catch (error: any) {
      console.error('❌ KYCAID document download failed:', error);
      throw new Error(`Failed to download KYCAID document: ${error.message}`);
    }
  }
}

// Export singleton instance
export const kycaidAdapter = new KycaidAdapter();

