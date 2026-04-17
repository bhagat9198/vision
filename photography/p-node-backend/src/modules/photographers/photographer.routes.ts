import { Router } from 'express';
import { photographerController } from './photographer.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { updatePhotographerSchema } from './photographer.dto.js';

const router = Router();

// Protected routes (authenticated photographer)

/**
 * @swagger
 * /photographers/me:
 *   get:
 *     summary: Get current photographer profile
 *     tags: [Photographers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Photographer profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.get('/me', authenticate, photographerController.getProfile);
/**
 * @swagger
 * /photographers/me:
 *   patch:
 *     summary: Update photographer profile
 *     tags: [Photographers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               bio: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.patch('/me', authenticate, validate(updatePhotographerSchema), photographerController.updateProfile);
/**
 * @swagger
 * /photographers/me/stats:
 *   get:
 *     summary: Get photographer statistics
 *     tags: [Photographers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get('/me/stats', authenticate, photographerController.getStats);

// Public routes (view photographer by ID)

/**
 * @swagger
 * /photographers/{id}:
 *   get:
 *     summary: Get photographer public profile
 *     tags: [Photographers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Photographer profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.get('/:id', photographerController.getById);

export { router as photographerRouter };

