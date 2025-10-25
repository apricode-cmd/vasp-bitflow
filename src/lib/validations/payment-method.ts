/**
 * Payment Method Validation Schemas
 */

import { z } from 'zod';

export const createPaymentMethodSchema = z.object({
  type: z.enum(['bank_transfer', 'card_payment']),
  name: z.string().min(3).max(100),
  currency: z.string().min(2).max(10),
  isActive: z.boolean().optional().default(true),
  processingTime: z.string().max(100).optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  feeFixed: z.number().min(0).optional().default(0),
  feePercent: z.number().min(0).max(100).optional().default(0),
  instructions: z.string().optional(),
  config: z.record(z.any()).optional(),
  priority: z.number().int().min(0).optional().default(0)
}).refine(
  (data) => {
    if (data.minAmount && data.maxAmount) {
      return data.maxAmount > data.minAmount;
    }
    return true;
  },
  {
    message: 'Max amount must be greater than min amount',
    path: ['maxAmount']
  }
);

export const updatePaymentMethodSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  isActive: z.boolean().optional(),
  processingTime: z.string().max(100).optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  feeFixed: z.number().min(0).optional(),
  feePercent: z.number().min(0).max(100).optional(),
  instructions: z.string().optional(),
  config: z.record(z.any()).optional(),
  priority: z.number().int().min(0).optional()
});

export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;

