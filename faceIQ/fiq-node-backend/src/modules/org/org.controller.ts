/**
 * =============================================================================
 * Organization Controller
 * =============================================================================
 * HTTP handlers for organization management.
 * =============================================================================
 */

import type { Request, Response } from 'express';
import { orgService } from './org.service.js';
import { logger } from '../../utils/logger.js';
import type { Organization } from '../../../generated/prisma/client.js';
import { qdrantService } from '../../services/index.js';
import { prisma } from '../../config/database.js';

// =============================================================================
// CONTROLLERS
// =============================================================================

/**
 * POST /orgs/register
 * Register a new organization (requires MASTER_API_KEY).
 */
export async function registerOrg(req: Request, res: Response) {
  try {
    const { name, slug } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required (min 2 characters)',
      });
    }

    const result = await orgService.register({
      name: name.trim(),
      slug: slug ? slug.trim() : undefined
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Organization registered successfully. Save your API key securely!',
    });
  } catch (error: any) {
    if (error.message && error.message.includes('slug')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('Failed to register organization:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register organization',
    });
  }
}

/**
 * GET /orgs/:id
 * Get organization details.
 */
export async function getOrg(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const org = await orgService.getById(id);

    if (!org) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    // Return organization with actual API keys (not masked)
    return res.json({
      success: true,
      data: org,
    });
  } catch (error) {
    logger.error('Failed to get organization:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get organization',
    });
  }
}

/**
 * GET /orgs/:id/settings
 * Get organization settings.
 */
export async function getOrgSettings(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const org = await orgService.getById(id);

    if (!org) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    // Return settings with actual API keys (not masked)
    const settings = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      isActive: org.isActive,
      useCustomSettings: org.useCustomSettings,
      // CompreFace
      comprefaceUrl: org.comprefaceUrl,
      comprefaceRecognitionApiKey: org.comprefaceRecognitionApiKey,
      comprefaceDetectionApiKey: org.comprefaceDetectionApiKey,
      // Detection
      faceDetectionMode: org.faceDetectionMode,
      imageSourceMode: org.imageSourceMode,
      sharedStoragePath: org.sharedStoragePath,
      // Quality
      minConfidence: org.minConfidence,
      minSizePx: org.minSizePx,
      skipExtremeAngles: org.skipExtremeAngles,
      // Search
      searchDefaultTopK: org.searchDefaultTopK,
      searchMinSimilarity: org.searchMinSimilarity,
      // Cache
      embeddingCacheTtlSeconds: org.embeddingCacheTtlSeconds,
      // Python Sidecar
      pythonSidecarUrl: org.pythonSidecarUrl,
      enableFallbackDetection: org.enableFallbackDetection,
      enableAlignment: org.enableAlignment,
      // Face Recognition
      faceRecognitionProvider: org.faceRecognitionProvider,
      insightfaceModel: org.insightfaceModel,
      // Clustering
      clusteringProvider: org.clusteringProvider,
      clusteringMinSamples: org.clusteringMinSamples,
      clusteringMinClusterSize: org.clusteringMinClusterSize,
      clusteringSimilarityThreshold: org.clusteringSimilarityThreshold,
      // Timestamps
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };

    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Failed to get organization settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get organization settings',
    });
  }
}

/**
 * PATCH /orgs/:id/settings
 * Update organization settings.
 */
export async function updateOrgSettings(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const settings = req.body;

    // Verify org exists
    const existing = await orgService.getById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    const updated = await orgService.updateSettings(id, settings);

    // Don't expose sensitive keys in response
    const safeOrg = {
      ...updated,
      comprefaceRecognitionApiKey: updated.comprefaceRecognitionApiKey ? '***' : null,
      comprefaceDetectionApiKey: updated.comprefaceDetectionApiKey ? '***' : null,
    };

    return res.json({
      success: true,
      data: safeOrg,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update organization settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update settings',
    });
  }
}

/**
 * DELETE /orgs/:id
 * Deactivate organization.
 */
export async function deactivateOrg(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const existing = await orgService.getById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    await orgService.deactivate(id);

    return res.json({
      success: true,
      message: 'Organization deactivated',
    });
  } catch (error) {
    logger.error('Failed to deactivate organization:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to deactivate organization',
    });
  }
}

/**
 * GET /orgs
 * List all organizations (admin only).
 */
export async function listOrgs(req: Request, res: Response) {
  try {
    const orgs = await orgService.listAll();

    return res.json({
      success: true,
      data: orgs.map((org: Organization) => ({
        id: org.id,
        name: org.name,
        isActive: org.isActive,
        createdAt: org.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Failed to list organizations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list organizations',
    });
  }
}

/**
 * GET /orgs/collections
 * List all Qdrant collections across all organizations (admin only).
 */
/**
 * GET /orgs/collections
 * List all Qdrant collections across all organizations (admin only).
 */
export async function listAllCollections(req: Request, res: Response) {
  try {
    const collections = await qdrantService.listAllCollections();

    // Fetch active indexing jobs from DB
    const activeJobs = await prisma.eventImageStatus.groupBy({
      by: ['eventId'],
      where: {
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
      _count: {
        _all: true,
      },
    });

    // Fetch DELETED events (where all images are inactive)
    const deletedEvents = await prisma.eventImageStatus.groupBy({
      by: ['eventId', 'orgId'],
      where: {
        isActive: false,
      },
      _count: {
        _all: true,
      },
    });

    // Create map of eventId -> pending count
    const pendingMap = new Map(activeJobs.map(j => [j.eventId, j._count._all]));

    // Helper to get active events set
    const activeEventIds = new Set<string>();

    // Augment Qdrant collections
    const activeCollections = collections.map(c => {
      const match = c.collectionName.match(/^org_(.+)_event_(.+)_faces$/);
      const eventId = match ? match[2] : null; // capture group 2 is eventId

      if (eventId) activeEventIds.add(eventId);

      const pendingCount = eventId ? (pendingMap.get(eventId) || 0) : 0;

      return {
        ...c,
        pendingCount,
        isIndexing: pendingCount > 0
      };
    });

    // Create ghost collections for deleted events
    // Only if they are NOT in the active Qdrant list
    const deletedCollections = deletedEvents
      .filter(e => !activeEventIds.has(e.eventId))
      .map(e => ({
        collectionName: `org_${e.orgId}_event_${e.eventId}_faces`,
        eventId: e.eventId,
        orgId: e.orgId,
        vectorCount: 0,
        indexedVectorCount: 0,
        status: 'deleted', // Special status for UI
        pendingCount: 0,
        isIndexing: false,
      }));

    const allCollections = [...activeCollections, ...deletedCollections];

    // Group by org for easier consumption
    const totalVectors = allCollections.reduce((sum, c) => sum + c.vectorCount, 0);
    const totalIndexed = allCollections.reduce((sum, c) => sum + c.indexedVectorCount, 0);

    return res.json({
      success: true,
      data: {
        totalCollections: allCollections.length,
        totalVectors,
        totalIndexed,
        collections: allCollections,
      },
    });
  } catch (error) {
    logger.error('Failed to list all collections:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list collections',
    });
  }
}

/**
 * GET /orgs/:id/collections
 * List all Qdrant collections for a specific organization.
 */
export async function listOrgCollections(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const existing = await orgService.getById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    const status = req.query.status as string; // 'active' | 'inactive' | 'all'

    // existing is already defined above

    let collections: any[] = [];

    // 1. Fetch Active (from Qdrant)
    if (!status || status === 'active' || status === 'all') {
      const activeCollections = await qdrantService.getOrgCollectionsWithInfo(existing.slug);
      collections.push(...activeCollections);
    }

    // 2. Fetch Inactive (from DB)
    if (status === 'inactive' || status === 'all') {
      // Find eventSlugs that are inactive in DB
      const inactiveEvents = await prisma.eventImageStatus.groupBy({
        by: ['eventSlug', 'eventId'],
        where: {
          orgId: id, // Use ID or slug? Schema uses orgId relation.
          isActive: false,
          eventSlug: { not: null }
        },
        _count: {
          _all: true
        }
      });

      // Filter out those that are already in the active list (just in case)
      const activeSlugs = new Set(collections.map(c => c.eventSlug));

      const inactiveCollections = inactiveEvents
        .filter(e => e.eventSlug && !activeSlugs.has(e.eventSlug))
        .map(e => ({
          collectionName: `org_${existing.slug}_event_${e.eventSlug}_faces`, // Synthetic name
          eventSlug: e.eventSlug!,
          vectorCount: 0, // Inactive/Deleted usually means cleared from Qdrant
          indexedVectorCount: 0,
          status: 'inactive', // Explicit status
          imageCount: e._count._all
        }));

      collections.push(...inactiveCollections);
    }

    const totalVectors = collections.reduce((sum, c) => sum + c.vectorCount, 0);
    const totalIndexed = collections.reduce((sum, c) => sum + c.indexedVectorCount, 0);

    return res.json({
      success: true,
      data: {
        orgId: id,
        orgName: existing.name,
        totalCollections: collections.length,
        totalVectors,
        totalIndexed,
        collections,
      },
    });
  } catch (error) {
    logger.error('Failed to list org collections:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list collections',
    });
  }
}

