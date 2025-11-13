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
  placeOfBirth?: string; // Place of birth (city/country)
  gender?: 'M' | 'F'; // Gender (Male/Female)
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

/**
 * Document metadata for upload
 */
export interface KycDocumentMetadata {
  idDocType: 'PASSPORT' | 'ID_CARD' | 'UTILITY_BILL' | 'UTILITY_BILL2' | 'SELFIE' | 'DRIVERS';
  country: string; // ISO-3 code (e.g., "POL", "USA")
  idDocSubType?: 'FRONT_SIDE' | 'BACK_SIDE'; // For two-sided documents
  number?: string; // Document number
  issuedDate?: string; // Format: YYYY-MM-DD
  validUntil?: string; // Format: YYYY-MM-DD
  placeOfBirth?: string;
  dob?: string; // Format: YYYY-MM-DD
}

/**
 * Document upload result
 */
export interface KycDocumentUploadResult {
  success: boolean;
  documentId?: string;
  imageIds?: string[];
  status?: string;
  warnings?: any[];
  error?: string;
}

/**
 * Required documents check result
 */
export interface KycRequiredDocsCheck {
  ready: boolean;
  missing: string[];
  error?: string;
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

  /**
   * Upload document directly to KYC provider
   * 
   * @param applicantId - Provider's applicant ID
   * @param file - File buffer or Blob
   * @param fileName - Original file name
   * @param metadata - Document metadata (type, country, etc.)
   * @param returnWarnings - Return validation warnings (default: true)
   */
  uploadDocument?(
    applicantId: string,
    file: Buffer | Blob,
    fileName: string,
    metadata: KycDocumentMetadata,
    returnWarnings?: boolean
  ): Promise<KycDocumentUploadResult>;

  /**
   * Submit applicant for review after documents uploaded
   * 
   * @param applicantId - Provider's applicant ID
   */
  submitForReview?(applicantId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Check if all required documents are uploaded
   * 
   * @param applicantId - Provider's applicant ID
   */
  checkRequiredDocuments?(applicantId: string): Promise<KycRequiredDocsCheck>;
}

