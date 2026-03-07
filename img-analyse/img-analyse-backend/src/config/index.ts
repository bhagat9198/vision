/**
 * =============================================================================
 * Configuration - Barrel Export
 * =============================================================================
 * Centralized export of all configuration modules.
 * =============================================================================
 */

export { env } from './env.js';
export { qdrantClient, getCollectionName, checkQdrantHealth, VECTOR_DIMENSION, DISTANCE_METRIC, HNSW_CONFIG } from './qdrant.js';
export { redisClient, getEmbeddingKey, checkRedisHealth, connectRedis, disconnectRedis, REDIS_KEYS } from './redis.js';
export { prisma, checkDatabaseHealth } from './database.js';

