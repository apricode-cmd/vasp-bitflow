/**
 * Order Validation Schemas
 * 
 * Zod schemas for order-related data validation.
 */

import { z } from 'zod';
import { WALLET_PATTERNS } from '@/lib/constants';

/**
 * Create order schema
 */
export const createOrderSchema = z.object({
  currencyCode: z.enum(['BTC', 'ETH', 'USDT', 'SOL'], {
    required_error: 'Cryptocurrency is required'
  }),
  fiatCurrencyCode: z.enum(['EUR', 'PLN'], {
    required_error: 'Fiat currency is required'
  }),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number'
    })
    .positive('Amount must be positive')
    .max(1000000, 'Amount is too large'),
  walletAddress: z
    .string()
    .min(26, 'Invalid wallet address')
    .max(62, 'Invalid wallet address')
    .regex(/^[a-zA-Z0-9]+$/, 'Wallet address can only contain alphanumeric characters')
}).refine((data) => {
  // Validate wallet address format based on currency
  const pattern = WALLET_PATTERNS[data.currencyCode];
  return pattern.test(data.walletAddress);
}, {
  message: 'Invalid wallet address format for selected cryptocurrency',
  path: ['walletAddress']
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Upload payment proof schema
 */
export const uploadProofSchema = z.object({
  proofUrl: z.string().url('Invalid proof URL')
});

export type UploadProofInput = z.infer<typeof uploadProofSchema>;

/**
 * PayIn data schema for status transitions
 */
export const payInDataSchema = z.object({
  amount: z.number().positive(),
  fiatCurrencyCode: z.string().optional(),
  cryptocurrencyCode: z.string().optional(),
  currencyType: z.enum(['FIAT', 'CRYPTO']),
  paymentMethodCode: z.string(),
  expectedAmount: z.number().positive().optional(),
  senderName: z.string().optional(),
  senderAccount: z.string().optional(),
  reference: z.string().optional()
});

/**
 * PayOut data schema for status transitions
 */
export const payOutDataSchema = z.object({
  amount: z.number().positive(),
  fiatCurrencyCode: z.string().optional(),
  cryptocurrencyCode: z.string().optional(),
  currencyType: z.enum(['FIAT', 'CRYPTO']),
  networkCode: z.string().optional(),
  destinationAddress: z.string().optional(),
  transactionHash: z.string().optional(),
  paymentMethodCode: z.string()
});

/**
 * Update order status schema (admin only)
 */
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'PAYMENT_PENDING',
    'PROCESSING',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED',
    'EXPIRED'
  ]),
  adminNotes: z.string().max(500).optional(),
  transactionHash: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, 'Invalid transaction hash')
    .optional()
    .nullable(), // Allow null for non-crypto orders
  payInData: payInDataSchema.optional(), // For PENDING → PAYMENT_PENDING
  payOutData: payOutDataSchema.optional() // For PROCESSING → COMPLETED
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

