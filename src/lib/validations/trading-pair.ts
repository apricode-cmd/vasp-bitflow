/**
 * Trading Pair Validation Schemas
 */

import { z } from 'zod';

export const createTradingPairSchema = z.object({
  cryptoCode: z.string().min(2).max(10),
  fiatCode: z.string().min(2).max(10),
  minCryptoAmount: z.number().positive('Must be positive'),
  maxCryptoAmount: z.number().positive('Must be positive'),
  minFiatAmount: z.number().positive('Must be positive'),
  maxFiatAmount: z.number().positive('Must be positive'),
  feePercent: z.number().min(0).max(100),
  isActive: z.boolean().optional().default(true),
  priority: z.number().int().min(0).optional().default(0)
}).refine(
  (data) => data.maxCryptoAmount > data.minCryptoAmount,
  {
    message: 'Max crypto amount must be greater than min',
    path: ['maxCryptoAmount']
  }
).refine(
  (data) => data.maxFiatAmount > data.minFiatAmount,
  {
    message: 'Max fiat amount must be greater than min',
    path: ['maxFiatAmount']
  }
);

export const updateTradingPairSchema = z.object({
  minCryptoAmount: z.number().positive('Must be positive').optional(),
  maxCryptoAmount: z.number().positive('Must be positive').optional(),
  minFiatAmount: z.number().positive('Must be positive').optional(),
  maxFiatAmount: z.number().positive('Must be positive').optional(),
  feePercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(0).optional()
});

export type CreateTradingPairInput = z.infer<typeof createTradingPairSchema>;
export type UpdateTradingPairInput = z.infer<typeof updateTradingPairSchema>;



