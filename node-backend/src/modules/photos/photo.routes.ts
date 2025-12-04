import { Router } from 'express';
import { photoController } from './photo.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { createPhotoSchema, updatePhotoSchema, bulkCreatePhotosSchema, likePhotoSchema } from './photo.dto.js';

const router = Router();

// Public routes
router.get('/event/:eventId', optionalAuth, photoController.findByEventId);
router.get('/:id', optionalAuth, photoController.findById);
router.post('/:id/like', validate(likePhotoSchema), photoController.toggleLike);

// Protected routes
router.post('/album/:albumId', authenticate, validate(createPhotoSchema), photoController.create);
router.post('/album/:albumId/bulk', authenticate, validate(bulkCreatePhotosSchema), photoController.bulkCreate);
router.patch('/:id', authenticate, validate(updatePhotoSchema), photoController.update);
router.delete('/:id', authenticate, photoController.delete);

export { router as photoRouter };

