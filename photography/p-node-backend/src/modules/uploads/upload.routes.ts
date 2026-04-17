import { Router } from 'express';
import multer from 'multer';
import { uploadController } from './upload.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { initUploadSchema, retryFilesSchema, sessionStatusQuerySchema } from './upload.dto.js';

const router = Router();

// Configure multer for chunk uploads (in memory for now)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max chunk size
  },
});

// All routes require authentication
router.use(authenticate);

// Initialize upload session
// POST /uploads/init

/**
 * @swagger
 * /uploads/init:
 *   post:
 *     summary: Initialize upload session
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [albumId, fileCount]
 *             properties:
 *               albumId: { type: string, format: uuid }
 *               fileCount: { type: integer }
 *     responses:
 *       201:
 *         description: Session initialized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId: { type: string }
 */
router.post('/init', validate(initUploadSchema), uploadController.initSession);

// Get session status (for polling)
// GET /uploads/:sessionId/status

/**
 * @swagger
 * /uploads/{sessionId}/status:
 *   get:
 *     summary: Get upload session status
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session status
 */
router.get('/:sessionId/status', validate(sessionStatusQuerySchema, 'query'), uploadController.getSessionStatus);

// Upload a chunk
// PUT /uploads/:sessionId/files/:fileId/chunks/:chunkIndex

/**
 * @swagger
 * /uploads/{sessionId}/files/{fileId}/chunks/{chunkIndex}:
 *   put:
 *     summary: Upload a file chunk
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: chunkIndex
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               chunk:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Chunk uploaded
 */
router.put(
  '/:sessionId/files/:fileId/chunks/:chunkIndex',
  upload.single('chunk'),
  uploadController.uploadChunk
);

// Complete file upload (all chunks received, ready for processing)
// POST /uploads/:sessionId/files/:fileId/complete

/**
 * @swagger
 * /uploads/{sessionId}/files/{fileId}/complete:
 *   post:
 *     summary: Complete file upload
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: File upload completed
 */
router.post('/:sessionId/files/:fileId/complete', uploadController.completeFileUpload);

// Get file upload info (for resume checking)
// GET /uploads/:sessionId/files/:fileId

/**
 * @swagger
 * /uploads/{sessionId}/files/{fileId}:
 *   get:
 *     summary: Get file upload info
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: File info
 */
router.get('/:sessionId/files/:fileId', uploadController.getFileUploadInfo);

// Retry failed files
// POST /uploads/:sessionId/retry

/**
 * @swagger
 * /uploads/{sessionId}/retry:
 *   post:
 *     summary: Retry failed file uploads
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileIds]
 *             properties:
 *               fileIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Retry initiated
 */
router.post('/:sessionId/retry', validate(retryFilesSchema), uploadController.retryFailedFiles);

export { router as uploadRouter };

