/**
 * =============================================================================
 * Search Routes
 * =============================================================================
 * Face search endpoints for finding matching photos.
 * =============================================================================
 */

import { Router, RequestHandler } from 'express';
import multer from 'multer';
import { searchController } from '../controllers/index.js';

const router = Router();

// Configure multer for selfie uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for selfies
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * @swagger
 * /api/v1/search:
 *   post:
 *     summary: Search for matching faces
 *     description: Upload a selfie image to find matching photos in an event
 *     tags: [Search]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [eventId, image]
 *             properties:
 *               eventId:
 *                 type: string
 *                 description: Event ID to search in
 *               topK:
 *                 type: integer
 *                 default: 50
 *                 description: Maximum number of results
 *               minSimilarity:
 *                 type: number
 *                 default: 0.6
 *                 description: Minimum similarity threshold (0-1)
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Selfie image to search with
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchSuccessResponse'
 *       400:
 *         description: No face detected in image
 *       401:
 *         description: Unauthorized
 */
router.post('/', upload.single('image') as unknown as RequestHandler, searchController.searchWithImage);

/**
 * @swagger
 * /api/v1/search/cached:
 *   post:
 *     summary: Search using cached embedding
 *     description: Search using a previously cached face embedding from a session
 *     tags: [Search]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, sessionId]
 *             properties:
 *               eventId:
 *                 type: string
 *               sessionId:
 *                 type: string
 *                 description: Session ID from previous search
 *               topK:
 *                 type: integer
 *                 default: 50
 *               minSimilarity:
 *                 type: number
 *                 default: 0.6
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchSuccessResponse'
 *       404:
 *         description: Session not found or expired
 */
router.post('/cached', searchController.searchWithCached);

/**
 * @swagger
 * /api/v1/search/session/{sessionId}:
 *   delete:
 *     summary: End a search session
 *     description: Delete cached embedding and end the session
 *     tags: [Search]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session ended
 */
router.delete('/session/:sessionId', searchController.endSession);

export { router as searchRoutes };

