/**
 * Shared types for KYC Details components
 */

import type { KycStatus } from '@prisma/client';

export interface KycProfile {
  // Personal Info
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date | string;
  placeOfBirth?: string;
  nationality?: string;
  country?: string;
  phoneNumber?: string;
  phone?: string;
  phoneCountry?: string;

  // Address
  addressStreet?: string;
  addressCity?: string;
  addressRegion?: string;
  addressCountry?: string;
  addressPostal?: string;

  // Identity Document
  idType?: string;
  idNumber?: string;
  idIssuingCountry?: string;
  idIssueDate?: Date | string;
  idExpiryDate?: Date | string;

  // PEP & Sanctions
  pepStatus?: boolean;
  pepCategory?: string;
  sanctionsScreeningDone?: boolean;
  sanctionsResult?: string;

  // Employment
  employmentStatus?: string;
  occupation?: string;
  employerName?: string;

  // Purpose & Source
  purposeOfAccount?: string;
  sourceOfFunds?: string;
  sourceOfWealth?: string;

  // Risk
  riskScore?: number;

  // Consents
  consentKyc?: boolean;
  consentAml?: boolean;
  consentTfr?: boolean;
  consentPrivacy?: boolean;
}

export interface KycDocument {
  id: string;
  type: string;
  status?: string;
  uploadedAt: Date;
  verificationData?: any;
}

export interface KycFormData {
  id: string;
  fieldName: string;
  fieldValue: string;
  fieldType: string;
}

export interface KycProvider {
  name: string;
  service: string;
  status: string;
  isEnabled: boolean;
}

export interface KycUser {
  id: string;
  email: string;
  profile: KycProfile | null;
}

export interface KycSessionDetail {
  id: string;
  userId: string;
  status: KycStatus;
  submittedAt: Date | string | null;
  reviewedAt: Date | string | null;
  rejectionReason: string | null;
  kycProviderId: string | null;
  applicantId: string | null;
  verificationId: string | null;
  kycaidVerificationId: string | null;
  kycaidApplicantId: string | null;
  metadata?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  
  user: KycUser;
  provider?: KycProvider | null;
  profile?: KycProfile | null;
  documents?: KycDocument[];
  formData?: KycFormData[];
}

