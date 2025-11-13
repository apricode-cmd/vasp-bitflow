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
      appToken: (configAny.appToken || config.metadata?.appToken || config.apiKey)?.trim(),
      secretKey: (configAny.secretKey || config.metadata?.secretKey)?.trim(),
      levelName: (configAny.levelName || config.metadata?.levelName)?.trim(),
      baseUrl: (configAny.baseUrl || config.apiEndpoint || config.metadata?.baseUrl || 'https://api.sumsub.com').trim()
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

      // Simple test: GET /resources/status/api
      // This is the simplest endpoint to check API availability
      const path = '/resources/status/api';
      
      const { headers } = this.buildRequest('GET', path);

      console.log('🧪 Testing Sumsub API status...');
      console.log('📍 URL:', this.baseUrl + path);
      console.log('🔑 App Token:', this.config.appToken?.substring(0, 10) + '...');

      const response = await fetch(this.baseUrl + path, {
        method: 'GET',
        headers
      });

      console.log('📊 Response status:', response.status);

      // 200 = success, API is available and credentials are valid
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Sumsub API status:', data);
        return {
          success: true,
          message: `Sumsub API is available - Status: ${data.status || 'OK'}`,
          timestamp: new Date(),
          metadata: {
            status: response.status,
            levelName: this.config.levelName,
            apiStatus: data
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

    return this.createApplicantWithRetry(userData, userData.externalId, 0);
  }

  /**
   * Create applicant with smart conflict resolution
   * Handles 409 Conflict when externalUserId is already taken
   */
  private async createApplicantWithRetry(
    userData: KycUserData, 
    externalUserId: string,
    attempt: number
  ): Promise<KycApplicant> {
    const MAX_ATTEMPTS = 3;

    try {
      const path = `/resources/applicants?levelName=${encodeURIComponent(this.config.levelName!)}`;
      
      // Convert country code from alpha-2 (AS, US, PL) to alpha-3 (ASM, USA, POL) for Sumsub
      const countryAlpha3 = normalizeCountryCodeForProvider(userData.nationality, 'sumsub');
      
      if (!countryAlpha3) {
        throw new Error(`Invalid or unsupported country code: ${userData.nationality}`);
      }
      
      // Prepare addresses array if address data available
      const addresses = [];
      if (userData.address || userData.city || userData.postalCode) {
        addresses.push({
          country: countryAlpha3,
          postCode: userData.postalCode || undefined,
          town: userData.city || undefined,
          street: userData.address || undefined,
          subStreet: undefined, // Can add if needed
          state: undefined, // Can add if needed
          buildingName: undefined,
          flatNumber: undefined,
          buildingNumber: undefined
        });
      }

      const bodyObj = {
        externalUserId: externalUserId, // May have suffix on retry
        email: userData.email,
        phone: userData.phone,
        fixedInfo: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          dob: userData.dateOfBirth, // YYYY-MM-DD
          placeOfBirth: (userData as any).placeOfBirth || undefined,
          country: countryAlpha3, // Country of residence - ISO3 code (USA, POL, etc.)
          nationality: countryAlpha3, // Nationality - same as country for now
          gender: (userData as any).gender || undefined, // M/F if available
          taxResidence: countryAlpha3, // Tax residence - use nationality/residence country
          addresses: addresses.length > 0 ? addresses : undefined
        }
      };

      const body = JSON.stringify(bodyObj);
      const { headers } = this.buildRequest('POST', path, body);

      console.log('📝 Creating Sumsub applicant:', { 
        email: userData.email, 
        externalId: externalUserId,
        attempt: attempt + 1,
        countryOriginal: userData.nationality,
        countryConverted: countryAlpha3
      });

      const response = await fetch(this.baseUrl + path, {
        method: 'POST',
        headers,
        body
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Sumsub applicant created:', data.id, 'externalUserId:', externalUserId);

        return {
          applicantId: data.id,
          status: data.review?.reviewStatus || 'init',
          metadata: {
            externalUserId: externalUserId, // ✅ Use the actual externalUserId we sent (may have suffix)
            sumsubExternalUserId: data.externalUserId, // What Sumsub returned
            levelName: data.levelName,
            createdAt: data.createdAt,
            email: data.email
          }
        };
      }

      // Handle 409 Conflict - applicant already exists
      if (response.status === 409) {
        const errorText = await response.text();
        console.log('⚠️  409 Conflict - applicant already exists:', errorText);

        // Try to extract applicant ID from error message
        // Example: "Applicant with external user id 'xxx' already exists: 690e7f5976808036b2e8fa38"
        const match = errorText.match(/already exists: ([a-f0-9]{24})/i);
        
        if (match && match[1]) {
          const existingApplicantId = match[1];
          console.log('🔍 Found existing applicant ID:', existingApplicantId);

          // Try to access existing applicant
          try {
            const existingApplicant = await this.getApplicantById(existingApplicantId);
            
            if (existingApplicant) {
              console.log('✅ Using existing applicant:', existingApplicantId);
              // Update metadata to include the correct externalUserId
              existingApplicant.metadata = {
                ...existingApplicant.metadata,
                externalUserId: externalUserId // The one we tried to use
              };
              return existingApplicant;
            }
          } catch (accessError: any) {
            console.log('❌ Cannot access existing applicant:', accessError.message);
            
            // Applicant exists but not accessible with current token
            // Create new one with unique externalUserId
            if (attempt < MAX_ATTEMPTS) {
              const newExternalUserId = `${userData.externalId}-${Date.now()}`;
              console.log(`🔄 Retry ${attempt + 1}/${MAX_ATTEMPTS} with new externalUserId:`, newExternalUserId);
              
              return this.createApplicantWithRetry(userData, newExternalUserId, attempt + 1);
            }
          }
        }

        // If we couldn't extract ID or max attempts reached
        if (attempt < MAX_ATTEMPTS) {
          const newExternalUserId = `${userData.externalId}-${Date.now()}`;
          console.log(`🔄 Retry ${attempt + 1}/${MAX_ATTEMPTS} with new externalUserId:`, newExternalUserId);
          
          return this.createApplicantWithRetry(userData, newExternalUserId, attempt + 1);
        }
      }

      // Other errors
      const error = await response.text();
      console.error('❌ Sumsub applicant creation failed:', error);
      throw new Error(`Failed to create applicant: ${error}`);

    } catch (error: any) {
      console.error('❌ Sumsub applicant creation error:', error);
      throw new Error(`Failed to create Sumsub applicant: ${error.message}`);
    }
  }

  /**
   * Get applicant by ID (helper method)
   */
  private async getApplicantById(applicantId: string): Promise<KycApplicant | null> {
    try {
      const path = `/resources/applicants/${applicantId}/one`;
      const { headers } = this.buildRequest('GET', path);

      const response = await fetch(this.baseUrl + path, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

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
    } catch (error) {
      return null;
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
   * 
   * Handles deactivated applicants by retrying with unique userId suffix
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
        
        // Handle deactivated applicant - retry with new userId
        if (response.status === 404 && error.includes('deactivated')) {
          console.log('⚠️ Applicant deactivated, retrying with new userId...');
          
          // Retry up to 3 times with unique userId
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            retryCount++;
            
            // Generate unique userId with timestamp + random
            const newUserId = `${externalUserId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const retryPath = `/resources/accessTokens?userId=${encodeURIComponent(newUserId)}&levelName=${encodeURIComponent(this.config.levelName!)}`;
            const { headers: retryHeaders } = this.buildRequest('POST', retryPath);
            
            console.log(`🔄 Retry ${retryCount}/${maxRetries} with userId:`, newUserId);
            
            const retryResponse = await fetch(this.baseUrl + retryPath, {
              method: 'POST',
              headers: retryHeaders
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              console.log('✅ Sumsub access token created with new applicant');
              
              return {
                token: retryData.token,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000)
              };
            }
            
            const retryError = await retryResponse.text();
            console.error(`❌ Retry ${retryCount} failed:`, retryResponse.status, retryError);
            
            // If still deactivated, try again
            if (retryResponse.status === 404 && retryError.includes('deactivated')) {
              console.log('⚠️ Still deactivated, trying another suffix...');
              continue;
            }
            
            // Other error - stop retrying
            throw new Error(`Failed to create access token: ${retryError}`);
          }
          
          // Max retries reached
          throw new Error('Failed to create access token: All applicants deactivated. Please contact support.');
        }
        
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
   * Sumsub sends X-Payload-Digest header with HMAC-SHA256 or HMAC-SHA1 signature
   * Format: "HMAC-SHA256=<hex>" or "SHA1=<hex>" or just "<hex>"
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Use webhookSecret if available, fallback to secretKey for backward compatibility
    const secretKey = (this.config as any).webhookSecret || this.config.secretKey;
    
    if (!secretKey) {
      console.warn('⚠️ Sumsub webhook secret key not configured, skipping webhook verification');
      return true; // Allow in development
    }

    try {
      // Parse signature format
      let algorithm = 'sha256';
      let signatureValue = signature;

      if (signature.includes('=')) {
        const [algo, value] = signature.split('=');
        if (algo.includes('SHA256')) {
          algorithm = 'sha256';
        } else if (algo.includes('SHA1')) {
          algorithm = 'sha1';
        }
        signatureValue = value;
      }

      console.log('🔐 Verifying webhook signature:', {
        algorithm,
        signatureLength: signatureValue.length,
        payloadLength: payload.length,
        usingWebhookSecret: !!(this.config as any).webhookSecret
      });

      const expectedSignature = crypto
        .createHmac(algorithm, secretKey)
        .update(payload)
        .digest('hex');

      // Case-insensitive comparison
      const isValid = expectedSignature.toLowerCase() === signatureValue.toLowerCase();

      if (!isValid) {
        console.error('❌ Webhook signature mismatch:', {
          expected: expectedSignature.substring(0, 20) + '...',
          received: signatureValue.substring(0, 20) + '...'
        });
      } else {
        console.log('✅ Webhook signature valid');
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

  /**
   * Upload document directly to Sumsub API
   * POST /resources/applicants/{applicantId}/info/idDoc
   */
  async uploadDocument(
    applicantId: string,
    file: Buffer | Blob,
    fileName: string,
    metadata: any,
    returnWarnings: boolean = true
  ): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Sumsub provider not configured');
      }

      const path = `/resources/applicants/${applicantId}/info/idDoc`;
      const method = 'POST';
      
      // Convert file to Buffer if needed
      let fileBuffer: Buffer;
      if (Buffer.isBuffer(file)) {
        fileBuffer = file;
      } else {
        // Blob (browser File object) - convert to buffer first
        const arrayBuffer = await (file as Blob).arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      }
      
      // Detect content type from filename
      let contentType = 'application/octet-stream';
      if (fileName.endsWith('.pdf')) {
        contentType = 'application/pdf';
      } else if (fileName.endsWith('.png')) {
        contentType = 'image/png';
      } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      }

      // CRITICAL: Build multipart body MANUALLY to avoid chunked encoding
      // This ensures the signed buffer is EXACTLY what gets sent
      const boundary = '----SumsubBoundary' + Date.now();
      
      // Build multipart parts (following RFC 2046)
      const metaPart = 
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="metadata"\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n`;
      
      const contentPart = 
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="content"; filename="${fileName}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`;
      
      const endPart = `\r\n--${boundary}--`;
      
      // Combine all parts into single buffer
      const bodyBuffer = Buffer.concat([
        Buffer.from(metaPart, 'utf-8'),
        Buffer.from(contentPart, 'utf-8'),
        fileBuffer,
        Buffer.from(endPart, 'utf-8')
      ]);

      // Calculate signature with EXACT buffer that will be sent
      const ts = Math.floor(Date.now() / 1000).toString();
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', this.config.secretKey!);
      hmac.update(ts + method.toUpperCase() + path);
      hmac.update(bodyBuffer); // Sign the EXACT buffer we'll send
      const signature = hmac.digest('hex');
      
      console.log('🔐 [SUMSUB] Signature calculation (manual multipart):', {
        timestamp: ts,
        method: method,
        path: path,
        bodySize: bodyBuffer.length,
        bodyPreview: bodyBuffer.slice(0, 100).toString('hex').substring(0, 40) + '...',
        signature: signature,
        signatureLength: signature.length,
        boundary: boundary
      });

      // Build headers with EXACT Content-Length to avoid chunked encoding
      const headers: any = {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length.toString(),
        'X-App-Token': this.config.appToken!,
        'X-App-Access-Ts': ts,
        'X-App-Access-Sig': signature
      };
      
      if (returnWarnings) {
        headers['X-Return-Doc-Warnings'] = 'true';
      }

      console.log('📤 [SUMSUB] Uploading document:', {
        applicantId,
        fileName,
        metadata,
        fileSize: fileBuffer.length,
        bodySize: bodyBuffer.length,
        boundary: boundary.substring(0, 30) + '...'
      });
      
      console.log('📡 [SUMSUB] Request headers:', {
        'Content-Type': headers['Content-Type'].substring(0, 60) + '...',
        'Content-Length': headers['Content-Length'],
        'X-App-Token': headers['X-App-Token']?.substring(0, 20) + '...',
        'X-App-Access-Ts': headers['X-App-Access-Ts'],
        'X-App-Access-Sig': headers['X-App-Access-Sig']?.substring(0, 20) + '...',
        'X-Return-Doc-Warnings': headers['X-Return-Doc-Warnings']
      });
      
      // CRITICAL: Use https.request to send EXACT buffer (avoid chunked encoding)
      // This ensures server receives EXACTLY what we signed
      const https = require('https');
      const url = new URL(`${this.baseUrl}${path}`);
      
      const responseData: any = await new Promise((resolve, reject) => {
        const req = https.request(
          {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: headers
          },
          (res: any) => {
            let raw = '';
            res.on('data', (chunk: any) => (raw += chunk));
            res.on('end', () => {
              try {
                const data = JSON.parse(raw);
                resolve({ status: res.statusCode, data });
              } catch {
                resolve({ status: res.statusCode, data: { message: raw } });
              }
            });
          }
        );
        
        req.on('error', reject);
        req.write(bodyBuffer); // Send EXACT signed buffer
        req.end();
      });

      if (responseData.status !== 200 && responseData.status !== 201) {
        console.error('❌ [SUMSUB] Upload failed:', {
          status: responseData.status,
          data: responseData.data
        });

        return {
          success: false,
          error: responseData.data.description || responseData.data.message || `Upload failed: ${responseData.status}`
        };
      }

      console.log('✅ [SUMSUB] Document uploaded:', responseData.data);

      return {
        success: true,
        documentId: responseData.data.documentId,
        imageIds: responseData.data.imageIds || [],
        status: responseData.data.reviewStatus,
        warnings: responseData.data.warnings || []
      };

    } catch (error: any) {
      console.error('❌ [SUMSUB] Upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload document'
      };
    }
  }

  /**
   * Submit applicant for review
   * POST /resources/applicants/{applicantId}/status/pending
   */
  async submitForReview(applicantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Sumsub provider not configured');
      }

      const path = `/resources/applicants/${applicantId}/status/pending`;
      const method = 'POST';
      
      const { headers } = this.buildRequest(method, path);

      const url = `${this.baseUrl}${path}`;
      console.log('🚀 [SUMSUB] Submitting for review:', { applicantId, url });

      const response = await fetch(url, {
        method,
        headers
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ [SUMSUB] Submit failed:', responseData);
        return {
          success: false,
          error: responseData.description || 'Failed to submit for review'
        };
      }

      console.log('✅ [SUMSUB] Submitted for review:', responseData);
      return { success: true };

    } catch (error: any) {
      console.error('❌ [SUMSUB] Submit error:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit for review'
      };
    }
  }

  /**
   * Check if all required documents are uploaded
   * GET /resources/applicants/{applicantId}/requiredIdDocsStatus
   */
  async checkRequiredDocuments(applicantId: string): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Sumsub provider not configured');
      }

      const path = `/resources/applicants/${applicantId}/requiredIdDocsStatus`;
      const method = 'GET';
      
      const { headers } = this.buildRequest(method, path);

      const url = `${this.baseUrl}${path}`;
      const response = await fetch(url, {
        method,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ready: false,
          missing: [],
          error: data.description || 'Failed to check documents'
        };
      }

      // Parse response - Sumsub returns structure like:
      // { "IDENTITY": { "DOC_TYPE_1": "PRESENT", "DOC_TYPE_2": "NOT_PROVIDED" } }
      const missingDocs: string[] = [];
      
      for (const [category, docs] of Object.entries(data)) {
        if (typeof docs === 'object' && docs !== null) {
          for (const [docType, status] of Object.entries(docs)) {
            if (status === 'NOT_PROVIDED' || status === 'ABSENT') {
              missingDocs.push(docType);
            }
          }
        }
      }

      return {
        ready: missingDocs.length === 0,
        missing: missingDocs
      };

    } catch (error: any) {
      console.error('❌ [SUMSUB] Check documents error:', error);
      return {
        ready: false,
        missing: [],
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const sumsubAdapter = new SumsubAdapter();

