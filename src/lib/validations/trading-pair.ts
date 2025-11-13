/**
 * Trading Pair Validation Schemas
 */

import { z } from 'zod';

export const createTradingPairSchema = z.object({
  cryptoCode: z.string().min(2).max(10),
  fiatCode: z.string().min(2).max(10),
  minCryptoAmount: z.coerce.number().positive('Must be positive').optional().nullable().default(0.0001),
  maxCryptoAmount: z.coerce.number().positive('Must be positive').optional().nullable().default(1000),
  minFiatAmount: z.coerce.number().positive('Must be positive').optional().nullable().default(10),
  maxFiatAmount: z.coerce.number().positive('Must be positive').optional().nullable().default(100000),
  feePercent: z.coerce.number().min(0).max(100).optional().default(1.5),
  isActive: z.boolean().optional().default(true),
  priority: z.number().int().min(0).optional().default(0)
}).refine(
  (data) => {
    const max = data.maxCryptoAmount ?? 1000;
    const min = data.minCryptoAmount ?? 0.0001;
    return max > min;
  },
  {
    message: 'Max crypto amount must be greater than min',
    path: ['maxCryptoAmount']
  }
).refine(
  (data) => {
    const max = data.maxFiatAmount ?? 100000;
    const min = data.minFiatAmount ?? 10;
    return max > min;
  },
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






