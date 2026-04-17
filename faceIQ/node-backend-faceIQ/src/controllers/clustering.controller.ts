/**
 * =============================================================================
 * Clustering Controller
 * =============================================================================
 * HTTP handlers for face clustering operations.
 * =============================================================================
 */

import type { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { addToClusteringQueue, type ClusteringJobData } from '../queues/clustering.queue.js';
import { qdrantService } from '../services/qdrant.service.js';
import { thumbnailService } from '../services/thumbnail.service.js';
import { toOrgSettings, type OrgSettings } from '../modules/org/org.types.js';

// =============================================================================
// TYPES
// =============================================================================

interface AuthenticatedRequest extends Request {
  orgSettings?: OrgSettings;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get org settings from request or look it up from the database.
 * For JWT auth, the user might not have orgSettings set, so we derive it from eventId or orgId.
 */
async function getOrgSettingsFromRequest(
  req: AuthenticatedRequest,
  options?: { eventId?: string; orgId?: string; clusterId?: string }
): Promise<OrgSettings | null> {
  // If already set from API key auth, use it
  if (req.orgSettings) {
    return req.orgSettings;
  }

  // For JWT auth, look up the org from the database
  let org = null;

  // Try to find org by orgId if provided
  if (options?.orgId) {
    org = await prisma.organization.findUnique({
      where: { id: options.orgId },
    });
  }
  // Try to find org from eventId (via ClusteringJob or PersonCluster)
  else if (options?.eventId) {
    const clusteringJob = await prisma.clusteringJob.findFirst({
      where: { eventId: options.eventId },
      include: { org: true },
    });
    if (clusteringJob) {
      org = clusteringJob.org;
    } else {
      const cluster = await prisma.personCluster.findFirst({
        where: { eventId: options.eventId },
        include: { org: true },
      });
      if (cluster) {
        org = cluster.org;
      }
    }
  }
  // Try to find org from clusterId
  else if (options?.clusterId) {
    const cluster = await prisma.personCluster.findUnique({
      where: { id: options.clusterId },
      include: { org: true },
    });
    if (cluster) {
      org = cluster.org;
    }
  }

  // If no org found, try to get the first active org (single-tenant fallback)
  if (!org) {
    org = await prisma.organization.findFirst({
      where: { isActive: true },
    });
  }

  return org ? toOrgSettings(org) : null;
}

// =============================================================================
// CONTROLLERS
// =============================================================================

/**
 * POST /api/v1/clustering/run
 * Start a clustering job for an event.
 */
export async function runClustering(req: AuthenticatedRequest, res: Response) {
  try {
    const { eventId, eventSlug } = req.body;

    if (!eventId || !eventSlug) {
      return res.status(400).json({
        success: false,
        error: 'eventId and eventSlug are required',
      });
    }

    const orgSettings = await getOrgSettingsFromRequest(req, { eventId });
    if (!orgSettings) {
      return res.status(401).json({
        success: false,
        error: 'Organization not found',
      });
    }

    // Check if there's already a running job for this event
    const existingJob = await prisma.clusteringJob.findFirst({
      where: {
        orgId: orgSettings.orgId,
        eventId,
        status: { in: ['PENDING', 'RUNNING'] },
      },
    });

    if (existingJob) {
      return res.status(409).json({
        success: false,
        error: 'A clustering job is already running for this event',
        jobId: existingJob.id,
      });
    }

    // Check face count
    const faceCount = await qdrantService.getFaceCount(orgSettings.slug, eventSlug);
    if (faceCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'No faces found for this event. Index photos first.',
      });
    }

    // Create job record
    const job = await prisma.clusteringJob.create({
      data: {
        orgId: orgSettings.orgId,
        eventId,
        eventSlug,
        provider: orgSettings.clusteringProvider,
        status: 'PENDING',
        totalFaces: faceCount,
      },
    });

    // Add to queue
    const jobData: ClusteringJobData = {
      jobId: job.id,
      eventId,
      eventSlug,
      orgSettings,
    };

    await addToClusteringQueue(jobData);

    logger.info(`[CLUSTERING] Started job ${job.id} for event ${eventSlug} (${faceCount} faces)`);

    return res.status(202).json({
      success: true,
      data: {
        jobId: job.id,
        status: 'PENDING',
        provider: orgSettings.clusteringProvider,
        totalFaces: faceCount,
      },
      message: 'Clustering job queued successfully',
    });
  } catch (error: any) {
    logger.error('Failed to start clustering:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to start clustering job',
    });
  }
}

/**
 * GET /api/v1/clustering/job/:jobId
 * Get status of a clustering job.
 */
export async function getJobStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { jobId } = req.params;

    // First try to find the job to get org context
    const job = await prisma.clusteringJob.findUnique({
      where: { id: jobId },
      include: { org: true },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Verify user has access to this org
    const orgSettings = await getOrgSettingsFromRequest(req, { orgId: job.orgId });
    if (!orgSettings) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Re-check with org restriction if using API key auth
    if (req.orgSettings && job.orgId !== orgSettings.orgId) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    return res.json({
      success: true,
      data: job,
    });
  } catch (error: any) {
    logger.error('Failed to get job status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get job status',
    });
  }
}

/**
 * GET /api/v1/clustering/event/:eventId/clusters
 * Get all person clusters for an event.
 */
export async function getEventClusters(req: AuthenticatedRequest, res: Response) {
  try {
    const { eventId } = req.params;
    const { includeNoise } = req.query;

    const orgSettings = await getOrgSettingsFromRequest(req, { eventId });
    if (!orgSettings) {
      return res.status(401).json({
        success: false,
        error: 'Organization not found',
      });
    }

    const where: any = {
      orgId: orgSettings.orgId,
      eventId,
    };

    if (includeNoise !== 'true') {
      where.isNoise = false;
    }

    const clusters = await prisma.personCluster.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { faceAssignments: true },
        },
      },
    });

    // Calculate total faces across all clusters
    const totalFaces = clusters.reduce((sum, c) => sum + c.faceCount, 0);

    return res.json({
      success: true,
      data: {
        clusters: clusters.map(c => ({
          id: c.id,
          name: c.name,
          displayOrder: c.displayOrder,
          representativeFaceId: c.representativeFaceId,
          faceCount: c.faceCount,
          photoCount: c.photoCount,
          isNoise: c.isNoise,
          createdAt: c.createdAt,
        })),
        total: clusters.length,
        totalFaces,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get clusters:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get clusters',
    });
  }
}

/**
 * GET /api/v1/clustering/cluster/:clusterId/faces
 * Get all faces in a cluster with photo info.
 */
export async function getClusterFaces(req: AuthenticatedRequest, res: Response) {
  try {
    const { clusterId } = req.params;
    const { page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const orgSettings = await getOrgSettingsFromRequest(req, { clusterId });
    if (!orgSettings) {
      return res.status(401).json({
        success: false,
        error: 'Organization not found',
      });
    }

    const cluster = await prisma.personCluster.findFirst({
      where: {
        id: clusterId,
        orgId: orgSettings.orgId,
      },
    });

    if (!cluster) {
      return res.status(404).json({
        success: false,
        error: 'Cluster not found',
      });
    }

    const [assignments, total] = await Promise.all([
      prisma.faceClusterAssignment.findMany({
        where: { clusterId },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.faceClusterAssignment.count({ where: { clusterId } }),
    ]);

    // Get image URLs for all photos in this cluster
    const photoIds = [...new Set(assignments.map(a => a.photoId))];
    const imageStatuses = await prisma.eventImageStatus.findMany({
      where: {
        orgId: orgSettings.orgId,
        photoId: { in: photoIds },
      },
      select: {
        photoId: true,
        imageUrl: true,
      },
    });

    // Create a map of photoId -> imageUrl
    // Convert local file paths to API URLs for video frames
    const photoUrlMap = new Map<string, string>();
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    for (const status of imageStatuses) {
      if (status.imageUrl) {
        // If it's a local file path (starts with / or contains /Users/),
        // convert to API URL using the image view endpoint
        if (status.imageUrl.startsWith('/') && !status.imageUrl.startsWith('http')) {
          // Use the public image view endpoint
          photoUrlMap.set(status.photoId, `${baseUrl}/api/v1/index/images/view/${status.photoId}`);
        } else {
          photoUrlMap.set(status.photoId, status.imageUrl);
        }
      }
    }

    return res.json({
      success: true,
      data: {
        cluster: {
          id: cluster.id,
          name: cluster.name,
          isNoise: cluster.isNoise,
        },
        faces: assignments.map(a => ({
          qdrantPointId: a.qdrantPointId,
          photoId: a.photoId,
          confidence: a.confidence,
          isManual: a.isManual,
          imageUrl: photoUrlMap.get(a.photoId) || null,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to get cluster faces:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get cluster faces',
    });
  }
}

/**
 * PATCH /api/v1/clustering/cluster/:clusterId
 * Rename a cluster.
 */
export async function renameCluster(req: AuthenticatedRequest, res: Response) {
  try {
    const { clusterId } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    const orgSettings = await getOrgSettingsFromRequest(req, { clusterId });
    if (!orgSettings) {
      return res.status(401).json({
        success: false,
        error: 'Organization not found',
      });
    }

    const cluster = await prisma.personCluster.findFirst({
      where: {
        id: clusterId,
        orgId: orgSettings.orgId,
      },
    });

    if (!cluster) {
      return res.status(404).json({
        success: false,
        error: 'Cluster not found',
      });
    }

    const updated = await prisma.personCluster.update({
      where: { id: clusterId },
      data: { name: name.trim() },
    });

    logger.info(`[CLUSTERING] Renamed cluster ${clusterId} to "${name.trim()}"`);

    return res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
      },
    });
  } catch (error: any) {
    logger.error('Failed to rename cluster:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to rename cluster',
    });
  }
}

/**
 * POST /api/v1/clustering/merge
 * Merge multiple clusters into one.
 */
export async function mergeClusters(req: AuthenticatedRequest, res: Response) {
  try {
    const { clusterIds, targetName } = req.body;

    if (!Array.isArray(clusterIds) || clusterIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 cluster IDs are required',
      });
    }

    const orgSettings = await getOrgSettingsFromRequest(req, { clusterId: clusterIds[0] });
    if (!orgSettings) {
      return res.status(401).json({
        success: false,
        error: 'Organization not found',
      });
    }

    // Verify all clusters exist and belong to org
    const clusters = await prisma.personCluster.findMany({
      where: {
        id: { in: clusterIds },
        orgId: orgSettings.orgId,
      },
    });

    if (clusters.length !== clusterIds.length) {
      return res.status(404).json({
        success: false,
        error: 'One or more clusters not found',
      });
    }

    // Use first cluster as target
    const targetCluster = clusters[0]!;
    const sourceClusterIds = clusterIds.slice(1);

    // Move all face assignments to target cluster
    await prisma.faceClusterAssignment.updateMany({
      where: { clusterId: { in: sourceClusterIds } },
      data: { clusterId: targetCluster.id, isManual: true },
    });

    // Update target cluster counts
    const newFaceCount = await prisma.faceClusterAssignment.count({
      where: { clusterId: targetCluster.id },
    });
    const photoIds = await prisma.faceClusterAssignment.findMany({
      where: { clusterId: targetCluster.id },
      select: { photoId: true },
      distinct: ['photoId'],
    });

    await prisma.personCluster.update({
      where: { id: targetCluster.id },
      data: {
        name: targetName || targetCluster.name,
        faceCount: newFaceCount,
        photoCount: photoIds.length,
      },
    });

    // Delete source clusters
    await prisma.personCluster.deleteMany({
      where: { id: { in: sourceClusterIds } },
    });

    logger.info(`[CLUSTERING] Merged ${sourceClusterIds.length} clusters into ${targetCluster.id}`);

    return res.json({
      success: true,
      data: {
        targetClusterId: targetCluster.id,
        mergedCount: sourceClusterIds.length,
        newFaceCount,
        newPhotoCount: photoIds.length,
      },
    });
  } catch (error: any) {
    logger.error('Failed to merge clusters:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to merge clusters',
    });
  }
}

/**
 * POST /api/v1/clustering/move-face
 * Move a face from one cluster to another.
 */
export async function moveFace(req: AuthenticatedRequest, res: Response) {
  try {
    const { faceId, targetClusterId } = req.body;

    if (!faceId || !targetClusterId) {
      return res.status(400).json({
        success: false,
        error: 'faceId and targetClusterId are required',
      });
    }

    const orgSettings = await getOrgSettingsFromRequest(req, { clusterId: targetClusterId });
    if (!orgSettings) {
      return res.status(401).json({
        success: false,
        error: 'Organization not found',
      });
    }

    // Find the face assignment
    const assignment = await prisma.faceClusterAssignment.findFirst({
      where: {
        qdrantPointId: faceId,
        orgId: orgSettings.orgId,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Face not found',
      });
    }

    // Verify target cluster exists
    const targetCluster = await prisma.personCluster.findFirst({
      where: {
        id: targetClusterId,
        orgId: orgSettings.orgId,
      },
    });

    if (!targetCluster) {
      return res.status(404).json({
        success: false,
        error: 'Target cluster not found',
      });
    }

    const sourceClusterId = assignment.clusterId;

    // Move the face
    await prisma.faceClusterAssignment.update({
      where: { id: assignment.id },
      data: { clusterId: targetClusterId, isManual: true },
    });

    // Update counts for both clusters
    await updateClusterCounts(sourceClusterId);
    await updateClusterCounts(targetClusterId);

    logger.info(`[CLUSTERING] Moved face ${faceId} from ${sourceClusterId} to ${targetClusterId}`);

    return res.json({
      success: true,
      data: {
        faceId,
        sourceClusterId,
        targetClusterId,
      },
    });
  } catch (error: any) {
    logger.error('Failed to move face:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to move face',
    });
  }
}

/**
 * POST /api/v1/clustering/split
 * Split selected faces into a new cluster.
 */
export async function splitCluster(req: AuthenticatedRequest, res: Response) {
  try {
    const { faceIds, newClusterName, eventId, eventSlug } = req.body;

    if (!Array.isArray(faceIds) || faceIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'faceIds array is required',
      });
    }

    if (!eventId || !eventSlug) {
      return res.status(400).json({
        success: false,
        error: 'eventId and eventSlug are required',
      });
    }

    const orgSettings = await getOrgSettingsFromRequest(req, { eventId });
    if (!orgSettings) {
      return res.status(401).json({
        success: false,
        error: 'Organization not found',
      });
    }

    // Find all face assignments
    const assignments = await prisma.faceClusterAssignment.findMany({
      where: {
        qdrantPointId: { in: faceIds },
        orgId: orgSettings.orgId,
      },
    });

    if (assignments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No faces found',
      });
    }

    const sourceClusterIds = [...new Set(assignments.map(a => a.clusterId))];
    const photoIds = [...new Set(assignments.map(a => a.photoId))];

    // Get max display order
    const maxOrder = await prisma.personCluster.aggregate({
      where: { orgId: orgSettings.orgId, eventId },
      _max: { displayOrder: true },
    });

    // Create new cluster
    const newCluster = await prisma.personCluster.create({
      data: {
        orgId: orgSettings.orgId,
        eventId,
        eventSlug,
        name: newClusterName || `Person ${(maxOrder._max.displayOrder || 0) + 1}`,
        displayOrder: (maxOrder._max.displayOrder || 0) + 1,
        representativeFaceId: faceIds[0],
        faceCount: faceIds.length,
        photoCount: photoIds.length,
        isNoise: false,
      },
    });

    // Move faces to new cluster
    await prisma.faceClusterAssignment.updateMany({
      where: { qdrantPointId: { in: faceIds } },
      data: { clusterId: newCluster.id, isManual: true },
    });

    // Update source cluster counts
    for (const clusterId of sourceClusterIds) {
      await updateClusterCounts(clusterId);
    }

    logger.info(`[CLUSTERING] Split ${faceIds.length} faces into new cluster ${newCluster.id}`);

    return res.json({
      success: true,
      data: {
        newClusterId: newCluster.id,
        newClusterName: newCluster.name,
        faceCount: faceIds.length,
      },
    });
  } catch (error: any) {
    logger.error('Failed to split cluster:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to split cluster',
    });
  }
}

// =============================================================================
// HELPERS
// =============================================================================

async function updateClusterCounts(clusterId: string): Promise<void> {
  const faceCount = await prisma.faceClusterAssignment.count({
    where: { clusterId },
  });

  const photoIds = await prisma.faceClusterAssignment.findMany({
    where: { clusterId },
    select: { photoId: true },
    distinct: ['photoId'],
  });

  await prisma.personCluster.update({
    where: { id: clusterId },
    data: {
      faceCount,
      photoCount: photoIds.length,
    },
  });
}

/**
 * GET /api/v1/clustering/face/:faceId/thumbnail
 * Get a cropped face thumbnail.
 */
export async function getFaceThumbnail(req: AuthenticatedRequest, res: Response) {
  try {
    const faceId = req.params.faceId as string;
    const { size = '150', format = 'jpeg' } = req.query;

    // First find the assignment to get org context
    const assignment = await prisma.faceClusterAssignment.findFirst({
      where: { qdrantPointId: faceId },
      include: { cluster: true },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Face not found',
      });
    }

    const orgSettings = await getOrgSettingsFromRequest(req, { orgId: assignment.orgId });
    if (!orgSettings) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Verify org matches if using API key auth
    if (req.orgSettings && assignment.orgId !== orgSettings.orgId) {
      return res.status(404).json({
        success: false,
        error: 'Face not found',
      });
    }

    // Get image status for URL
    const imageStatus = await prisma.eventImageStatus.findFirst({
      where: { photoId: assignment.photoId },
    });

    if (!imageStatus?.imageUrl) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
      });
    }

    // Get face data from Qdrant for bounding box
    // Note: cluster is always present due to the include, and eventSlug is required in schema
    const cluster = assignment.cluster as { eventSlug: string };
    const points = await qdrantService.getPointsByIds(orgSettings.slug, cluster.eventSlug, [faceId]);

    if (points.length === 0 || !points[0]?.payload?.bbox) {
      return res.status(404).json({
        success: false,
        error: 'Face bounding box not found',
      });
    }

    const bbox = points[0].payload.bbox as { x: number; y: number; width: number; height: number };

    // Generate thumbnail
    const thumbnail = await thumbnailService.generateThumbnail(
      imageStatus.imageUrl,
      bbox,
      {
        size: parseInt(size as string, 10),
        format: format as 'jpeg' | 'webp' | 'png',
      }
    );

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', `image/${thumbnail.format}`);
    return res.send(thumbnail.buffer);
  } catch (error: any) {
    logger.error('Failed to get face thumbnail:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate thumbnail',
    });
  }
}

/**
 * GET /api/v1/clustering/cluster/:clusterId/thumbnail
 * Get the representative face thumbnail for a cluster.
 */
export async function getClusterThumbnail(req: AuthenticatedRequest, res: Response) {
  try {
    const { clusterId } = req.params;
    const { size = '150', format = 'jpeg' } = req.query;

    // Get cluster first to get org context
    const cluster = await prisma.personCluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster) {
      return res.status(404).json({
        success: false,
        error: 'Cluster not found',
      });
    }

    const orgSettings = await getOrgSettingsFromRequest(req, { orgId: cluster.orgId });
    if (!orgSettings) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Verify org matches if using API key auth
    if (req.orgSettings && cluster.orgId !== orgSettings.orgId) {
      return res.status(404).json({
        success: false,
        error: 'Cluster not found',
      });
    }

    if (!cluster.representativeFaceId) {
      return res.status(404).json({
        success: false,
        error: 'Cluster has no representative face',
      });
    }

    // Redirect to face thumbnail
    req.params.faceId = cluster.representativeFaceId;
    return getFaceThumbnail(req, res);
  } catch (error: any) {
    logger.error('Failed to get cluster thumbnail:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate thumbnail',
    });
  }
}
