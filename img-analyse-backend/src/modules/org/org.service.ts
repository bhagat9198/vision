/**
 * =============================================================================
 * Organization Service
 * =============================================================================
 * Business logic for organization management.
 * =============================================================================
 */

import { randomBytes } from 'crypto';
import { prisma } from '../../config/database.js';
import { redisClient } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';
import type { RegisterOrgRequest, UpdateOrgSettingsRequest, RegisterOrgResponse } from './org.types.js';

const API_KEY_CACHE_PREFIX = 'api_key:';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a secure random API key.
 */
function generateApiKey(): string {
  // Removed prefix 'img_' as per requirement
  const randomPart = randomBytes(24).toString('base64url');
  return randomPart;
}

// =============================================================================
// ORG SERVICE
// =============================================================================

export const orgService = {
  /**
   * Register a new organization.
   * Creates org + initial API key.
   */
  async register(data: RegisterOrgRequest): Promise<RegisterOrgResponse> {
    logger.info(`Registering new organization: ${data.name}`);

    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    try {
      const org = await prisma.organization.create({
        data: {
          name: data.name,
          slug,
          apiKeys: {
            create: {
              key: generateApiKey(),
              name: 'Default',
            },
          },
        },
        include: {
          apiKeys: true,
        },
      });

      const apiKey = org.apiKeys[0]!;

      logger.info(`Organization registered: ${org.id} with API key: ${apiKey.id}`);

      return {
        organization: org,
        apiKey: {
          id: apiKey.id,
          key: apiKey.key,
          name: apiKey.name,
        },
      };
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
        throw new Error(`Organization with slug '${slug}' already exists. Please choose a different name or provide a unique slug.`);
      }
      throw error;
    }
  },

  /**
   * Get organization by ID.
   */
  async getById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
    });
  },

  /**
   * Update organization settings.
   * Invalidates all cached API keys for this org.
   */
  async updateSettings(id: string, data: UpdateOrgSettingsRequest) {
    logger.info(`Updating settings for org: ${id}`);

    // First, invalidate all cached API keys for this org
    const apiKeys = await prisma.apiKey.findMany({
      where: { orgId: id },
      select: { key: true },
    });

    for (const apiKey of apiKeys) {
      const cacheKey = `${API_KEY_CACHE_PREFIX}${apiKey.key}`;
      await redisClient.del(cacheKey);
    }
    logger.debug(`Invalidated ${apiKeys.length} cached API keys for org: ${id}`);

    return prisma.organization.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.comprefaceUrl !== undefined && { comprefaceUrl: data.comprefaceUrl }),
        ...(data.comprefaceRecognitionApiKey !== undefined && {
          comprefaceRecognitionApiKey: data.comprefaceRecognitionApiKey,
        }),
        ...(data.comprefaceDetectionApiKey !== undefined && {
          comprefaceDetectionApiKey: data.comprefaceDetectionApiKey,
        }),
        ...(data.faceDetectionMode !== undefined && { faceDetectionMode: data.faceDetectionMode }),
        ...(data.imageSourceMode !== undefined && { imageSourceMode: data.imageSourceMode }),
        ...(data.sharedStoragePath !== undefined && { sharedStoragePath: data.sharedStoragePath }),
        ...(data.minConfidence !== undefined && { minConfidence: data.minConfidence }),
        ...(data.minSizePx !== undefined && { minSizePx: data.minSizePx }),
        ...(data.skipExtremeAngles !== undefined && { skipExtremeAngles: data.skipExtremeAngles }),
        ...(data.searchDefaultTopK !== undefined && { searchDefaultTopK: data.searchDefaultTopK }),
        ...(data.searchMinSimilarity !== undefined && {
          searchMinSimilarity: data.searchMinSimilarity,
        }),
        ...(data.embeddingCacheTtlSeconds !== undefined && {
          embeddingCacheTtlSeconds: data.embeddingCacheTtlSeconds,
        }),
        ...(data.pythonSidecarUrl !== undefined && { pythonSidecarUrl: data.pythonSidecarUrl }),
        ...(data.enableFallbackDetection !== undefined && {
          enableFallbackDetection: data.enableFallbackDetection,
        }),
        ...(data.enableAlignment !== undefined && { enableAlignment: data.enableAlignment }),
        // Face Recognition Provider
        ...(data.faceRecognitionProvider !== undefined && {
          faceRecognitionProvider: data.faceRecognitionProvider,
        }),
        ...(data.insightfaceModel !== undefined && { insightfaceModel: data.insightfaceModel }),

        // Clustering Settings
        ...(data.clusteringProvider !== undefined && { clusteringProvider: data.clusteringProvider }),
        ...(data.clusteringMinSamples !== undefined && { clusteringMinSamples: data.clusteringMinSamples }),
        ...(data.clusteringMinClusterSize !== undefined && { clusteringMinClusterSize: data.clusteringMinClusterSize }),
        ...(data.clusteringSimilarityThreshold !== undefined && {
          clusteringSimilarityThreshold: data.clusteringSimilarityThreshold
        }),
      },
    });
  },

  /**
   * Deactivate organization.
   */
  async deactivate(id: string) {
    logger.info(`Deactivating org: ${id}`);

    return prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });
  },

  /**
   * List all organizations (for admin purposes).
   */
  async listAll() {
    return prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },
};

