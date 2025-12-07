import { Router } from 'express';
import { photographerController } from './photographer.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { updatePhotographerSchema } from './photographer.dto.js';

const router = Router();

// Protected routes (authenticated photographer)
router.get('/me', authenticate, photographerController.getProfile);
router.patch('/me', authenticate, validate(updatePhotographerSchema), photographerController.updateProfile);
router.get('/me/stats', authenticate, photographerController.getStats);

// Public routes (view photographer by ID)
router.get('/:id', photographerController.getById);

export { router as photographerRouter };

