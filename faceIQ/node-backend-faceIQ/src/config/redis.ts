/**
 * =============================================================================
 * Redis Client Configuration
 * =============================================================================
 * Initializes and exports the Redis client for embedding caching.
 * Shared with api-node-backend for session consistency.
 * =============================================================================
 */

import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

/**
 * Redis client instance.
 * Used for caching user embeddings during search sessions.
 */
export const redisClient = new Redis({
  host: env.redisHost,
  port: env.redisPort,
  password: env.redisPassword || undefined,
  retryStrategy: (times) => {
    if (times > 3) {
      logger.error(`Redis connection failed after ${times} attempts`);
      return null; // Stop retrying
    }
    return Math.min(times * 200, 2000); // Exponential backoff
  },
  lazyConnect: true,
});

// =============================================================================
// EVENT HANDLERS
// =============================================================================

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (error) => {
  logger.error('Redis client error:', error);
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed');
});

// =============================================================================
// KEY PREFIXES
// =============================================================================

/**
 * Redis key prefixes for different data types.
 */
export const REDIS_KEYS = {
  /**
   * Embedding cache key prefix.
   * Format: face:embedding:{sessionId}
   */
  EMBEDDING: 'face:embedding:',

  /**
   * Search session key prefix.
   * Format: face:session:{sessionId}
   */
  SESSION: 'face:session:',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate embedding cache key.
 *
 * @param sessionId - Unique session identifier
 * @returns Redis key string
 */
export function getEmbeddingKey(sessionId: string): string {
  return `${REDIS_KEYS.EMBEDDING}${sessionId}`;
}

/**
 * Check if Redis is reachable.
 *
 * @returns Promise resolving to health status
 */
export async function checkRedisHealth(): Promise<{
  status: 'up' | 'down';
  responseTimeMs: number;
}> {
  const startTime = Date.now();

  try {
    await redisClient.ping();
    return {
      status: 'up',
      responseTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      status: 'down',
      responseTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Connect to Redis.
 * Call this during server startup.
 */
export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

/**
 * Disconnect from Redis.
 * Call this during graceful shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  await redisClient.quit();
  logger.info('Redis disconnected');
}

