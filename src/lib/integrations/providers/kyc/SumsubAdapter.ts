/**
 * Sumsub Adapter
 * 
 * Full implementation of IKycProvider for Sumsub
 * Server-side only - uses App Token + Secret Key (HMAC authentication)
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
import { normalizeCountryCodeForProvider } from '@/lib/utils/country-codes';

/**
 * Sumsub-specific configuration
 */
interface SumsubConfig extends BaseIntegrationConfig {
  appToken?: string;
  secretKey?: string;
  levelName?: string;
  baseUrl?: string;
}

/**
 * Sumsub adapter implementing IKycProvider
 */
export class SumsubAdapter implements IKycProvider {
  public readonly providerId = 'sumsub';
  public readonly category = IntegrationCategory.KYC as const;
  public readonly displayName = 'Sumsub';
  public readonly description = 'AI-powered identity verification with liveness detection';
  public readonly iconUrl = '/integrations/sumsub.png';
  public readonly docsUrl = 'https://docs.sumsub.com';

  private config: SumsubConfig = {};
  private initialized = false;
  private baseUrl = 'https://api.sumsub.com';

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
      requiredFields: ['appToken', 'secretKey', 'levelName'],
      optionalFields: ['baseUrl'],
      features: [
        'KYC Verification',
        'Liveness Detection',
        'Document Verification',
        'AML Screening',
        'Webhook Support',
        'Multi-language Support',
        'WebSDK Integration'
      ],
      supportedCountries: 'all'
    };
  }

  /**
   * Initialize the provider with configuration
   */
  async initialize(config: BaseIntegrationConfig): Promise<void> {
    // Extract Sumsub-specific config
    // Config can come from:
    // 1. Direct properties (from spread of Integration.config)
    // 2. config.metadata (legacy)
    // 3. config.apiKey (for appToken)
    const configAny = config as any;
    
    this.config = {
      appToken: configAny.appToken || config.metadata?.appToken || config.apiKey,
      secretKey: configAny.secretKey || config.metadata?.secretKey,
      levelName: configAny.levelName || config.metadata?.levelName,
      baseUrl: configAny.baseUrl || config.apiEndpoint || config.metadata?.baseUrl || 'https://api.sumsub.com'
    };
    
    console.log('🔍 SumsubAdapter extracted config:', {
      appToken: this.config.appToken ? '✅ present' : '❌ missing',
      secretKey: this.config.secretKey ? '✅ present' : '❌ missing',
      levelName: this.config.levelName ? '✅ present' : '❌ missing',
      baseUrl: this.config.baseUrl
    });
    
    // Remove trailing slash
    if (this.config.baseUrl) {
      this.baseUrl = this.config.baseUrl.replace(/\/$/, '');
    }
    
    if (!this.config.appToken || !this.config.secretKey || !this.config.levelName) {
      throw new Error('Sumsub configuration incomplete: appToken, secretKey, and levelName are required');
    }
    
    this.initialized = true;
    console.log('✅ Sumsub adapter initialized:', {
      levelName: this.config.levelName,
      baseUrl: this.baseUrl
    });
  }

  /**
   * Test Sumsub connection
   */
  async test(): Promise<IntegrationTestResult> {
    try {
      if (!this.config.appToken || !this.config.secretKey) {
        return {
          success: false,
          message: 'App Token or Secret Key not configured',
          timestamp: new Date()
        };
      }

      // Test with GET /resources/applicants/-;externalUserId=test-connection
      // This will return 404 (applicant not found) but validates auth
      const externalUserId = 'test-connection-' + Date.now();
      const path = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalUserId)}`;
      
      const { headers } = this.buildRequest('GET', path);

      console.log('🧪 Testing Sumsub connection...');

      const response = await fetch(this.baseUrl + path, {
        method: 'GET',
        headers
      });

      // 404 is OK (applicant not found, but auth works!)
      // 200 is also OK (somehow applicant exists)
      if (response.ok || response.status === 404) {
        console.log('✅ Sumsub connection test passed');
        return {
          success: true,
          message: 'Sumsub connection successful - API credentials are valid',
          timestamp: new Date(),
          metadata: {
            status: response.status,
            levelName: this.config.levelName
          }
        };
      }

      // 401/403 = bad credentials
      if (response.status === 401 || response.status === 403) {
        const error = await response.text();
        console.error('❌ Sumsub auth error:', error);
        return {
          success: false,
          message: `Invalid credentials (${response.status})`,
          timestamp: new Date()
        };
      }

      // Other errors
      const error = await response.text();
      console.error('❌ Sumsub error:', response.status, error);
      
      return {
        success: false,
        message: `Sumsub test failed (${response.status}): ${error.substring(0, 100)}`,
        timestamp: new Date()
      };
    } catch (error: any) {
      console.error('❌ Sumsub connection error:', error);
      return {
        success: false,
        message: `Connection error: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return this.initialized && 
           !!this.config.appToken && 
           !!this.config.secretKey && 
           !!this.config.levelName;
  }

  /**
   * Get configuration (without sensitive data)
   */
  getConfig(): Partial<BaseIntegrationConfig> {
    return {
      apiEndpoint: this.baseUrl,
      metadata: {
        levelName: this.config.levelName,
        hasSecretKey: !!this.config.secretKey,
        hasAppToken: !!this.config.appToken
      }
    };
  }

  /**
   * Build HMAC signature for Sumsub API
   * 
   * Signature = HMAC_SHA256(secretKey, timestamp + method + path + body)
   */
  private buildSignature(ts: string, method: string, path: string, body = ''): string {
    const payload = ts + method.toUpperCase() + path + body;
    
    return crypto
      .createHmac('sha256', this.config.secretKey!)
      .update(payload)
      .digest('hex');
  }

  /**
   * Build request headers and signature
   */
  private buildRequest(method: string, path: string, body?: string): {
    headers: HeadersInit;
    ts: string;
    signature: string;
  } {
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = this.buildSignature(ts, method, path, body || '');

    const headers: HeadersInit = {
      'X-App-Token': this.config.appToken!,
      'X-App-Access-Ts': ts,
      'X-App-Access-Sig': signature
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    return { headers, ts, signature };
  }

  /**
   * Step 1: Create applicant in Sumsub
   */
  async createApplicant(userData: KycUserData): Promise<KycApplicant> {
    if (!this.isConfigured()) {
      throw new Error('Sumsub provider not configured');
    }

    try {
      const path = `/resources/applicants?levelName=${encodeURIComponent(this.config.levelName!)}`;
      
      // Convert country code from alpha-2 (AS, US, PL) to alpha-3 (ASM, USA, POL) for Sumsub
      const countryAlpha3 = normalizeCountryCodeForProvider(userData.nationality, 'sumsub');
      
      if (!countryAlpha3) {
        throw new Error(`Invalid or unsupported country code: ${userData.nationality}`);
      }
      
      const bodyObj = {
        externalUserId: userData.externalId, // Our internal user ID
        email: userData.email,
        phone: userData.phone,
        fixedInfo: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          dob: userData.dateOfBirth, // YYYY-MM-DD
          country: countryAlpha3 // ISO3 code (USA, POL, ASM, etc.)
        }
      };

      const body = JSON.stringify(bodyObj);
      const { headers } = this.buildRequest('POST', path, body);

      console.log('📝 Creating Sumsub applicant:', { 
        email: userData.email, 
        externalId: userData.externalId,
        countryOriginal: userData.nationality,
        countryConverted: countryAlpha3
      });

      const response = await fetch(this.baseUrl + path, {
        method: 'POST',
        headers,
        body
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Sumsub applicant creation failed:', error);
        throw new Error(`Failed to create applicant: ${error}`);
      }

      const data = await response.json();

      console.log('✅ Sumsub applicant created:', data.id);

      return {
        applicantId: data.id,
        status: data.review?.reviewStatus || 'init',
        metadata: {
          externalUserId: data.externalUserId,
          levelName: data.levelName,
          createdAt: data.createdAt,
          email: data.email
        }
      };
    } catch (error: any) {
      console.error('❌ Sumsub applicant creation failed:', error);
      throw new Error(`Failed to create Sumsub applicant: ${error.message}`);
    }
  }

  /**
   * Step 2: Create verification (Sumsub auto-creates on applicant creation)
   */
  async createVerification(applicantId: string, formId?: string): Promise<KycVerificationSession> {
    // Sumsub doesn't have separate verification creation
    // Verification starts automatically when applicant is created
    console.log('ℹ️ Sumsub verification auto-created for applicant:', applicantId);
    
    return {
      verificationId: applicantId, // Use applicant ID as verification ID
      applicantId: applicantId,
      status: 'init',
      metadata: {
        levelName: this.config.levelName,
        note: 'Sumsub verification is created automatically with applicant'
      }
    };
  }

  /**
   * Step 3: Get form URL (NOT USED for Sumsub - use WebSDK instead)
   * 
   * Sumsub uses WebSDK with access token issued by backend
   * Use createAccessToken() method instead
   */
  async getFormUrl(applicantId: string, formId?: string): Promise<KycFormUrl> {
    throw new Error(
      'Sumsub uses WebSDK with access token, not form URL. ' +
      'Use createAccessToken() method instead.'
    );
  }

  /**
   * Create WebSDK access token (Sumsub-specific method)
   * 
   * This token is used by frontend to initialize Sumsub WebSDK
   * API: POST /resources/accessTokens?userId={externalUserId}&levelName={levelName}
   */
  async createAccessToken(externalUserId: string): Promise<{ token: string; expiresAt: Date }> {
    if (!this.isConfigured()) {
      throw new Error('Sumsub provider not configured');
    }

    try {
      const path = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(this.config.levelName!)}`;
      
      const { headers } = this.buildRequest('POST', path);

      console.log('🎫 Creating Sumsub WebSDK access token:', { externalUserId });

      const response = await fetch(this.baseUrl + path, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Sumsub access token creation failed:', error);
        throw new Error(`Failed to create access token: ${error}`);
      }

      const data = await response.json();

      console.log('✅ Sumsub access token created');

      return {
        token: data.token,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };
    } catch (error: any) {
      console.error('❌ Sumsub access token creation failed:', error);
      throw new Error(`Failed to create Sumsub access token: ${error.message}`);
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(verificationId: string): Promise<KycVerificationResult> {
    if (!this.isConfigured()) {
      throw new Error('Sumsub provider not configured');
    }

    try {
      const applicantId = verificationId; // In Sumsub, we use applicantId as verificationId
      const path = `/resources/applicants/${encodeURIComponent(applicantId)}/status`;
      
      const { headers } = this.buildRequest('GET', path);

      console.log('📝 Getting Sumsub verification status:', verificationId);

      const response = await fetch(this.baseUrl + path, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get verification status: ${error}`);
      }

      const data = await response.json();

      console.log('✅ Sumsub status response:', {
        reviewStatus: data.reviewStatus,
        reviewAnswer: data.reviewResult?.reviewAnswer
      });

      // Map Sumsub status to our standard status
      let status: KycVerificationStatus;
      
      // Sumsub statuses:
      // - init: just created
      // - pending: under review
      // - prechecked: automated checks passed
      // - queued: waiting for manual review
      // - completed: review finished
      // - onHold: additional info needed
      
      // reviewResult.reviewAnswer:
      // - GREEN: approved
      // - RED: rejected
      // - YELLOW: retry needed
      
      switch (data.reviewStatus) {
        case 'completed':
          if (data.reviewResult?.reviewAnswer === 'GREEN') {
            status = 'approved';
          } else if (data.reviewResult?.reviewAnswer === 'RED') {
            status = 'rejected';
          } else {
            status = 'pending'; // YELLOW or other
          }
          break;
        case 'init':
        case 'pending':
        case 'prechecked':
        case 'queued':
        case 'onHold':
        default:
          status = 'pending';
      }

      // Collect rejection reasons
      const rejectLabels = data.reviewResult?.rejectLabels || [];
      const rejectionReason = rejectLabels.length > 0 ? rejectLabels.join(', ') : undefined;

      console.log('📊 Mapped status:', status);
      if (rejectionReason) {
        console.log('❌ Rejection reason:', rejectionReason);
      }

      return {
        status,
        verificationId,
        rejectionReason,
        completedAt: data.reviewStatus === 'completed' ? new Date() : undefined,
        metadata: {
          reviewStatus: data.reviewStatus,
          reviewResult: data.reviewResult,
          moderationComment: data.moderationComment,
          raw: data
        }
      };
    } catch (error: any) {
      console.error('❌ Sumsub verification status check failed:', error);
      throw new Error(`Failed to get Sumsub verification status: ${error.message}`);
    }
  }

  /**
   * Get applicant details
   */
  async getApplicant(applicantId: string): Promise<KycApplicant> {
    if (!this.isConfigured()) {
      throw new Error('Sumsub provider not configured');
    }

    try {
      const path = `/resources/applicants/${encodeURIComponent(applicantId)}/one`;
      
      const { headers } = this.buildRequest('GET', path);

      console.log('📥 Fetching Sumsub applicant:', applicantId);

      const response = await fetch(this.baseUrl + path, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get applicant: ${error}`);
      }

      const data = await response.json();

      console.log('✅ Sumsub applicant retrieved');

      return {
        applicantId: data.id,
        status: data.review?.reviewStatus || 'init',
        metadata: {
          externalUserId: data.externalUserId,
          email: data.email,
          phone: data.phone,
          createdAt: data.createdAt,
          info: data.info,
          review: data.review,
          requiredIdDocs: data.requiredIdDocs
        }
      };
    } catch (error: any) {
      console.error('❌ Sumsub get applicant failed:', error);
      throw new Error(`Failed to get Sumsub applicant: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   * 
   * Sumsub sends X-Payload-Digest header with HMAC signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.secretKey) {
      console.warn('⚠️ Sumsub secret key not configured, skipping webhook verification');
      return true; // Allow in development
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.secretKey)
        .update(payload)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.error('❌ Webhook signature mismatch');
      }

      return isValid;
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
    const applicantId = payload.applicantId || payload.applicant?.id;
    const reviewStatus = payload.reviewStatus || payload.review?.reviewStatus;
    const reviewAnswer = payload.reviewResult?.reviewAnswer;

    console.log('📥 Processing Sumsub webhook:', {
      applicantId,
      reviewStatus,
      reviewAnswer
    });

    // Map status
    let status: KycVerificationStatus = 'pending';
    
    if (reviewStatus === 'completed') {
      if (reviewAnswer === 'GREEN') {
        status = 'approved';
      } else if (reviewAnswer === 'RED') {
        status = 'rejected';
      }
    }

    // Collect rejection reasons
    const rejectLabels = payload.reviewResult?.rejectLabels || [];
    const rejectionReason = rejectLabels.length > 0 ? rejectLabels.join(', ') : undefined;

    console.log('📊 Webhook mapped status:', status);
    if (rejectionReason) {
      console.log('❌ Rejection reason:', rejectionReason);
    }

    return {
      verificationId: applicantId, // Use applicantId as verificationId
      applicantId,
      status,
      reason: rejectionReason,
      metadata: payload
    };
  }

  /**
   * Verify document liveness (optional, Sumsub handles internally)
   */
  async verifyDocumentLiveness(documentUrl: string): Promise<KycDocumentVerification> {
    // Sumsub handles liveness detection internally via WebSDK
    // This is placeholder for custom checks if needed
    return {
      isLive: true,
      confidence: 1.0,
      extractedData: {}
    };
  }
}

// Export singleton instance
export const sumsubAdapter = new SumsubAdapter();

