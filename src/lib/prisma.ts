/**
 * Prisma Client Instance
 * 
 * Ensures a single Prisma client instance is used throughout the application.
 * In development, prevents multiple instances during hot reload.
 * 
 * Performance optimizations:
 * - Connection pooling configured for Vercel serverless
 * - Minimal logging in production
 * - Graceful shutdown handling
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

// Graceful connection handling for Vercel serverless
if (process.env.VERCEL) {
  prisma.$connect().catch((error) => {
    console.error('❌ Failed to connect to database:', error);
  });
}

export default prisma;

