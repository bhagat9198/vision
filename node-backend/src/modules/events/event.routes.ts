import { Router } from 'express';
import { eventController } from './event.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { createEventSchema, updateEventSchema, verifyPasswordSchema } from './event.dto.js';

const router = Router();

// Public routes
router.get('/public/:id', eventController.findPublicById);
router.post('/public/:id/verify-password', validate(verifyPasswordSchema), eventController.verifyPassword);

// Protected routes (authenticated photographer)
router.use(authenticate);

router.post('/', validate(createEventSchema), eventController.create);
router.get('/', eventController.findAll);
router.get('/:id', eventController.findById);
router.patch('/:id', validate(updateEventSchema), eventController.update);
router.delete('/:id', eventController.delete);

export { router as eventRouter };

