/**
 * Wallet Validation Schemas
 */

import { z } from 'zod';

export const createPlatformWalletSchema = z.object({
  currencyCode: z.string().min(2).max(10),
  blockchainCode: z.string().min(2).max(20),
  address: z.string().min(26).max(100),
  label: z.string().min(1).max(100),
  isActive: z.boolean().optional().default(true)
});

export const updatePlatformWalletSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  balance: z.number().min(0).optional()
});

export const createUserWalletSchema = z.object({
  blockchainCode: z.string().min(2).max(20),
  currencyCode: z.string().min(2).max(10),
  address: z.string().min(26).max(100),
  label: z.string().min(1).max(100).optional()
});

export type CreatePlatformWalletInput = z.infer<typeof createPlatformWalletSchema>;
export type UpdatePlatformWalletInput = z.infer<typeof updatePlatformWalletSchema>;
export type CreateUserWalletInput = z.infer<typeof createUserWalletSchema>;





