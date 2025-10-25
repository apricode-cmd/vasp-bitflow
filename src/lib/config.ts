/**
 * Server-side Configuration
 * 
 * Provides type-safe access to environment variables.
 * This file should ONLY be imported in server-side code (API routes, Server Components).
 */

// Prevent client-side import
if (typeof window !== 'undefined') {
  throw new Error('This file should only run on the server');
}

export const config = {
  database: {
    url: process.env.DATABASE_URL!
  },
  
  auth: {
    secret: process.env.NEXTAUTH_SECRET!,
    url: process.env.NEXTAUTH_URL!
  },
  
  kycaid: {
    apiKey: process.env.KYCAID_API_KEY!,
    formId: process.env.KYCAID_FORM_ID!,
    webhookSecret: process.env.KYCAID_WEBHOOK_SECRET!,
    baseUrl: process.env.KYCAID_BASE_URL!
  },
  
  coingecko: {
    apiUrl: process.env.COINGECKO_API_URL!
  },
  
  email: {
    apiKey: process.env.RESEND_API_KEY!,
    from: process.env.EMAIL_FROM!
  },
  
  admin: {
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!
  },
  
  platform: {
    fee: parseFloat(process.env.PLATFORM_FEE || '0.015')
  },
  
  env: {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test'
  }
} as const;

export type Config = typeof config;

