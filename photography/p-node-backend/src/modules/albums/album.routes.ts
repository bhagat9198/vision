import { Router } from 'express';
import { albumController } from './album.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { createAlbumSchema, updateAlbumSchema, reorderAlbumsSchema } from './album.dto.js';

const router = Router();

// Public routes (for viewing albums)
// Public routes (for viewing albums)

/**
 * @swagger
 * /albums/event/{eventId}:
 *   get:
 *     summary: List albums for an event
 *     tags: [Albums]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of albums
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AlbumListResponse'
 */
router.get('/event/:eventId', optionalAuth, albumController.findByEventId);
/**
 * @swagger
 * /albums/{id}:
 *   get:
 *     summary: Get album details
 *     tags: [Albums]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Album details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AlbumResponse'
 */
router.get('/:id', optionalAuth, albumController.findById);

// Protected routes
// Protected routes

/**
 * @swagger
 * /albums/event/{eventId}:
 *   post:
 *     summary: Create a new album
 *     tags: [Albums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Album created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AlbumResponse'
 */
router.post('/event/:eventId', authenticate, validate(createAlbumSchema), albumController.create);
/**
 * @swagger
 * /albums/{id}:
 *   patch:
 *     summary: Update an album
 *     tags: [Albums]
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
 *     responses:
 *       200:
 *         description: Album updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AlbumResponse'
 */
router.patch('/:id', authenticate, validate(updateAlbumSchema), albumController.update);
/**
 * @swagger
 * /albums/{id}:
 *   delete:
 *     summary: Delete an album
 *     tags: [Albums]
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
 *         description: Album deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/:id', authenticate, albumController.delete);
/**
 * @swagger
 * /albums/event/{eventId}/reorder:
 *   put:
 *     summary: Reorder albums in an event
 *     tags: [Albums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [albumIds]
 *             properties:
 *               albumIds: 
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Albums reordered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.put('/event/:eventId/reorder', authenticate, validate(reorderAlbumsSchema), albumController.reorder);

export { router as albumRouter };

