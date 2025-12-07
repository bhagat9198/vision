/**
 * =============================================================================
 * API Key Service
 * =============================================================================
 * Business logic for API key management.
 * =============================================================================
 */

import { randomBytes } from 'crypto';
import { prisma } from '../../config/database.js';
import { redisClient } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';
import type { ApiKey } from '../../../generated/prisma/client.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const API_KEY_CACHE_PREFIX = 'api_key:';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a secure random API key.
 */
function generateApiKey(): string {
  const prefix = 'img_';
  const randomPart = randomBytes(24).toString('base64url');
  return `${prefix}${randomPart}`;
}

// =============================================================================
// API KEY SERVICE
// =============================================================================

export const apiKeyService = {
  /**
   * Create a new API key for an organization.
   */
  async create(orgId: string, name: string = 'Default', expiresAt?: Date) {
    logger.info(`Creating new API key for org: ${orgId}`);

    const key = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        orgId,
        key,
        name,
        expiresAt,
      },
    });

    return {
      id: apiKey.id,
      key: apiKey.key,
      name: apiKey.name,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  },

  /**
   * List all API keys for an organization.
   * Does not return the actual key values for security.
   */
  async listByOrg(orgId: string) {
    const keys = await prisma.apiKey.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k: ApiKey) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.key.substring(0, 8) + '...',
      isActive: k.isActive,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
    }));
  },

  /**
   * Revoke an API key.
   */
  async revoke(id: string) {
    logger.info(`Revoking API key: ${id}`);

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate cache
    await redisClient.del(`${API_KEY_CACHE_PREFIX}${apiKey.key}`);

    return { success: true };
  },

  /**
   * Delete an API key permanently.
   */
  async delete(id: string) {
    logger.info(`Deleting API key: ${id}`);

    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (apiKey) {
      await redisClient.del(`${API_KEY_CACHE_PREFIX}${apiKey.key}`);
      await prisma.apiKey.delete({ where: { id } });
    }

    return { success: true };
  },

  /**
   * Get API key by ID (with org check).
   */
  async getById(id: string, orgId: string) {
    return prisma.apiKey.findFirst({
      where: { id, orgId },
    });
  },
};

