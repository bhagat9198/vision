import { Router } from 'express';
import { commentController } from './comment.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { createCommentSchema } from './comment.dto.js';

const router = Router();

// Public routes
router.post('/photo/:photoId', validate(createCommentSchema), commentController.create);
router.get('/photo/:photoId', commentController.findByPhotoId);

// Protected routes (only photographer can delete)
router.delete('/:id', authenticate, commentController.delete);

export { router as commentRouter };

