/**
 * API Key Validation Schemas
 */

import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().min(3).max(100),
  userId: z.string().optional(),
  permissions: z.record(z.array(z.string())),
  expiresAt: z.string().datetime().optional(),
  rateLimit: z.number().int().min(1).max(10000).optional().default(100)
});

export const updateApiKeySchema = z.object({
  name: z.string().min(3).max(100).optional(),
  permissions: z.record(z.array(z.string())).optional(),
  rateLimit: z.number().int().min(1).max(10000).optional(),
  isActive: z.boolean().optional()
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;




