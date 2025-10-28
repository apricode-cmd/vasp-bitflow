/**
 * KYC Admin Validation Schemas
 */

import { z } from 'zod';

export const approveKycSchema = z.object({
  reviewNotes: z.string().optional()
});

export const rejectKycSchema = z.object({
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
  reviewNotes: z.string().optional()
});

export const updateKycFieldSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  isRequired: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  validation: z.record(z.any()).optional(),
  options: z.record(z.any()).optional(),
  priority: z.number().int().min(0).optional()
});

export type ApproveKycInput = z.infer<typeof approveKycSchema>;
export type RejectKycInput = z.infer<typeof rejectKycSchema>;
export type UpdateKycFieldInput = z.infer<typeof updateKycFieldSchema>;




