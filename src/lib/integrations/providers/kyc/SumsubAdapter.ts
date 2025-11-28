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
import { kycApiLogger } from '@/lib/services/kyc-api-logger.service';

/**
 * Sumsub-specific configuration
 */
interface SumsubConfig extends BaseIntegrationConfig {
  appToken?: string;
  secretKey?: string;
  levelName?: string;
  baseUrl?: string;
  webhookSecret?: string; // ✅ For webhook signature verification
  tokenTtlSeconds?: number; // ✅ Access token TTL (default: 3600 = 60 minutes)
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
      optionalFields: ['baseUrl', 'webhookSecret'],
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
      baseUrl: (configAny.baseUrl || config.apiEndpoint || config.metadata?.baseUrl || 'https://api.sumsub.com').trim(),
      webhookSecret: (configAny.webhookSecret || config.metadata?.webhookSecret)?.trim() // ✅ For webhook signature verification
    };
    
    console.log('🔍 SumsubAdapter extracted config:', {
      appToken: this.config.appToken ? '✅ present' : '❌ missing',
      secretKey: this.config.secretKey ? '✅ present' : '❌ missing',
      levelName: this.config.levelName ? '✅ present' : '❌ missing',
      baseUrl: this.config.baseUrl,
      webhookSecret: this.config.webhookSecret ? '✅ present' : '❌ missing' // ✅ Show in logs
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
  async createApplicant(userData: KycUserData, kycSessionId?: string): Promise<KycApplicant> {
    if (!this.isConfigured()) {
      throw new Error('Sumsub provider not configured');
    }

    return this.createApplicantWithRetry(userData, userData.externalId, 0, kycSessionId);
  }

  /**
   * Create applicant with smart conflict resolution
   * Handles 409 Conflict when externalUserId is already taken
   */
  private async createApplicantWithRetry(
    userData: KycUserData, 
    externalUserId: string,
    attempt: number,
    kycSessionId?: string
  ): Promise<KycApplicant> {
    const MAX_ATTEMPTS = 3;

    try {
      const path = `/resources/applicants?levelName=${encodeURIComponent(this.config.levelName!)}`;
      
      // Convert country codes from alpha-2 to alpha-3 for Sumsub
      // nationality: citizenship (e.g., Ukrainian = UKR)
      // residenceCountry: where they live (e.g., Poland = POL)
      const nationalityAlpha3 = normalizeCountryCodeForProvider(userData.nationality, 'sumsub');
      const residenceAlpha3 = normalizeCountryCodeForProvider(userData.residenceCountry || userData.nationality, 'sumsub');
      
      if (!nationalityAlpha3) {
        throw new Error(`Invalid or unsupported nationality code: ${userData.nationality}`);
      }
      
      if (!residenceAlpha3) {
        throw new Error(`Invalid or unsupported residence country code: ${userData.residenceCountry}`);
      }
      
      // Prepare addresses array if address data available
      const addresses = [];
      if (userData.address || userData.city || userData.postalCode) {
        addresses.push({
          country: residenceAlpha3, // Use residence country for address
          postCode: userData.postalCode || undefined,
          town: userData.city || undefined,
          street: userData.address || undefined,
          subStreet: undefined,
          state: undefined,
          buildingName: undefined,
          flatNumber: undefined,
          buildingNumber: undefined
        });
      }

      // ⚠️ OFFICIAL SUMSUB STRUCTURE (from docs):
      // - email/phone: TOP LEVEL (not in fixedInfo)
      // - gender: "M"/"F"/"X" (not "MALE"/"FEMALE")
      // - taxResidenceCountry: in fixedInfo (not taxResidence)
      const bodyObj = {
        externalUserId: externalUserId, // May have suffix on retry
        email: userData.email,          // ✅ TOP LEVEL (official docs)
        phone: userData.phone,          // ✅ TOP LEVEL (official docs)
        fixedInfo: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          dob: userData.dateOfBirth,    // YYYY-MM-DD
          placeOfBirth: (userData as any).placeOfBirth || undefined,
          country: residenceAlpha3,     // Country of residence (ISO-3)
          nationality: nationalityAlpha3, // Nationality/citizenship (ISO-3)
          gender: this.convertGenderForSumsub((userData as any).gender), // ✅ M/F/X
          taxResidenceCountry: residenceAlpha3, // ✅ taxResidenceCountry (official docs)
          addresses: addresses.length > 0 ? addresses : undefined
        }
      };

      const body = JSON.stringify(bodyObj);
      const { headers } = this.buildRequest('POST', path, body);

      console.log('📝 Creating Sumsub applicant:', { 
        email: userData.email, 
        externalId: externalUserId,
        attempt: attempt + 1,
        nationality: `${userData.nationality} → ${nationalityAlpha3}`,
        residence: `${userData.residenceCountry} → ${residenceAlpha3}`,
        taxResidence: residenceAlpha3
      });

      const startTime = Date.now();
      const response = await fetch(this.baseUrl + path, {
        method: 'POST',
        headers,
        body
      });
      const responseTime = `${Date.now() - startTime}ms`;

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Sumsub applicant created:', data.id, 'externalUserId:', externalUserId);

        // Log successful API call
        if (kycSessionId) {
          await kycApiLogger.logApiRequest({
            kycSessionId,
            provider: 'sumsub',
            endpoint: path,
            method: 'POST',
            requestPayload: bodyObj,
            responsePayload: data,
            responseTime,
            statusCode: 200
          });
        }

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
              
              return this.createApplicantWithRetry(userData, newExternalUserId, attempt + 1, kycSessionId);
            }
          }
        }

        // If we couldn't extract ID or max attempts reached
        if (attempt < MAX_ATTEMPTS) {
          const newExternalUserId = `${userData.externalId}-${Date.now()}`;
          console.log(`🔄 Retry ${attempt + 1}/${MAX_ATTEMPTS} with new externalUserId:`, newExternalUserId);
          
          return this.createApplicantWithRetry(userData, newExternalUserId, attempt + 1, kycSessionId);
        }
        
        // Log 409 error
        if (kycSessionId) {
          await kycApiLogger.logApiRequest({
            kycSessionId,
            provider: 'sumsub',
            endpoint: path,
            method: 'POST',
            requestPayload: bodyObj,
            error: errorText,
            responseTime,
            statusCode: 409,
            note: 'Applicant already exists, max retries exceeded'
          });
        }
      }

      // Other errors
      const error = await response.text();
      console.error('❌ Sumsub applicant creation failed:', error);
      
      // Log error
      if (kycSessionId) {
        await kycApiLogger.logApiRequest({
          kycSessionId,
          provider: 'sumsub',
          endpoint: path,
          method: 'POST',
          requestPayload: bodyObj,
          error,
          responseTime,
          statusCode: response.status
        });
      }
      
      throw new Error(`Failed to create applicant: ${error}`);

    } catch (error: any) {
      console.error('❌ Sumsub applicant creation error:', error);
      
      // Log exception
      if (kycSessionId) {
        await kycApiLogger.logApiRequest({
          kycSessionId,
          provider: 'sumsub',
          endpoint: '/resources/applicants',
          method: 'POST',
          requestPayload: {
            externalUserId,
            email: userData.email
          },
          error: error.message
        });
      }
      
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
      // Use config value or default to 1209600 seconds (14 days = 2 weeks)
      // This is the maximum TTL supported by Sumsub
      // https://docs.sumsub.com/reference/access-tokens-for-sdks
      const ttlInSecs = this.config.tokenTtlSeconds || 1209600;
      const path = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(this.config.levelName!)}&ttlInSecs=${ttlInSecs}`;
      
      const { headers } = this.buildRequest('POST', path);

      console.log('🎫 Creating Sumsub WebSDK access token:', { externalUserId });

      const response = await fetch(this.baseUrl + path, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Sumsub access token creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error,
          externalUserId,
          ttlInSecs
        });
        
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
            const retryPath = `/resources/accessTokens?userId=${encodeURIComponent(newUserId)}&levelName=${encodeURIComponent(this.config.levelName!)}&ttlInSecs=${ttlInSecs}`;
            const { headers: retryHeaders } = this.buildRequest('POST', retryPath);
            
            console.log(`🔄 Retry ${retryCount}/${maxRetries} with userId:`, newUserId);
            
            const retryResponse = await fetch(this.baseUrl + retryPath, {
              method: 'POST',
              headers: retryHeaders
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              console.log('✅ Sumsub access token created with new applicant', {
                newUserId,
                ttlInSecs,
                expiresAt: new Date(Date.now() + ttlInSecs * 1000)
              });
              
              return {
                token: retryData.token,
                expiresAt: new Date(Date.now() + ttlInSecs * 1000)
              };
            }
            
            const retryError = await retryResponse.text();
            console.error(`❌ Retry ${retryCount} failed:`, {
              status: retryResponse.status,
              statusText: retryResponse.statusText,
              error: retryError,
              userId: newUserId
            });
            
            // If still deactivated, try again
            if (retryResponse.status === 404 && retryError.includes('deactivated')) {
              console.log('⚠️ Still deactivated, trying another suffix...');
              continue;
            }
            
            // Other error - stop retrying
            const errorMessage = this.parseErrorMessage(retryError, retryResponse.status);
            throw new Error(`KYC verification unavailable: ${errorMessage}`);
          }
          
          // Max retries reached
          throw new Error('KYC verification temporarily unavailable. All verification sessions are deactivated. Please contact support or try again later.');
        }
        
        // Handle other errors with user-friendly messages
        const errorMessage = this.parseErrorMessage(error, response.status);
        throw new Error(`Unable to start KYC verification: ${errorMessage}`);
      }

      const data = await response.json();

      console.log('✅ Sumsub access token created', {
        externalUserId,
        ttlInSecs,
        ttlHours: (ttlInSecs / 3600).toFixed(1),
        ttlDays: (ttlInSecs / 86400).toFixed(1),
        expiresAt: new Date(Date.now() + ttlInSecs * 1000)
      });

      return {
        token: data.token,
        expiresAt: new Date(Date.now() + ttlInSecs * 1000)
      };
    } catch (error: any) {
      console.error('❌ Sumsub access token creation failed:', {
        error: error.message,
        stack: error.stack,
        externalUserId
      });
      
      // Return user-friendly error message
      const userMessage = error.message.includes('KYC verification') 
        ? error.message 
        : `Unable to initialize KYC verification. Please try again later or contact support if the problem persists. (Error: ${error.message})`;
      
      throw new Error(userMessage);
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
      
      // Extract resubmission fields
      const reviewRejectType = data.reviewResult?.reviewRejectType || null;
      const canResubmit = reviewRejectType === 'RETRY';
      const moderationComment = data.reviewResult?.moderationComment || data.moderationComment || null;
      const clientComment = data.reviewResult?.clientComment || null;

      console.log('📊 Mapped status:', status);
      if (rejectionReason) {
        console.log('❌ Rejection reason:', rejectionReason);
        console.log('🔄 Review reject type:', reviewRejectType);
        console.log('🔄 Can resubmit:', canResubmit);
      }

      return {
        status,
        verificationId,
        rejectionReason,
        completedAt: data.reviewStatus === 'completed' ? new Date() : undefined,
        // Resubmission fields
        rejectLabels,
        reviewRejectType,
        canResubmit,
        moderationComment,
        clientComment,
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
   * Verify webhook signature (Official Sumsub implementation)
   * 
   * According to Sumsub docs (https://docs.sumsub.com/docs/webhook-manager):
   * 1. Get x-payload-digest header value and raw payload (no JSON parsing)
   * 2. Get x-payload-digest-alg header (HMAC_SHA256_HEX/HMAC_SHA512_HEX/HMAC_SHA1_HEX)
   * 3. Compute HMAC with raw bytes + algorithm from header + webhookSecret
   * 4. Compare using timingSafeEqual
   * 
   * @param payload - RAW body as string (no JSON parsing/trimming)
   * @param signature - Value from x-payload-digest header (hex string)
   * @param algorithmHeader - Value from x-payload-digest-alg header (e.g., "HMAC_SHA256_HEX")
   * @returns true if signature is valid, false otherwise
   */
  verifyWebhookSignature(payload: string, signature: string, algorithmHeader?: string): boolean {
    // ✅ Use webhookSecret (not secretKey)
    const secretKey = (this.config as any).webhookSecret || this.config.secretKey;
    
    console.log('🔐 [WEBHOOK] Checking secret config:', {
      hasWebhookSecret: !!(this.config as any).webhookSecret,
      hasSecretKey: !!this.config.secretKey,
      usingKey: (this.config as any).webhookSecret ? 'webhookSecret' : 'secretKey (fallback)',
      secretKeyLength: secretKey?.length || 0,
      secretKeyPreview: secretKey ? secretKey.substring(0, 8) + '...' : 'N/A'
    });
    
    if (!secretKey) {
      console.warn('⚠️ Sumsub webhook secret key not configured, skipping webhook verification');
      return true; // Allow in development
    }

    try {
      // ✅ Parse algorithm from x-payload-digest-alg header (official Sumsub format)
      const algHeader = (algorithmHeader || 'HMAC_SHA256_HEX').toUpperCase();
      let algorithm = 'sha256'; // default
      
      if (algHeader.includes('512')) {
        algorithm = 'sha512';
      } else if (algHeader.includes('256')) {
        algorithm = 'sha256';
      } else if (algHeader.includes('SHA1')) {
        algorithm = 'sha1'; // legacy
      }

      console.log('🔐 [WEBHOOK] Verifying signature:', {
        algorithmHeader: algHeader,
        algorithmUsed: algorithm,
        signatureLength: signature.length,
        payloadLength: payload.length,
        payloadPreview: payload.substring(0, 100) + '...',
        signatureReceived: signature.substring(0, 20) + '...'
      });

      // ✅ Compute HMAC with raw bytes (official Sumsub method)
      const expectedSignature = crypto
        .createHmac(algorithm, secretKey)
        .update(Buffer.from(payload, 'utf8')) // RAW bytes
        .digest('hex');

      // ✅ timingSafeEqual for secure comparison (official Sumsub method)
      const isValid = 
        signature.length === expectedSignature.length &&
        crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        );

      if (!isValid) {
        console.error('❌ [WEBHOOK] Signature mismatch:', {
          expected: expectedSignature.substring(0, 20) + '...',
          received: signature.substring(0, 20) + '...',
          expectedFull: expectedSignature,
          receivedFull: signature,
          algorithm: algorithm,
          algorithmHeader: algHeader,
          payloadLengthUsed: payload.length,
          secretKeyUsed: secretKey.substring(0, 8) + '...'
        });
      } else {
        console.log('✅ [WEBHOOK] Signature valid');
      }

      return isValid;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Process webhook payload (normalize data)
   * Official SumSub webhook documentation:
   * https://docs.sumsub.com/reference/webhook-structure
   */
  processWebhook(payload: any): {
    verificationId: string;
    applicantId: string;
    status: KycVerificationStatus;
    reason?: string;
    metadata?: Record<string, any>;
  } {
    const applicantId = payload.applicantId || payload.applicant?.id;
    const inspectionId = payload.inspectionId;
    const type = payload.type; // Event type (applicantCreated, applicantPending, etc.)
    const reviewStatus = payload.reviewStatus; // Current review status
    const reviewAnswer = payload.reviewResult?.reviewAnswer; // GREEN/RED/YELLOW
    const reviewRejectType = payload.reviewResult?.reviewRejectType; // FINAL/RETRY

    console.log('📥 [SUMSUB WEBHOOK] Processing:', {
      type,
      applicantId,
      inspectionId,
      reviewStatus,
      reviewAnswer,
      reviewRejectType
    });

    // Map SumSub reviewStatus to our KycVerificationStatus
    let status: KycVerificationStatus = 'pending';
    
    /**
     * Status mapping according to SumSub documentation:
     * 
     * - init: Applicant created but not submitted yet
     * - pending: Under review by SumSub
     * - queued/prechecked: Passed automatic checks, awaiting manual review
     * - onHold: Review temporarily paused
     * - awaitingService: Waiting for external service (e.g., AML)
     * - awaitingUser: Waiting for user action (resubmission)
     * - completed: Review finished
     *   - GREEN: Approved
     *   - RED: Rejected (FINAL or RETRY)
     *   - YELLOW: Requires attention
     */
    
    switch (reviewStatus) {
      case 'init':
        // Applicant created, not submitted yet
        status = 'pending';
        break;
        
      case 'pending':
      case 'queued':
      case 'prechecked':
        // Under review
        status = 'pending';
        break;
        
      case 'onHold':
      case 'awaitingService':
      case 'awaitingUser':
        // Temporarily paused, treat as pending
        status = 'pending';
        break;
        
      case 'completed':
        // Final decision made
        if (reviewAnswer === 'GREEN') {
          status = 'approved';
        } else if (reviewAnswer === 'RED') {
          // Always rejected for RED (regardless of FINAL/RETRY)
          // Resubmission eligibility is determined by attempts count in UI/API
          status = 'rejected';
        } else if (reviewAnswer === 'YELLOW') {
          // Requires attention but not final rejection
          status = 'pending';
        } else {
          // Completed but no clear answer - treat as pending
          status = 'pending';
        }
        break;
        
      default:
        // Unknown status - default to pending
        console.warn('⚠️ [SUMSUB] Unknown reviewStatus:', reviewStatus);
        status = 'pending';
    }

    // Collect rejection reasons
    const rejectLabels = payload.reviewResult?.rejectLabels || [];
    const moderationComment = payload.reviewResult?.moderationComment;
    const clientComment = payload.reviewResult?.clientComment;
    
    let rejectionReason: string | undefined;
    if (rejectLabels.length > 0) {
      rejectionReason = rejectLabels.join(', ');
    } else if (moderationComment) {
      rejectionReason = moderationComment;
    } else if (clientComment) {
      rejectionReason = clientComment;
    }

    console.log('✅ [SUMSUB WEBHOOK] Mapped:', {
      from: { reviewStatus, reviewAnswer, reviewRejectType },
      to: status,
      reason: rejectionReason
    });

    return {
      verificationId: inspectionId || applicantId, // Use inspectionId if available
      applicantId,
      status,
      reason: rejectionReason,
      metadata: {
        type, // Store original event type
        reviewStatus,
        reviewAnswer,
        reviewRejectType,
        correlationId: payload.correlationId,
        levelName: payload.levelName,
        externalUserId: payload.externalUserId,
        sandboxMode: payload.sandboxMode,
        createdAtMs: payload.createdAtMs,
        clientId: payload.clientId,
        reviewResult: payload.reviewResult
      }
    };
  }

  /**
   * Request review for resubmission
   * POST /resources/applicants/{applicantId}/status/pending
   * 
   * According to SumSub docs:
   * After uploading corrected documents, call this to trigger new review
   */
  async requestReview(applicantId: string): Promise<{ ok: number }> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Sumsub provider not configured');
      }

      const path = `/resources/applicants/${applicantId}/status/pending`;
      const method = 'POST';
      const ts = Math.floor(Date.now() / 1000).toString();

      // Calculate signature
      const signature = crypto
        .createHmac('sha256', this.config.secretKey!)
        .update(ts + method.toUpperCase() + path)
        .digest('hex');

      console.log('📤 [SUMSUB] Requesting review for applicant:', applicantId);

      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'X-App-Token': this.config.appToken!,
          'X-App-Access-Sig': signature,
          'X-App-Access-Ts': ts,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [SUMSUB] Request review failed:', {
          status: response.status,
          error: errorText
        });
        throw new Error(`Failed to request review: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ [SUMSUB] Review requested successfully:', result);

      return result;
    } catch (error) {
      console.error('❌ [SUMSUB] Request review error:', error);
      throw error;
    }
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
    returnWarnings: boolean = true,
    kycSessionId?: string
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
      
      const uploadStartTime = Date.now();
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

      const uploadTime = `${Date.now() - uploadStartTime}ms`;

      if (responseData.status !== 200 && responseData.status !== 201) {
        console.error('❌ [SUMSUB] Upload failed:', {
          status: responseData.status,
          data: responseData.data
        });

        // Log failed upload
        if (kycSessionId) {
          await kycApiLogger.logApiRequest({
            kycSessionId,
            provider: 'sumsub',
            endpoint: path,
            method: 'POST',
            requestPayload: { applicantId, fileName, metadata, fileSize: fileBuffer.length },
            error: responseData.data.description || responseData.data.message,
            responseTime: uploadTime,
            statusCode: responseData.status
          });
        }

        return {
          success: false,
          error: responseData.data.description || responseData.data.message || `Upload failed: ${responseData.status}`
        };
      }

      console.log('✅ [SUMSUB] Document uploaded:', responseData.data);

      // Log successful upload
      if (kycSessionId) {
        await kycApiLogger.logApiRequest({
          kycSessionId,
          provider: 'sumsub',
          endpoint: path,
          method: 'POST',
          requestPayload: { applicantId, fileName, metadata, fileSize: fileBuffer.length },
          responsePayload: {
            documentId: responseData.data.documentId,
            imageIds: responseData.data.imageIds,
            reviewStatus: responseData.data.reviewStatus
          },
          responseTime: uploadTime,
          statusCode: responseData.status
        });
      }

      return {
        success: true,
        documentId: responseData.data.documentId,
        imageIds: responseData.data.imageIds || [],
        status: responseData.data.reviewStatus,
        warnings: responseData.data.warnings || []
      };

    } catch (error: any) {
      console.error('❌ [SUMSUB] Upload error:', error);
      
      // Log exception
      if (kycSessionId) {
        await kycApiLogger.logApiRequest({
          kycSessionId,
          provider: 'sumsub',
          endpoint: path,
          method: 'POST',
          requestPayload: { applicantId, fileName, metadata },
          error: error.message
        });
      }
      
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
   * Get problematic documents for RETRY rejection
   * Fetches detailed step-level and image-level information
   * GET /resources/applicants/{applicantId}/requiredIdDocsStatus
   * 
   * Returns array of problematic images with:
   * - imageId
   * - documentType (IDENTITY, DRIVERS, PASSPORT, etc.)
   * - side (FRONT_SIDE, BACK_SIDE, etc.)
   * - rejectLabels (GRAPHIC_EDITOR, UNSATISFACTORY_PHOTOS, etc.)
   * - moderationComment
   * - fileName
   */
  async getProblematicDocuments(applicantId: string): Promise<any[]> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Sumsub provider not configured');
      }

      const path = `/resources/applicants/${applicantId}/requiredIdDocsStatus`;
      const method = 'GET';
      
      const { headers } = this.buildRequest(method, path);

      const url = `${this.baseUrl}${path}`;
      
      console.log('🔍 [SUMSUB] Fetching verification steps:', applicantId);
      
      const response = await fetch(url, {
        method,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [SUMSUB] Failed to fetch steps:', response.status, errorText);
        return [];
      }

      const data = await response.json();
      
      console.log('📄 [SUMSUB] Steps response structure:', Object.keys(data));
      
      // 🔍 DETAILED DEBUG: Log full response for debugging
      console.log('📋 [SUMSUB] Full response sample:', JSON.stringify(data, null, 2).substring(0, 1000));

      const problematicImages: any[] = [];

      // Parse each step (IDENTITY, PROOF_OF_RESIDENCE, etc.)
      for (const [stepName, stepData] of Object.entries(data)) {
        if (typeof stepData !== 'object' || stepData === null) continue;
        
        const step = stepData as any;
        
        // Check if step has imageReviewResults
        if (step.imageReviewResults && typeof step.imageReviewResults === 'object') {
          console.log(`🔍 [SUMSUB] Analyzing step "${stepName}" with ${Object.keys(step.imageReviewResults).length} images`);
          
          // Parse each image in the step
          for (const [imageId, imageData] of Object.entries(step.imageReviewResults)) {
            const image = imageData as any;
            
            // ✅ FIX: Sumsub returns data directly in image object, not nested in reviewResult
            // Structure: imageReviewResults[imageId] = { reviewAnswer, rejectLabels, moderationComment, ... }
            const reviewAnswer = image.reviewAnswer || 'NONE';
            const rejectLabels = image.rejectLabels || [];
            const moderationComment = image.moderationComment || '';
            const clientComment = image.clientComment || '';
            const reviewRejectType = image.reviewRejectType || 'RETRY';
            const buttonIds = image.buttonIds || [];
            
            // 🔍 DETAILED DEBUG: Log each image structure
            console.log(`   📸 Image ${imageId}:`, {
              reviewAnswer,
              rejectLabels,
              moderationComment: moderationComment.substring(0, 50)
            });
            
            // Check if image has RED reviewAnswer (rejected)
            if (reviewAnswer === 'RED') {
              
              console.log(`❌ [SUMSUB] Found problematic image ${imageId}:`, {
                stepName,
                rejectLabels,
                moderationComment: moderationComment.substring(0, 100)
              });
              
              // Extract document type info (may be in step or image level)
              const idDocType = step.idDocType || step.idDocSetType || 'UNKNOWN';
              const country = step.country || null;
              
              problematicImages.push({
                imageId,
                stepName, // IDENTITY, PROOF_OF_RESIDENCE, etc.
                documentType: idDocType, // ID_CARD, DRIVERS, PASSPORT, etc.
                country,
                reviewAnswer, // RED
                rejectLabels, // ["BAD_PROOF_OF_IDENTITY", "GRAPHIC_EDITOR", etc]
                reviewRejectType,
                moderationComment,
                clientComment,
                buttonIds
              });
            }
          }
        }
      }

      console.log(`✅ [SUMSUB] Found ${problematicImages.length} problematic images`);
      
      return problematicImages;

    } catch (error: any) {
      console.error('❌ [SUMSUB] Get problematic documents error:', error);
      return [];
    }
  }

  /**
   * Get detailed information about document images
   * GET /resources/applicants/{applicantId}/one/images
   * 
   * Alternative method to get image-level details with more metadata
   */
  async getDocumentImages(applicantId: string): Promise<any[]> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Sumsub provider not configured');
      }

      const path = `/resources/applicants/${applicantId}/one/images`;
      const method = 'GET';
      
      const { headers } = this.buildRequest(method, path);

      const url = `${this.baseUrl}${path}`;
      
      console.log('🔍 [SUMSUB] Fetching document images:', applicantId);
      
      const response = await fetch(url, {
        method,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [SUMSUB] Failed to fetch images:', response.status, errorText);
        return [];
      }

      const data = await response.json();
      
      // Response structure: { items: [...], totalItems: N }
      const items = data.items || [];
      
      console.log(`📄 [SUMSUB] Found ${items.length} document images`);

      const problematicImages: any[] = [];

      for (const image of items) {
        const reviewResult = image.reviewResult || {};
        
        // Only return rejected images (RED)
        if (reviewResult.reviewAnswer === 'RED') {
          const idDocDef = image.idDocDef || {};
          const fileMetadata = image.fileMetadata || {};
          
          console.log(`❌ [SUMSUB] Problematic image ${image.id}:`, {
            fileName: fileMetadata.fileName,
            docType: idDocDef.idDocType,
            rejectLabels: reviewResult.rejectLabels
          });
          
          problematicImages.push({
            imageId: image.id,
            fileName: fileMetadata.fileName,
            documentType: idDocDef.idDocType, // DRIVERS, PASSPORT, ID_CARD, etc.
            documentSubType: idDocDef.idDocSubType, // FRONT_SIDE, BACK_SIDE, etc.
            country: idDocDef.country,
            reviewAnswer: reviewResult.reviewAnswer, // RED
            rejectLabels: reviewResult.rejectLabels || [],
            reviewRejectType: reviewResult.reviewRejectType || 'RETRY',
            moderationComment: reviewResult.moderationComment || '',
            clientComment: reviewResult.clientComment || '',
            buttonIds: reviewResult.buttonIds || []
          });
        }
      }

      console.log(`✅ [SUMSUB] Found ${problematicImages.length} problematic images (detailed)`);
      
      return problematicImages;

    } catch (error: any) {
      console.error('❌ [SUMSUB] Get document images error:', error);
      return [];
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

  /**
   * Update applicant's fixedInfo
   * Used when user updates profile or submits updated KYC form
   */
  async updateApplicant(
    applicantId: string, 
    userData: KycUserData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Sumsub provider not configured');
      }

      const path = `/resources/applicants/${applicantId}/fixedInfo`;
      const method = 'PATCH';
      
      // Convert country codes from alpha-2 to alpha-3 for Sumsub
      const nationalityAlpha3 = normalizeCountryCodeForProvider(userData.nationality, 'sumsub');
      const residenceAlpha3 = normalizeCountryCodeForProvider(userData.residenceCountry || userData.nationality, 'sumsub');
      
      if (!nationalityAlpha3) {
        throw new Error(`Invalid nationality code: ${userData.nationality}`);
      }
      
      if (!residenceAlpha3) {
        throw new Error(`Invalid residence country code: ${userData.residenceCountry}`);
      }
      
      // Prepare addresses array
      const addresses = [];
      if (userData.address || userData.city || userData.postalCode) {
        addresses.push({
          country: residenceAlpha3,
          postCode: userData.postalCode || undefined,
          town: userData.city || undefined,
          street: userData.address || undefined,
          state: undefined
        });
      }
      
      // Build fixedInfo payload (EXACTLY as Sumsub expects for PATCH)
      // For PATCH /fixedInfo: all fields directly in body (no fixedInfo wrapper)
      const bodyObj = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        dob: userData.dateOfBirth,              // YYYY-MM-DD
        placeOfBirth: (userData as any).placeOfBirth || undefined,
        country: residenceAlpha3,               // ISO-3
        nationality: nationalityAlpha3,         // ISO-3
        email: userData.email,                  // ✅ Direct in body (for PATCH)
        phone: userData.phone,                  // ✅ Direct in body (for PATCH)
        gender: this.convertGenderForSumsub((userData as any).gender), // ✅ M/F/X
        taxResidenceCountry: residenceAlpha3,   // ✅ taxResidenceCountry (official docs)
        addresses: addresses.length > 0 ? addresses : undefined
      };
      
      // LOG the EXACT payload we're sending
      console.log('📤 [SUMSUB UPDATE] Payload to send:', JSON.stringify(bodyObj, null, 2));
      
      const body = JSON.stringify(bodyObj);
      const { headers } = this.buildRequest(method, path, body);
      
      console.log('🔄 [SUMSUB UPDATE] Updating applicant:', {
        applicantId,
        path,
        method,
        bodySize: body.length
      });
      
      const response = await fetch(this.baseUrl + path, {
        method: method,
        headers,
        body
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error('❌ [SUMSUB UPDATE] Failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        return {
          success: false,
          error: errorData.description || errorData.message || `Update failed: ${response.status}`
        };
      }
      
      const data = await response.json();
      console.log('✅ [SUMSUB UPDATE] Success! Response:', JSON.stringify(data, null, 2));
      
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Update applicant error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update applicant'
      };
    }
  }

  /**
   * Convert gender format for Sumsub
   * Our format: M | F | O | MALE | FEMALE
   * Sumsub format (official docs): M | F | X
   */
  private convertGenderForSumsub(gender?: string): string | undefined {
    if (!gender) return undefined;
    
    const mapping: Record<string, string> = {
      'M': 'M',
      'F': 'F',
      'O': 'X',
      'MALE': 'M',        // Convert from full name
      'FEMALE': 'F',      // Convert from full name
      'X': 'X'
    };
    
    const result = mapping[gender.toUpperCase()];
    
    if (!result) {
      console.warn(`⚠️ Unknown gender value: ${gender}, skipping`);
      return undefined;
    }
    
    return result;
  }

  /**
   * Request applicant check (trigger new review)
   * POST /resources/applicants/{applicantId}/status/pending
   * 
   * Used after uploading corrected documents to trigger a new review
   * https://docs.sumsub.com/reference/request-applicant-check
   */
  async requestApplicantCheck(applicantId: string, kycSessionId?: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Sumsub provider not configured');
    }

    const path = `/resources/applicants/${applicantId}/status/pending`;
    const method = 'POST';
    const ts = Math.floor(Date.now() / 1000).toString();

    // Build signature using existing method
    const signature = this.buildSignature(ts, method, path, '');

    console.log('🔐 [SUMSUB] requestApplicantCheck signature:', {
      applicantId,
      method,
      path,
      timestamp: ts
    });

    const startTime = Date.now();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-App-Token': this.config.appToken!,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': ts,
        'Content-Type': 'application/json'
      }
    });
    const responseTime = `${Date.now() - startTime}ms`;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Sumsub requestApplicantCheck failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      // Log error
      if (kycSessionId) {
        await kycApiLogger.logApiRequest({
          kycSessionId,
          provider: 'sumsub',
          endpoint: path,
          method: 'POST',
          requestPayload: { applicantId },
          error: errorText,
          responseTime,
          statusCode: response.status
        });
      }
      
      throw new Error(`Failed to request applicant check: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Sumsub applicant check requested:', result);
    
    // Log successful call
    if (kycSessionId) {
      await kycApiLogger.logApiRequest({
        kycSessionId,
        provider: 'sumsub',
        endpoint: path,
        method: 'POST',
        requestPayload: { applicantId },
        responsePayload: result,
        responseTime,
        statusCode: 200,
        note: 'Review requested after document submission'
      });
    }
  }

  /**
   * Upload document for resubmission (simplified wrapper)
   * 
   * Maps document types to Sumsub idDocType
   * Automatically detects file type and creates proper metadata
   */
  async uploadDocumentForResubmission(
    applicantId: string,
    file: File,
    documentType: string,
    kycSessionId?: string
  ): Promise<void> {
    // Map our document types to Sumsub idDocType
    let idDocType: string;
    let idDocSubType: string | undefined;

    switch (documentType) {
      case 'PASSPORT':
        idDocType = 'PASSPORT';
        break;
      case 'ID_CARD':
      case 'ID_CARD_FRONT':
        idDocType = 'ID_CARD';
        idDocSubType = 'FRONT_SIDE';
        break;
      case 'ID_CARD_BACK':
        idDocType = 'ID_CARD';
        idDocSubType = 'BACK_SIDE';
        break;
      case 'UTILITY_BILL':
      case 'PROOF_OF_ADDRESS':
        idDocType = 'UTILITY_BILL';
        break;
      case 'SELFIE':
        idDocType = 'SELFIE';
        break;
      default:
        // Default to IDENTITY if unknown
        idDocType = 'ID_CARD';
        idDocSubType = 'FRONT_SIDE';
    }

    // Build metadata
    const metadata: any = {
      idDocType,
      country: 'POL' // Default country, should be from user profile
    };

    if (idDocSubType) {
      metadata.idDocSubType = idDocSubType;
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload using existing method
    await this.uploadDocument(
      applicantId,
      buffer,
      file.name,
      metadata,
      true,
      kycSessionId
    );
  }

  /**
   * Parse Sumsub API error and return user-friendly message
   * 
   * @private
   */
  private parseErrorMessage(errorText: string, statusCode: number): string {
    try {
      // Try to parse JSON error response
      const errorJson = JSON.parse(errorText);
      
      if (errorJson.description) {
        return errorJson.description;
      }
      
      if (errorJson.message) {
        return errorJson.message;
      }
    } catch {
      // Not JSON, use raw text
    }

    // Map common HTTP status codes to user-friendly messages
    switch (statusCode) {
      case 400:
        return 'Invalid verification request. Please check your information and try again.';
      case 401:
        return 'Authentication failed. Please contact support.';
      case 403:
        return 'Access denied. Your account may not have permission to perform KYC verification.';
      case 404:
        if (errorText.includes('deactivated')) {
          return 'Your previous verification session was deactivated. A new session will be created automatically.';
        }
        return 'Verification session not found. Please try again.';
      case 409:
        return 'A verification session already exists. Please refresh the page.';
      case 429:
        return 'Too many requests. Please wait a few minutes and try again.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Verification service is temporarily unavailable. Please try again in a few minutes.';
      default:
        // Return sanitized error text (max 200 chars)
        return errorText.substring(0, 200);
    }
  }
}

// Export singleton instance
export const sumsubAdapter = new SumsubAdapter();

