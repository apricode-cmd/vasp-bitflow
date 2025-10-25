/**
 * Admin Order Creation Validation Schema
 */

import { z } from 'zod';

export const createAdminOrderSchema = z.object({
  userEmail: z.string().email('Invalid email'),
  currencyCode: z.enum(['BTC', 'ETH', 'USDT', 'SOL']),
  fiatCurrencyCode: z.enum(['EUR', 'PLN']),
  cryptoAmount: z.number().positive('Amount must be positive'),
  walletAddress: z.string().min(26, 'Invalid wallet address').max(100),
  paymentMethodId: z.string().optional(),
  customRate: z.number().positive().optional(), // Allow admin to set custom rate
  adminNotes: z.string().optional()
});

export type CreateAdminOrderInput = z.infer<typeof createAdminOrderSchema>;

