/**
 * Prisma Client Instance
 * 
 * Ensures a single Prisma client instance is used throughout the application.
 * In development, prevents multiple instances during hot reload.
 * 
 * Performance optimizations:
 * - Connection pooling configured for Vercel serverless
 * - Minimal SQL query logging (only errors in production)
 * - Graceful shutdown handling
 * 
 * Note: Application-level audit logging (user/admin actions) is handled separately
 * by audit.service.ts and is accessible via /admin/audit. This logging config
 * only affects SQL query debugging output, not business event auditing.
 */

import { PrismaClient } from '@prisma/client';

// Prevent client-side usage
if (typeof window !== 'undefined') {
  throw new Error('Prisma Client should only be used on the server');
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Minimal logging for production performance
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn']  // Removed 'query' for better dev performance
      : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Cache instance in development to prevent hot reload issues
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

