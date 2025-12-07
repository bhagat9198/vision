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
router.post('/init', validate(initUploadSchema), uploadController.initSession);

// Get session status (for polling)
// GET /uploads/:sessionId/status
router.get('/:sessionId/status', validate(sessionStatusQuerySchema, 'query'), uploadController.getSessionStatus);

// Upload a chunk
// PUT /uploads/:sessionId/files/:fileId/chunks/:chunkIndex
router.put(
  '/:sessionId/files/:fileId/chunks/:chunkIndex',
  upload.single('chunk'),
  uploadController.uploadChunk
);

// Complete file upload (all chunks received, ready for processing)
// POST /uploads/:sessionId/files/:fileId/complete
router.post('/:sessionId/files/:fileId/complete', uploadController.completeFileUpload);

// Get file upload info (for resume checking)
// GET /uploads/:sessionId/files/:fileId
router.get('/:sessionId/files/:fileId', uploadController.getFileUploadInfo);

// Retry failed files
// POST /uploads/:sessionId/retry
router.post('/:sessionId/retry', validate(retryFilesSchema), uploadController.retryFailedFiles);

export { router as uploadRouter };

