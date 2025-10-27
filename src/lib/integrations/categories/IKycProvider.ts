/**
 * KYC Provider Interface
 * 
 * Standard interface for all KYC/Identity verification providers
 * Implementations: KYCAID, Sumsub, Onfido, etc.
 */

import { IIntegrationProvider, IntegrationCategory } from '../types';

// ==========================================
// KYC-SPECIFIC TYPES
// ==========================================

/**
 * KYC verification status (normalized across providers)
 */
export type KycVerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired';

/**
 * User data for KYC verification
 */
export interface KycUserData {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  nationality: string; // ISO2 code (e.g. "PL", "US")
  residenceCountry: string; // ISO2 code
  phone: string; // International format +48500111222
  address?: string;
  city?: string;
  postalCode?: string;
  externalId?: string; // Our internal user ID
}

/**
 * Applicant creation result
 */
export interface KycApplicant {
  applicantId: string;
  status: string;
  metadata?: Record<string, any>;
}

/**
 * Verification session result
 */
export interface KycVerificationSession {
  verificationId: string;
  applicantId: string;
  status: string;
  metadata?: Record<string, any>;
}

/**
 * Form URL result (one-time link)
 */
export interface KycFormUrl {
  url: string;
  expiresAt?: Date;
  sessionId?: string;
}

/**
 * Verification status result
 */
export interface KycVerificationResult {
  status: KycVerificationStatus;
  verificationId: string;
  rejectionReason?: string;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Document verification result
 */
export interface KycDocumentVerification {
  isLive: boolean;
  confidence: number;
  extractedData?: Record<string, any>;
  errors?: string[];
}

// ==========================================
// KYC PROVIDER INTERFACE
// ==========================================

/**
 * Interface for KYC providers
 * All KYC integrations must implement this
 */
export interface IKycProvider extends IIntegrationProvider {
  readonly category: IntegrationCategory.KYC;

  /**
   * Step 1: Create applicant in provider's system
   */
  createApplicant(userData: KycUserData): Promise<KycApplicant>;

  /**
   * Step 2: Create verification for applicant
   */
  createVerification(applicantId: string, formId?: string): Promise<KycVerificationSession>;

  /**
   * Step 3: Get one-time form URL for liveness check
   */
  getFormUrl(applicantId: string, formId?: string): Promise<KycFormUrl>;

  /**
   * Get current verification status
   */
  getVerificationStatus(verificationId: string): Promise<KycVerificationResult>;

  /**
   * Get applicant details
   */
  getApplicant(applicantId: string): Promise<KycApplicant>;

  /**
   * Verify webhook signature (for automatic status updates)
   */
  verifyWebhookSignature?(payload: string, signature: string): boolean;

  /**
   * Process webhook payload (normalize data)
   */
  processWebhook?(payload: any): {
    verificationId: string;
    applicantId: string;
    status: KycVerificationStatus;
    reason?: string;
    metadata?: Record<string, any>;
  };

  /**
   * Verify document liveness/authenticity (AI check)
   */
  verifyDocumentLiveness?(documentUrl: string): Promise<KycDocumentVerification>;
}

