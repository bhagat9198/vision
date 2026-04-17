/**
 * =============================================================================
 * Embedding Cache Service
 * =============================================================================
 * Caches user face embeddings in Redis for fast repeated searches.
 *
 * Use Case:
 * - User uploads selfie once
 * - Embedding is cached for 30 minutes (configurable TTL)
 * - Subsequent searches use cached embedding
 * - Reduces CompreFace calls and improves UX
 *
 * Key Format: face:embedding:{sessionId}
 * =============================================================================
 */

import { redisClient, getEmbeddingKey } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { CachedEmbedding } from '../types/index.js';
import type { OrgSettings } from '../modules/org/org.types.js';

// =============================================================================
// EMBEDDING CACHE SERVICE
// =============================================================================

/**
 * Service for caching face embeddings in Redis.
 * Now accepts org settings per-request for multi-tenancy.
 */
class EmbeddingCacheService {
  /**
   * Cache an embedding for a session.
   *
   * @param settings - Organization settings
   * @param sessionId - Unique session identifier
   * @param embedding - Face embedding vector
   * @param metadata - Optional metadata (bbox, confidence, etc.)
   * @returns Cache key
   */
  async cacheEmbedding(
    settings: OrgSettings,
    sessionId: string,
    embedding: number[],
    metadata?: Partial<CachedEmbedding>
  ): Promise<string> {
    const key = getEmbeddingKey(sessionId);

    const cachedData: CachedEmbedding = {
      embedding,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + settings.embeddingCacheTtlSeconds * 1000).toISOString(),
      ...metadata,
    };

    try {
      await redisClient.setex(
        key,
        settings.embeddingCacheTtlSeconds,
        JSON.stringify(cachedData)
      );

      logger.debug(`Cached embedding for session ${sessionId}, TTL: ${settings.embeddingCacheTtlSeconds}s`);
      return key;
    } catch (error) {
      logger.error(`Failed to cache embedding for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get cached embedding for a session.
   *
   * @param sessionId - Session identifier
   * @returns Cached embedding or null if not found/expired
   */
  async getEmbedding(sessionId: string): Promise<CachedEmbedding | null> {
    const key = getEmbeddingKey(sessionId);

    try {
      const data = await redisClient.get(key);

      if (!data) {
        logger.debug(`No cached embedding found for session ${sessionId}`);
        return null;
      }

      const cached = JSON.parse(data) as CachedEmbedding;
      logger.debug(`Retrieved cached embedding for session ${sessionId}`);

      return cached;
    } catch (error) {
      logger.error(`Failed to get cached embedding for session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Check if an embedding is cached for a session.
   *
   * @param sessionId - Session identifier
   * @returns True if cached, false otherwise
   */
  async hasEmbedding(sessionId: string): Promise<boolean> {
    const key = getEmbeddingKey(sessionId);

    try {
      const exists = await redisClient.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Failed to check embedding cache for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Delete cached embedding for a session.
   *
   * @param sessionId - Session identifier
   */
  async deleteEmbedding(sessionId: string): Promise<void> {
    const key = getEmbeddingKey(sessionId);

    try {
      await redisClient.del(key);
      logger.debug(`Deleted cached embedding for session ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to delete cached embedding for session ${sessionId}:`, error);
    }
  }

  /**
   * Refresh TTL for a cached embedding.
   * Useful to extend session during active browsing.
   *
   * @param settings - Organization settings
   * @param sessionId - Session identifier
   * @returns True if TTL was refreshed, false if key doesn't exist
   */
  async refreshTtl(settings: OrgSettings, sessionId: string): Promise<boolean> {
    const key = getEmbeddingKey(sessionId);

    try {
      const result = await redisClient.expire(key, settings.embeddingCacheTtlSeconds);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to refresh TTL for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a cached embedding.
   *
   * @param sessionId - Session identifier
   * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist
   */
  async getTtl(sessionId: string): Promise<number> {
    const key = getEmbeddingKey(sessionId);

    try {
      return await redisClient.ttl(key);
    } catch (error) {
      logger.error(`Failed to get TTL for session ${sessionId}:`, error);
      return -2;
    }
  }
}

// Export singleton instance
export const embeddingCacheService = new EmbeddingCacheService();

