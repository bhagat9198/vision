import { Router } from 'express';
import { albumController } from './album.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { createAlbumSchema, updateAlbumSchema, reorderAlbumsSchema } from './album.dto.js';

const router = Router();

// Public routes (for viewing albums)
router.get('/event/:eventId', optionalAuth, albumController.findByEventId);
router.get('/:id', optionalAuth, albumController.findById);

// Protected routes
router.post('/event/:eventId', authenticate, validate(createAlbumSchema), albumController.create);
router.patch('/:id', authenticate, validate(updateAlbumSchema), albumController.update);
router.delete('/:id', authenticate, albumController.delete);
router.put('/event/:eventId/reorder', authenticate, validate(reorderAlbumsSchema), albumController.reorder);

export { router as albumRouter };

