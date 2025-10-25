/**
 * KYC Validation Schemas
 * 
 * Zod schemas for KYC-related data validation.
 */

import { z } from 'zod';

/**
 * Start KYC verification schema
 */
export const startKycSchema = z.object({
  userId: z.string().cuid()
});

export type StartKycInput = z.infer<typeof startKycSchema>;

/**
 * KYC webhook payload schema
 */
export const kycWebhookSchema = z.object({
  verification_id: z.string(),
  verification_status: z.string(),
  external_applicant_id: z.string(),
  rejection_reasons: z.array(z.object({
    reason: z.string()
  })).optional()
});

export type KycWebhookPayload = z.infer<typeof kycWebhookSchema>;

