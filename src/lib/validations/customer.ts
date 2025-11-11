/**
 * Customer Validation Schemas
 * 
 * Zod schemas for customer API endpoints
 */

import { z } from 'zod';

/**
 * Create customer schema
 */
export const createCustomerSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phoneNumber: z.string().optional(),
  phoneCountry: z.string().length(2).optional(), // ISO 3166-1 alpha-2
  dateOfBirth: z.string().optional(), // ISO 8601 date
  nationality: z.string().length(2).optional(), // ISO 3166-1 alpha-2
  metadata: z.record(z.any()).optional(), // Custom metadata for partner use
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

/**
 * Update customer schema
 */
export const updateCustomerSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().optional(),
  phoneCountry: z.string().length(2).optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().length(2).optional(),
  metadata: z.record(z.any()).optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

