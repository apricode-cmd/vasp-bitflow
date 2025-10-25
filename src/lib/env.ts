/**
 * Environment Variables Validation
 * 
 * Validates all required environment variables at runtime
 * to ensure the application has all necessary configuration.
 */

import { z } from 'zod';

// Prevent client-side execution
if (typeof window !== 'undefined') {
  throw new Error('This file should only run on the server');
}

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('Invalid NEXTAUTH_URL'),

  // KYCAID
  KYCAID_API_KEY: z.string().min(10, 'Invalid KYCAID_API_KEY'),
  KYCAID_FORM_ID: z.string().min(1, 'KYCAID_FORM_ID is required'),
  KYCAID_WEBHOOK_SECRET: z.string().min(20, 'KYCAID_WEBHOOK_SECRET must be at least 20 characters'),
  KYCAID_BASE_URL: z.string().url('Invalid KYCAID_BASE_URL'),

  // CoinGecko
  COINGECKO_API_URL: z.string().url('Invalid COINGECKO_API_URL'),

  // Resend
  RESEND_API_KEY: z.string().startsWith('re_', 'Invalid RESEND_API_KEY format'),
  EMAIL_FROM: z.string().email('Invalid EMAIL_FROM'),

  // Admin (for seeding)
  ADMIN_EMAIL: z.string().email('Invalid ADMIN_EMAIL'),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters'),

  // Platform
  PLATFORM_FEE: z.string().transform((val) => parseFloat(val)),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

/**
 * Validates environment variables on module load
 * Throws an error if any required variables are missing or invalid
 */
export function validateEnv(): void {
  try {
    envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;

