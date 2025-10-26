/**
 * Admin Order Creation Validation Schema
 */

import { z } from 'zod';

export const createAdminOrderSchema = z.object({
  userEmail: z.string().email('Invalid email'),
  paymentMethodCode: z.string().min(1, 'Payment method is required'), // Required field
  currencyCode: z.enum(['BTC', 'ETH', 'USDT', 'SOL']),
  fiatCurrencyCode: z.enum(['EUR', 'PLN']),
  cryptoAmount: z.number().positive('Amount must be positive'),
  walletAddress: z.string().min(26, 'Invalid wallet address').max(100),
  blockchainCode: z.string().optional(), // Blockchain network code
  customRate: z.number().positive().optional(), // Allow admin to set custom rate
  adminNotes: z.string().optional()
});

export type CreateAdminOrderInput = z.infer<typeof createAdminOrderSchema>;

