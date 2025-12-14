/**
 * =============================================================================
 * Index Controller
 * =============================================================================
 * Handles photo indexing - detecting faces and storing embeddings.
 *
 * ARCHITECTURE:
 * - All incoming requests are QUEUED, never rejected
 * - Queue processes images based on available capacity
 * - This ensures NO DATA LOSS even with 1000+ images
 *
 * Endpoints:
 * - POST /api/v1/index/photo - Index a single photo (queued)
 * - DELETE /api/v1/index/photo/:photoId - Remove indexed faces for a photo
 * - DELETE /api/v1/index/event/:eventId - Remove all faces for an event
 * =============================================================================
 */

import { type Request, type Response } from 'express';
import { prisma } from '../config/database.js';
import { qdrantService } from '../services/index.js';

import { sanitizeSlug } from '../utils/index.js';
import { logger } from '../utils/logger.js';
import { type ApiResponse, type IndexPhotoRequest } from '../types/index.js';
import { toOrgSettings, type OrgSettings } from '../modules/org/org.types.js';
import { addToIndexingQueue } from '../queues/face-indexing.queue.js';

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
   * QUEUE-BASED APPROACH:
   * - Accept ALL requests immediately (never reject with 429)
   * - Store in DB as PENDING
   * - Add to BullMQ queue for background processing
   * - Worker processes based on available capacity
   * - This ensures ZERO DATA LOSS even with 1000+ images
   */
  async indexPhoto(req: Request, res: Response): Promise<void> {
    try {
      const settings = req.orgSettings!;
      const { photoId, eventId, eventSlug, imageUrl, imagePath } = req.body as IndexPhotoRequest;

      // Validate required fields FIRST
      if (!photoId || !eventId) {
        res.status(400).json({
          success: false,
          error: 'photoId and eventId are required',
        } as ApiResponse);
        return;
      }

      // Validate image source based on mode
      if (settings.imageSourceMode === 'URL' && !imageUrl) {
        res.status(400).json({
          success: false,
          error: 'imageUrl is required when image source mode is "URL"',
        } as ApiResponse);
        return;
      }

      if (settings.imageSourceMode === 'SHARED_STORAGE' && !imagePath) {
        res.status(400).json({
          success: false,
          error: 'imagePath is required when image source mode is "SHARED_STORAGE"',
        } as ApiResponse);
        return;
      }

      // Sanitize eventSlug to match Qdrant collection naming
      const safeEventSlug = sanitizeSlug(eventSlug);

      logger.info(`Queueing photo ${photoId} for indexing (Event: ${eventId})`, {
        mode: settings.imageSourceMode,
        hasUrl: !!imageUrl,
        hasPath: !!imagePath
      });

      // Create/Update status record as PENDING (queued, not yet processing)
      await prisma.eventImageStatus.upsert({
        where: {
          eventId_photoId: {
            eventId,
            photoId,
          },
        },
        update: {
          status: 'PENDING',
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
          status: 'PENDING',
          imageUrl: imageUrl || null,
        },
      });

      // Add to processing queue - this is non-blocking and fast
      await addToIndexingQueue({
        photoId,
        eventId,
        eventSlug: safeEventSlug,
        imageUrl,
        imagePath,
        orgSettings: settings,
      });

      // Return immediately with QUEUED status
      // The actual processing happens in the background worker
      res.status(202).json({
        success: true,
        message: 'Photo queued for indexing',
        data: {
          photoId,
          eventId,
          status: 'PENDING',
        },
      } as ApiResponse);

    } catch (error) {
      logger.error('Failed to queue photo for indexing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to queue photo';

      // Try to record the failure in DB
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
   * Get faces for a specific photo from Qdrant.
   * Returns bounding boxes, confidence, and detector source for each face.
   */
  async getPhotoFaces(req: Request, res: Response): Promise<void> {
    try {
      const { photoId } = req.params;
      const { eventId, eventSlug } = req.query as { eventId?: string; eventSlug?: string };

      if (!photoId || !eventId) {
        res.status(400).json({
          success: false,
          error: 'photoId and eventId are required',
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

      // Get faces from Qdrant
      const faces = await qdrantService.getFacesForPhoto(
        settings.slug,
        eventSlug || eventId,
        photoId
      );

      res.json({
        success: true,
        data: {
          photoId,
          faces: faces.map((face) => ({
            faceIndex: face.faceIndex,
            bbox: face.bbox,
            confidence: face.confidence,
            detectorSource: face.detectorSource,
            age: face.age,
            gender: face.gender,
            pose: face.pose,
          })),
        },
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to get photo faces:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get photo faces',
      } as ApiResponse);
    }
  },

  /**
   * Re-index a photo with optional high accuracy mode (larger det_size).
   * This is useful when initial detection missed faces in the image.
   */
  async reindexPhoto(req: Request, res: Response): Promise<void> {
    try {
      const { photoId } = req.params;
      const { eventId, eventSlug, highAccuracy } = req.body as {
        eventId?: string;
        eventSlug?: string;
        highAccuracy?: boolean;
      };

      // eventId can be either UUID or slug
      const eventIdOrSlug = eventId || eventSlug;

      if (!photoId || !eventIdOrSlug) {
        res.status(400).json({
          success: false,
          error: 'photoId and eventId are required',
        } as ApiResponse);
        return;
      }

      const settings = await resolveOrgSettings(req, eventIdOrSlug);
      if (!settings) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated or organization not found',
        } as ApiResponse);
        return;
      }

      // Get image info from DB - search by photoId and either eventId or eventSlug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventIdOrSlug);
      const image = await prisma.eventImageStatus.findFirst({
        where: {
          photoId,
          ...(isUuid ? { eventId: eventIdOrSlug } : { eventSlug: eventIdOrSlug }),
        },
        select: { id: true, imageUrl: true, status: true, eventId: true, eventSlug: true },
      });

      if (!image) {
        res.status(404).json({
          success: false,
          error: 'Image not found',
        } as ApiResponse);
        return;
      }

      if (!image.imageUrl) {
        res.status(400).json({
          success: false,
          error: 'Image file not available for re-indexing',
        } as ApiResponse);
        return;
      }

      // Use the actual eventId and eventSlug from the found image
      const actualEventId = image.eventId;
      const actualEventSlug = image.eventSlug || eventSlug || eventIdOrSlug;

      // Delete existing faces from Qdrant first
      await qdrantService.deleteFacesForPhoto(settings.slug, actualEventSlug, photoId);

      // Reset the image status
      await prisma.eventImageStatus.update({
        where: { id: image.id },
        data: {
          status: 'PENDING',
          facesDetected: 0,
          facesIndexed: 0,
          error: null,
        },
      });

      // Add to indexing queue with high accuracy flag
      await addToIndexingQueue({
        photoId,
        eventId: actualEventId,
        eventSlug: actualEventSlug,
        imagePath: image.imageUrl,
        orgSettings: settings,
        highAccuracy: highAccuracy || false, // Pass flag to use larger det_size
      });

      res.json({
        success: true,
        message: `Photo ${photoId} queued for re-indexing${highAccuracy ? ' with high accuracy mode' : ''}`,
        data: {
          photoId,
          highAccuracy: highAccuracy || false,
        },
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to reindex photo:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reindex photo',
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

