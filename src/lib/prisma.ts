/**
 * Prisma Client Instance
 * 
 * Ensures a single Prisma client instance is used throughout the application.
 * In development, prevents multiple instances during hot reload.
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
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

