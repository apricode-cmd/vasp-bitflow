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
  dateOfBirth?: string;
  country?: string;
  address?: string;
  phone?: string;
}

/**
 * Verification session result
 */
export interface KycVerificationSession {
  verificationId: string;
  formUrl?: string;
  applicantId?: string;
  metadata?: Record<string, any>;
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
   * Create a new verification session for a user
   */
  createVerification(
    userId: string,
    userData: KycUserData
  ): Promise<KycVerificationSession>;

  /**
   * Get current verification status
   */
  getVerificationStatus(verificationId: string): Promise<KycVerificationResult>;

  /**
   * Generate form URL for user (if applicable)
   */
  generateFormUrl(userId: string, verificationId?: string): string;

  /**
   * Verify webhook signature (if applicable)
   */
  verifyWebhookSignature?(payload: string, signature: string): boolean;

  /**
   * Verify document liveness/authenticity (AI check)
   */
  verifyDocumentLiveness?(documentUrl: string): Promise<KycDocumentVerification>;
}

