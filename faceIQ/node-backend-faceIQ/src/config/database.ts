/**
 * =============================================================================
 * Database Configuration
 * =============================================================================
 * Prisma client instance for PostgreSQL database access.
 * =============================================================================
 */

import { PrismaClient } from '../../generated/prisma/client.js';
import { logger } from '../utils/logger.js';

// =============================================================================
// PRISMA CLIENT SINGLETON
// =============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma client instance.
 * Uses singleton pattern to prevent multiple instances in development.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// =============================================================================
// CONNECTION HELPERS
// =============================================================================

/**
 * Connect to database.
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Disconnect from database.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

/**
 * Check database health.
 */
export async function checkDatabaseHealth(): Promise<{ status: 'up' | 'down'; responseTimeMs?: number }> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'up',
      responseTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'down',
      responseTimeMs: Date.now() - startTime,
    };
  }
}

