/**
 * =============================================================================
 * Index Routes
 * =============================================================================
 * Photo indexing endpoints for face detection and embedding storage.
 * =============================================================================
 */

import { Router, RequestHandler } from 'express';
import multer from 'multer';
import { indexController } from '../controllers/index.js';
import { imagesController } from '../controllers/images.controller.js';
import { requireOrgSettings } from '../middleware/org-auth.js';

const router = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  },
  fileFilter: (_req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Settings required for indexing operations
const requireCompreFace = requireOrgSettings('comprefaceUrl', 'comprefaceRecognitionApiKey');

/**
 * @swagger
 * /api/v1/index/photo:
 *   post:
 *     summary: Index a single photo
 *     description: Detect faces in a photo and store embeddings for search
 *     tags: [Indexing]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [photoId, eventId]
 *             properties:
 *               photoId:
 *                 type: string
 *                 description: Unique photo ID
 *               eventId:
 *                 type: string
 *                 description: Event ID this photo belongs to
 *               imageUrl:
 *                 type: string
 *                 description: URL to fetch image (for URL mode)
 *               imagePath:
 *                 type: string
 *                 description: Path to image (for shared storage mode)
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (optional)
 *     responses:
 *       200:
 *         description: Photo indexed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IndexPhotoResponse'
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/photo', requireCompreFace, upload.single('image') as unknown as RequestHandler, indexController.indexPhoto);

/**
 * @swagger
 * /api/v1/index/photo/{photoId}:
 *   delete:
 *     summary: Delete indexed faces for a photo
 *     tags: [Indexing]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Faces deleted
 */
router.delete('/photo/:photoId', requireCompreFace, indexController.deletePhoto);

/**
 * @swagger
 * /api/v1/index/event/{eventId}:
 *   delete:
 *     summary: Delete all indexed faces for an event
 *     tags: [Indexing]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All faces for event deleted
 */
router.delete('/event/:eventId', indexController.deleteEvent);

/**
 * @swagger
 * /api/v1/index/event:
 *   post:
 *     summary: Create an event collection explicitly
 *     tags: [Indexing]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId]
 *             properties:
 *               eventId:
 *                 type: string
 *               eventSlug:
 *                 type: string
 *     responses:
 *       200:
 *         description: Collection created
 */
router.post('/event', requireCompreFace, indexController.createEvent);

/**
 * @swagger
 * /api/v1/index/video:
 *   post:
 *     summary: Index a video file
 *     tags: [Indexing]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [videoId, eventId, videoPath]
 *             properties:
 *               videoId:
 *                 type: string
 *               eventId:
 *                 type: string
 *               videoPath:
 *                 type: string
 *     responses:
 *       200:
 *         description: Video queued
 */
router.post('/video', requireCompreFace, indexController.indexVideo);

/**
 * @swagger
 * /api/v1/index/video/{videoId}:
 *   delete:
 *     summary: Delete a video and its frames
 *     tags: [Indexing]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Video deleted
 */
router.delete('/video/:videoId', indexController.deleteVideo);

/**
 * @swagger
 * /api/v1/index/event/{eventId}/stats:
 *   get:
 *     summary: Get indexing statistics for an event
 *     tags: [Indexing]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *         description: Event statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventStatsResponse'
 */
router.get('/event/:eventId/stats', indexController.getEventStats);

/**
 * @swagger
 * /api/v1/index/event/{eventId}/images:
 *   get:
 *     summary: Get indexing status for event images
 *     tags: [Indexing]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *     responses:
 *       200:
 *         description: List of images with status
 */
/**
 * @swagger
 * /api/v1/index/event/{eventId}/videos:
 *   get:
 *     summary: Get videos for an event
 *     tags: [Indexing]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of videos
 */
router.get('/event/:eventId/videos', indexController.getEventVideos);


router.get('/event/:eventId/images', indexController.getEventImages);

/**
 * @swagger
 * /api/v1/index/images/view/{photoId}:
 *   get:
 *     summary: View a served image
 *     tags: [Indexing]
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image file
 */
router.get('/images/view/:photoId', imagesController.viewImage);

export { router as indexRoutes };

