import { Router } from 'express';
import { eventController } from './event.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { createEventSchema, updateEventSchema, verifyPasswordSchema } from './event.dto.js';

const router = Router();

// Public routes

/**
 * @swagger
 * /events/public/{id}:
 *   get:
 *     summary: Get public event details by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 */
router.get('/public/:id', eventController.findPublicById);
/**
 * @swagger
 * /events/public/slug/{slug}:
 *   get:
 *     summary: Get public event details by slug
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 */
router.get('/public/slug/*', eventController.findPublicBySlug);
/**
 * @swagger
 * /events/{id}/verify-password:
 *   post:
 *     summary: Verify event password
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Password verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/:id/verify-password', validate(verifyPasswordSchema), eventController.verifyPassword);

// Protected routes (authenticated photographer)
router.use(authenticate);

router.use(authenticate);

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, date]
 *             properties:
 *               name: { type: string }
 *               date: { type: string, format: date-time }
 *               location: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Event created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 */
router.post('/', validate(createEventSchema), eventController.create);
/**
 * @swagger
 * /events:
 *   get:
 *     summary: List all events
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventListResponse'
 */
router.get('/', eventController.findAll);
/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Get event details
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 */
router.get('/:id', eventController.findById);
/**
 * @swagger
 * /events/{id}:
 *   patch:
 *     summary: Update an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               date: { type: string, format: date-time }
 *               location: { type: string }
 *     responses:
 *       200:
 *         description: Event updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 */
router.patch('/:id', validate(updateEventSchema), eventController.update);
/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/:id', eventController.delete);

export { router as eventRouter };

