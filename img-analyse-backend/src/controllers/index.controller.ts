let activeRefreshRequests = 0;
/**
 * =============================================================================
 * Index Controller
 * =============================================================================
 * Handles photo indexing - detecting faces and storing embeddings.
 *
 * Endpoints:
 * - POST /api/v1/index/photo - Index a single photo
 * - DELETE /api/v1/index/photo/:photoId - Remove indexed faces for a photo
 * - DELETE /api/v1/index/event/:eventId - Remove all faces for an event
 * =============================================================================
 */

import { type Request, type Response } from 'express';
import { prisma } from '../config/database.js';
import { faceDetectionService, qdrantService } from '../services/index.js';
import { compreFaceService } from '../services/compreface.service.js';

import { fetchImageFromUrl, readImageFromPath, sanitizeSlug } from '../utils/index.js';
import { logger } from '../utils/logger.js';
import { type ApiResponse, type IndexPhotoRequest, type IndexPhotoResult } from '../types/index.js';
import { toOrgSettings, type OrgSettings } from '../modules/org/org.types.js';

/**
 * Helper to resolve org settings from request or by looking up event owner.
 */
async function resolveOrgSettings(req: Request, eventIdOrSlug: string): Promise<OrgSettings | undefined> {
  // 1. If we have settings from auth middleware (API Key), use them
  if (req.orgSettings) {
    return req.orgSettings;
  }

  // 2. Otherwise try to find the event owner via Postgres
  // We check EventImageStatus or EventVideoStatus to find the orgId
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventIdOrSlug);

  // Try finding via image
  let image;
  if (isUuid) {
    image = await prisma.eventImageStatus.findFirst({ where: { eventId: eventIdOrSlug }, include: { org: true } });
  } else {
    image = await prisma.eventImageStatus.findFirst({ where: { eventSlug: eventIdOrSlug }, include: { org: true } });
  }

  if (image?.org) {
    return toOrgSettings(image.org);
  }

  // Try finding via video
  let video;
  if (isUuid) {
    video = await prisma.eventVideoStatus.findFirst({ where: { eventId: eventIdOrSlug }, include: { org: true } });
  } else {
    video = await prisma.eventVideoStatus.findFirst({ where: { eventSlug: eventIdOrSlug }, include: { org: true } });
  }

  if (video?.org) {
    return toOrgSettings(video.org);
  }

  return undefined;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Sanitize a slug to match Qdrant collection naming conventions.
 * Replaces any non-alphanumeric characters (except - and _) with underscores.
 * This ensures consistency between database storage and Qdrant collection names.
 */


// =============================================================================
// INDEX CONTROLLER
// =============================================================================

/**
 * Photo indexing controller.
 */
export const indexController = {
  /**
   * Index a single photo - detect faces and store embeddings.
   *
   * Supports three image source modes (configured via admin settings):
   * - 'url': Fetch image from provided URL
   * - 'multipart': Image uploaded as form data
   * - 'shared_storage': Read from shared filesystem path
   */
  async indexPhoto(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    // Simple global concurrency limit to prevent OOM
    // If we have > 3 active indexing requests, reject new ones
    if (activeRefreshRequests >= 3) {
      res.status(429).json({
        success: false,
        error: 'Too many concurrent indexing requests. Please try again later.',
      } as ApiResponse);
      return;
    }

    activeRefreshRequests++;

    try {
      const settings = req.orgSettings!;
      const { photoId, eventId, eventSlug, imageUrl, imagePath } = req.body as IndexPhotoRequest;

      // Sanitize eventSlug to match Qdrant collection naming
      const safeEventSlug = sanitizeSlug(eventSlug);

      logger.info(`Starting indexing for photo ${photoId} (Event: ${eventId})`, {
        mode: settings.imageSourceMode,
        hasUrl: !!imageUrl,
        hasPath: !!imagePath
      });

      // Track indexing status
      await prisma.eventImageStatus.upsert({
        where: {
          eventId_photoId: {
            eventId,
            photoId,
          },
        },
        update: {
          status: 'PROCESSING',
          error: null,
          orgId: settings.orgId,
          imageUrl: imageUrl || null,
          eventSlug: safeEventSlug,
        },
        create: {
          eventId,
          photoId,
          eventSlug: safeEventSlug,
          orgId: settings.orgId,
          status: 'PROCESSING',
          imageUrl: imageUrl || null,
        },
      });

      if (!photoId || !eventId) {
        res.status(400).json({
          success: false,
          error: 'photoId and eventId are required',
        } as ApiResponse);
        return;
      }

      // Get image buffer based on configured source mode
      let imageBuffer: Buffer;

      switch (settings.imageSourceMode) {
        case 'URL':
          if (!imageUrl) {
            res.status(400).json({
              success: false,
              error: 'imageUrl is required when image source mode is "URL"',
            } as ApiResponse);
            return;
          }
          imageBuffer = await fetchImageFromUrl(imageUrl);
          break;

        case 'SHARED_STORAGE':
          if (!imagePath) {
            res.status(400).json({
              success: false,
              error: 'imagePath is required when image source mode is "SHARED_STORAGE"',
            } as ApiResponse);
            return;
          }
          const fullPath = `${settings.sharedStoragePath}/${imagePath}`; // Removing path.join to ensure strictly string concatenation if issues arise, but template literal handles it.
          logger.debug(`Reading image from shared storage: ${fullPath}`);
          imageBuffer = await readImageFromPath(fullPath);
          break;

        default:
          res.status(500).json({
            success: false,
            error: `Unknown image source mode: ${settings.imageSourceMode}`,
          } as ApiResponse);
          return;
      }

      // Detect faces and extract embeddings
      const { faces, detectionResult } = await faceDetectionService.detectAndEmbed(settings, imageBuffer);

      // Index faces in Qdrant
      const pointIds = await qdrantService.indexFaces(
        settings.slug,
        eventSlug || eventId,
        photoId,
        faces,
        { eventId }
      );

      const result: IndexPhotoResult = {
        photoId,
        eventId,
        facesDetected: detectionResult.faces.length,
        facesIndexed: pointIds.length,
        facesRejected: detectionResult.rejectedCount,
        processingTimeMs: Date.now() - startTime,
        detectorsUsed: detectionResult.detectorsUsed,
      };

      logger.info(`Indexed photo ${photoId}: ${result.facesIndexed} faces in ${result.processingTimeMs}ms`, { result });

      // Update status to COMPLETED
      await prisma.eventImageStatus.update({
        where: {
          eventId_photoId: {
            eventId,
            photoId,
          },
        },
        data: {
          status: 'COMPLETED',
          error: null,
          facesDetected: result.facesDetected,
          facesIndexed: result.facesIndexed,
        },
      });

      res.json({
        success: true,
        data: result,
      } as ApiResponse<IndexPhotoResult>);
    } catch (error) {
      logger.error('Failed to index photo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to index photo';

      // Update status to FAILED if we have required IDs (we might not if validation failed early)
      const { photoId, eventId } = req.body as IndexPhotoRequest;
      if (photoId && eventId) {
        try {
          await prisma.eventImageStatus.upsert({
            where: {
              eventId_photoId: {
                eventId,
                photoId,
              },
            },
            update: {
              status: 'FAILED',
              error: errorMessage,
            },
            create: {
              eventId,
              photoId,
              orgId: req.orgSettings?.orgId || 'unknown',
              status: 'FAILED',
              error: errorMessage,
            },
          });
        } catch (dbError) {
          logger.error('Failed to update indexing status:', dbError);
        }
      }

      res.status(500).json({
        success: false,
        error: errorMessage,
      } as ApiResponse);
    } finally {
      activeRefreshRequests--;
    }
  },

  /**
   * Delete indexed faces for a specific photo.
   */
  async deletePhoto(req: Request, res: Response): Promise<void> {
    try {
      const settings = req.orgSettings!;
      const { photoId } = req.params;
      const { eventId, eventSlug } = req.query as { eventId?: string, eventSlug?: string };

      if (!photoId || !eventId) {
        res.status(400).json({
          success: false,
          error: 'photoId and eventId are required',
        } as ApiResponse);
        return;
      }

      // 1. Delete faces from Qdrant (Hard delete of vectors)
      await qdrantService.deleteFacesForPhoto(settings.slug, eventSlug || eventId, photoId);

      // 2. Soft delete in Postgres (Mark as inactive)
      await prisma.eventImageStatus.updateMany({
        where: {
          eventId,
          photoId,
        },
        data: {
          isActive: false,
          facesIndexed: 0, // Faces are gone from Qdrant
        },
      });

      res.json({
        success: true,
        message: `Deleted faces for photo ${photoId}`,
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to delete photo faces:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete photo faces',
      } as ApiResponse);
    }
  },
  /**
   * Delete a video and its frames.
   */
  async deleteVideo(req: Request, res: Response): Promise<void> {
    try {
      const { videoId } = req.params;
      const { eventId, eventSlug } = req.query as { eventId?: string, eventSlug?: string };

      if (!videoId || !eventId) {
        res.status(400).json({
          success: false,
          error: 'videoId and eventId are required',
        } as ApiResponse);
        return;
      }

      const settings = await resolveOrgSettings(req, eventId);
      if (!settings) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated or organization not found',
        } as ApiResponse);
        return;
      }

      // 1. Get all frames for this video to delete from Qdrant
      const frames = await prisma.eventImageStatus.findMany({
        where: {
          sourceVideoId: videoId,
          eventId,
        },
        select: { photoId: true },
      });

      const photoIds = frames.map(f => f.photoId);

      // 2. Delete faces from Qdrant
      if (photoIds.length > 0) {
        await qdrantService.deleteFacesForPhotos(settings.slug, eventSlug || eventId, photoIds);
      }

      // 3. Soft delete frames in Postgres
      await prisma.eventImageStatus.updateMany({
        where: {
          sourceVideoId: videoId,
          eventId,
        },
        data: {
          isActive: false,
          facesIndexed: 0,
        },
      });

      // 4. Soft delete video in Postgres
      await prisma.eventVideoStatus.updateMany({
        where: {
          videoId,
          eventId,
        },
        data: {
          isActive: false,
        },
      });

      res.json({
        success: true,
        message: `Deleted video ${videoId} and its ${photoIds.length} frames`,
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to delete video:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete video',
      } as ApiResponse);
    }
  },

  /**
   * Delete all indexed faces for an event.
   * Also deletes the Qdrant collection.
   */
  async deleteEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { eventSlug } = req.query as { eventSlug?: string };

      if (!eventId) {
        res.status(400).json({
          success: false,
          error: 'eventId is required',
        } as ApiResponse);
        return;
      }

      const settings = await resolveOrgSettings(req, eventId);
      if (!settings) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated or organization not found',
        } as ApiResponse);
        return;
      }

      // 1. Delete Qdrant collection (Hard delete of vectors)
      await qdrantService.deleteCollection(settings.slug, eventSlug || eventId);

      // 2. Soft delete in Postgres (Mark all images as inactive)
      await prisma.eventImageStatus.updateMany({
        where: {
          eventId,
        },
        data: {
          isActive: false,
          facesIndexed: 0,
        },
      });

      // 3. Soft delete all videos
      await prisma.eventVideoStatus.updateMany({
        where: {
          eventId,
        },
        data: {
          isActive: false,
        },
      });

      res.json({
        success: true,
        message: `Deleted all faces for event ${eventId}`,
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to delete event faces:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete event faces',
      } as ApiResponse);
    }
  },

  /**
   * Create an event collection explicitly.
   * Useful for eager creation when an event is created in the main app.
   */
  async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const settings = req.orgSettings!;
      const { eventId, eventSlug } = req.body;

      if (!eventId) {
        res.status(400).json({
          success: false,
          error: 'eventId is required',
        } as ApiResponse);
        return;
      }

      // Ensure collection exists in Qdrant
      await qdrantService.ensureCollection(settings.slug, eventSlug || eventId);

      res.json({
        success: true,
        message: `Created collection for event ${eventId}`,
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to create event collection:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event collection',
      } as ApiResponse);
    }
  },

  /**
   * Get indexing statistics for an event.
   */
  async getEventStats(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { eventSlug } = req.query as { eventSlug?: string };

      if (!eventId) {
        res.status(400).json({
          success: false,
          error: 'eventId is required',
        } as ApiResponse);
        return;
      }

      // Resolve org settings (might be missing for JWT auth)
      const settings = await resolveOrgSettings(req, eventId);

      // If we can't find the org/settings, we assume empty event or no access to Qdrant
      if (!settings) {
        res.json({
          success: true,
          data: {
            eventId,
            indexed: false,
            vectorCount: 0,
            indexedVectorCount: 0,
            status: 'UNKNOWN',
          },
        } as ApiResponse);
        return;
      }

      const info = await qdrantService.getCollectionInfo(settings.slug, eventSlug || eventId);

      // Get accurate image count from Postgres
      const isUuidQuery = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
      let countWhere: any = {};

      if (isUuidQuery) {
        countWhere.eventId = eventId;
      } else {
        countWhere.eventSlug = sanitizeSlug(eventId);
      }

      const totalImages = await prisma.eventImageStatus.count({
        where: {
          ...countWhere,
          sourceVideoId: null
        }
      });

      if (!info) {
        res.json({
          success: true,
          data: {
            eventId,
            eventSlug: eventSlug || eventId,
            collectionName: `${settings.slug}_${eventSlug || eventId}`.replace(/[^a-zA-Z0-9-_]/g, '_'),
            indexed: false,
            vectorCount: 0,
            indexedVectorCount: 0,
            totalImages: totalImages,
            totalIndexed: 0,
            status: 'UNKNOWN',
          },
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: {
          eventId,
          eventSlug: eventSlug || eventId,
          collectionName: info.collectionName,
          indexed: true,
          vectorCount: info.vectorCount,
          indexedVectorCount: info.indexedVectorCount, // Vectors in Qdrant
          totalIndexed: info.indexedVectorCount,      // For frontend compatibility
          totalImages: totalImages,                   // Total in Postgres
          status: info.status,
        },
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to get event stats:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get event stats',
      } as ApiResponse);
    }
  },

  /**
   * Get indexing status for event images.
   */
  async getEventImages(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { status, active } = req.query as { status?: string, active?: string };

      if (!eventId) {
        res.status(400).json({
          success: false,
          error: 'eventId is required',
        } as ApiResponse);
        return;
      }

      const where: any = {};
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
      let sanitizedSlug: string | null = null;

      if (isUuid) {
        where.eventId = eventId;
      } else {
        // Sanitize the input slug to match how we store slugs in the database
        // This ensures consistency with Qdrant collection naming
        sanitizedSlug = sanitizeSlug(eventId);
        where.eventSlug = sanitizedSlug;
      }

      // Determine active filter
      // Modified: Show ALL items in "Active" tab temporarily to ensure visibility
      // If active param is provided, use it. Otherwise default to true.
      if (active !== undefined) {
        if (active === 'true') {
          // Show everything (Active + Inactive) to debug visibility
          // where.isActive = true; 
        } else {
          where.isActive = false;
        }
      } else {
        // Default to active -> Show everything
        // where.isActive = true;
      }

      // Add status filter if provided
      if (status && status !== 'ALL') {
        where.status = status;
      }

      // Filter out video frames (they show up in Videos tab)
      where.sourceVideoId = null;

      const images = await prisma.eventImageStatus.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 1000,
      });

      // Calculate stats based on active/inactive
      // Re-use logic for identifying event (UUID vs Slug)
      const countWhere = isUuid ? { eventId } : { eventSlug: sanitizedSlug };
      // Also filter out video frames from stats
      // Active includes true only (schema requirement)
      const baseWhere = {
        ...countWhere,
        isActive: true,
        sourceVideoId: null
      };

      const total = await prisma.eventImageStatus.count({ where: baseWhere });
      const completed = await prisma.eventImageStatus.count({ where: { ...baseWhere, status: 'COMPLETED' } });
      const failed = await prisma.eventImageStatus.count({ where: { ...baseWhere, status: 'FAILED' } });
      const processing = await prisma.eventImageStatus.count({ where: { ...baseWhere, status: 'PROCESSING' } });

      // Transform images to include viewable URLs
      const transformedImages = images.map(img => ({
        ...img,
        // Only proxy if it's not already a URL
        imageUrl: (img.imageUrl && !img.imageUrl.startsWith('http'))
          ? `/api/v1/index/images/view/${img.photoId}`
          : img.imageUrl
      }));

      res.json({
        success: true,
        data: transformedImages,
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to get event images:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get event images',
      } as ApiResponse);
    }
  },

  /**
   * Get videos for an event with frame details.
   */
  async getEventVideos(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const includeFrames = req.query.includeFrames === 'true';

      if (!eventId) {
        res.status(400).json({
          success: false,
          error: 'eventId is required',
        } as ApiResponse);
        return;
      }

      const where: any = {};
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);

      if (isUuid) {
        where.eventId = eventId;
      } else {
        // Sanitize the input slug to match how we store slugs in the database
        // This ensures consistency with Qdrant collection naming
        const sanitizedSlug = sanitizeSlug(eventId);
        where.eventSlug = sanitizedSlug;
      }

      // Determine active filter
      // Modified: Show ALL items in "Active" tab temporarily to ensure visibility
      const { active } = req.query as { active?: string };
      if (active !== undefined) {
        if (active === 'true') {
          // where.isActive = true;
        } else {
          where.isActive = false;
        }
      } else {
        // Default to active -> Show everything
        // where.isActive = true;
      }

      const videos = await prisma.eventVideoStatus.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: includeFrames ? {
          frames: {
            orderBy: { videoTimestamp: 'asc' },
            select: {
              id: true,
              photoId: true,
              status: true,
              imageUrl: true,
              facesDetected: true,
              facesIndexed: true,
              videoTimestamp: true,
              error: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          _count: {
            select: { frames: true }
          }
        } : {
          _count: {
            select: { frames: true }
          }
        },
      });

      // Transform to include frame stats summary
      const videosWithStats = videos.map(video => {
        const frames = (video as any).frames || [];

        // Calculate stats on the fly
        const facesFound = frames.reduce((acc: number, frame: any) => acc + (frame.facesDetected || 0), 0);

        const frameStats = {
          total: (video as any)._count?.frames || 0,
          completed: frames.filter((f: any) => f.status === 'COMPLETED').length,
          failed: frames.filter((f: any) => f.status === 'FAILED').length,
          processing: frames.filter((f: any) => f.status === 'PROCESSING').length,
          pending: frames.filter((f: any) => f.status === 'PENDING').length,
        };

        // Transform frames to include viewable URLs
        const transformedFrames = frames.map((frame: any) => ({
          ...frame,
          // Only proxy if it's not already a URL
          imageUrl: (frame.imageUrl && !frame.imageUrl.startsWith('http'))
            ? `/api/v1/index/images/view/${frame.photoId}`
            : frame.imageUrl
        }));

        return {
          ...video,
          facesFound, // Override stored value with calculated value
          frames: includeFrames ? transformedFrames : undefined,
          frameStats: includeFrames ? frameStats : {
            total: (video as any)._count?.frames || 0
          },
        };
      });

      res.json({
        success: true,
        data: videosWithStats,
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to get event videos:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get event videos',
      } as ApiResponse);
    }
  },

  /**
   * Index a video file.
   * Extracts frames and indexes them as photos.
   */
  async indexVideo(req: Request, res: Response): Promise<void> {
    try {
      const settings = req.orgSettings!;
      const { videoId, eventId, eventSlug, videoPath, videoUrl } = req.body; // Assuming body matches VideoJobData roughly

      // Sanitize eventSlug to match Qdrant collection naming
      const safeEventSlug = sanitizeSlug(eventSlug);

      if (!videoId || !eventId) {
        res.status(400).json({
          success: false,
          error: 'videoId and eventId are required',
        } as ApiResponse);
        return;
      }

      // 1. Create Status Record (PROCESSING)
      await prisma.eventVideoStatus.create({
        data: {
          videoId,
          eventId,
          eventSlug: safeEventSlug,
          orgId: settings.orgId,
          status: 'PROCESSING', // Queued
          videoUrl: videoUrl || null,
        }
      });

      // 2. Add to Queue (pass sanitized slug)
      await import('../queues/video-processing.queue.js').then(m => m.addToVideoQueue({
        videoId,
        eventId,
        eventSlug: safeEventSlug || undefined,
        videoPath, // Must be provided (uploaded or shared path)
        orgSettings: settings,
      }));

      res.json({
        success: true,
        message: 'Video queued for processing',
      } as ApiResponse);

    } catch (error) {
      logger.error('Failed to queue video:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue video',
      } as ApiResponse);
    }
  },
};

