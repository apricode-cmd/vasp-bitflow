/**
 * Payment Method Validation Schemas
 */

import { z } from 'zod';

export const createPaymentMethodSchema = z.object({
  code: z.string().min(2).max(50),
  type: z.enum(['bank_transfer', 'card_payment', 'instant', 'crypto_transfer']),
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  
  // Direction & Provider
  direction: z.enum(['IN', 'OUT', 'BOTH']).default('IN'),
  providerType: z.enum(['MANUAL', 'BANK_ACCOUNT', 'PSP', 'CRYPTO_WALLET']).default('MANUAL'),
  automationLevel: z.enum(['MANUAL', 'SEMI_AUTO', 'FULLY_AUTO']).default('MANUAL'),
  
  // Currency
  currency: z.string().min(2).max(10),
  supportedNetworks: z.array(z.string()).optional().default([]),
  
  // Provider Connections
  paymentAccountId: z.string().optional(),
  pspConnector: z.string().optional(),
  
  // Limits & Fees
  isActive: z.boolean().optional().default(true),
  isAvailableForClients: z.boolean().optional().default(true),
  processingTime: z.string().max(100).optional(),
  minAmount: z.number().positive().optional().nullable(),
  maxAmount: z.number().positive().optional().nullable(),
  feeFixed: z.number().min(0).optional().default(0),
  feePercent: z.number().min(0).max(100).optional().default(0),
  
  // Display
  instructions: z.string().optional(),
  iconUrl: z.string().optional(),
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
  description: z.string().optional(),
  type: z.enum(['bank_transfer', 'card_payment', 'instant', 'crypto_transfer']).optional(),
  
  // Direction & Provider
  direction: z.enum(['IN', 'OUT', 'BOTH']).optional(),
  providerType: z.enum(['MANUAL', 'BANK_ACCOUNT', 'PSP', 'CRYPTO_WALLET']).optional(),
  automationLevel: z.enum(['MANUAL', 'SEMI_AUTO', 'FULLY_AUTO']).optional(),
  
  // Currency
  currency: z.string().min(2).max(10).optional(),
  supportedNetworks: z.array(z.string()).optional(),
  
  // Provider Connections
  paymentAccountId: z.string().optional().nullable(),
  pspConnector: z.string().optional().nullable(),
  
  // Limits & Fees
  isActive: z.boolean().optional(),
  isAvailableForClients: z.boolean().optional(),
  processingTime: z.string().max(100).optional(),
  minAmount: z.number().positive().optional().nullable(),
  maxAmount: z.number().positive().optional().nullable(),
  feeFixed: z.number().min(0).optional(),
  feePercent: z.number().min(0).max(100).optional(),
  
  // Display
  instructions: z.string().optional(),
  iconUrl: z.string().optional(),
  config: z.record(z.any()).optional(),
  priority: z.number().int().min(0).optional()
});

export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;

