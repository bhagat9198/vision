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

import type { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { faceDetectionService, qdrantService } from '../services/index.js';
import { fetchImageFromUrl, readImageFromPath } from '../utils/index.js';
import { logger } from '../utils/logger.js';
import type { IndexPhotoRequest, IndexPhotoResult, ApiResponse } from '../types/index.js';

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

    try {
      const settings = req.orgSettings!;
      const { photoId, eventId, eventSlug, imageUrl, imagePath } = req.body as IndexPhotoRequest;

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
          eventSlug: eventSlug || null,
        },
        create: {
          eventId,
          photoId,
          eventSlug: eventSlug || null,
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
   * Delete all indexed faces for an event.
   * Also deletes the Qdrant collection.
   */
  async deleteEvent(req: Request, res: Response): Promise<void> {
    try {
      const settings = req.orgSettings!;
      const { eventId } = req.params;
      const { eventSlug } = req.query as { eventSlug?: string };

      if (!eventId) {
        res.status(400).json({
          success: false,
          error: 'eventId is required',
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
      const settings = req.orgSettings!;
      const { eventId } = req.params;
      const { eventSlug } = req.query as { eventSlug?: string };

      if (!eventId) {
        res.status(400).json({
          success: false,
          error: 'eventId is required',
        } as ApiResponse);
        return;
      }

      const info = await qdrantService.getCollectionInfo(settings.slug, eventSlug || eventId);

      if (!info) {
        res.json({
          success: true,
          data: {
            eventId,
            indexed: false,
            vectorCount: 0,
          },
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: {
          eventId,
          indexed: true,
          vectorCount: info.vectorCount,
          indexedVectorCount: info.indexedVectorCount,
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
   * Get image statuses for an event.
   */
  async getEventImages(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { status } = req.query;

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
        where.eventSlug = eventId;
      }

      if (status === 'DELETED') {
        where.isActive = false;
      } else {
        where.isActive = true;
        if (status && status !== 'ALL') {
          where.status = status;
        }
      }

      const images = await prisma.eventImageStatus.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 1000,
      });

      // Calculate stats based on active/inactive
      // Re-use logic for identifying event (UUID vs Slug)
      const countWhere = isUuid ? { eventId } : { eventSlug: eventId };
      const baseWhere = { ...countWhere, isActive: true };

      const total = await prisma.eventImageStatus.count({ where: baseWhere });
      const completed = await prisma.eventImageStatus.count({ where: { ...baseWhere, status: 'COMPLETED' } });
      const failed = await prisma.eventImageStatus.count({ where: { ...baseWhere, status: 'FAILED' } });
      const processing = await prisma.eventImageStatus.count({ where: { ...baseWhere, status: 'PROCESSING' } });

      res.json({
        success: true,
        data: {
          stats: {
            total,
            completed,
            failed,
            processing,
          },
          images,
        },
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to get event images:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get event images',
      } as ApiResponse);
    }
  },
};

