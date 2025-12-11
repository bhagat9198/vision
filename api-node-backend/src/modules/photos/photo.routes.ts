import { Router } from 'express';
import { photoController } from './photo.controller.js';
import { commentController } from '../comments/comment.controller.js';
import { createCommentSchema } from '../comments/comment.dto.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { createPhotoSchema, updatePhotoSchema, bulkCreatePhotosSchema, likePhotoSchema } from './photo.dto.js';

const router = Router();

// Public routes

/**
 * @swagger
 * /photos/event/{eventId}:
 *   get:
 *     summary: List photos for an event
 *     tags: [Photos]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of photos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhotoListResponse'
 */
router.get('/event/:eventId', optionalAuth, photoController.findByEventId);
/**
 * @swagger
 * /photos/{id}:
 *   get:
 *     summary: Get photo details
 *     tags: [Photos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Photo details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhotoResponse'
 */
router.get('/:id', optionalAuth, photoController.findById);
/**
 * @swagger
 * /photos/{id}/like:
 *   post:
 *     summary: Toggle like on a photo
 *     tags: [Photos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Photo like toggled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/:id/like', validate(likePhotoSchema), photoController.toggleLike);
/**
 * @swagger
 * /photos/{id}/favorite:
 *   post:
 *     summary: Toggle favorite on a photo
 *     tags: [Photos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Photo favorite toggled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

router.post('/:id/favorite', validate(likePhotoSchema), photoController.toggleFavorite);

/**
 * @swagger
 * /photos/{photoId}/comments:
 *   post:
 *     summary: Add a comment to a photo
 *     tags: [Photos]
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text, userName]
 *             properties:
 *               text: { type: string }
 *               userName: { type: string }
 *     responses:
 *       201:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/:photoId/comments', optionalAuth, validate(createCommentSchema), commentController.create);

/**
 * @swagger
 * /photos/{photoId}/comments:
 *   get:
 *     summary: List comments for a photo
 *     tags: [Photos]
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentListResponse'
 */
router.get('/:photoId/comments', commentController.findByPhotoId);

/**
 * @swagger
 * /photos/me/likes:
 *   get:
 *     summary: Get my liked photos
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of liked photos
 */
router.get('/me/likes', authenticate, photoController.getMyLikes);

/**
 * @swagger
 * /photos/me/favorites:
 *   get:
 *     summary: Get my favorite photos
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite photos
 */
router.get('/me/favorites', authenticate, photoController.getMyFavorites);

// Protected routes

/**
 * @swagger
 * /photos/album/{albumId}:
 *   post:
 *     summary: Create a new photo
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: albumId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url: { type: string }
 *     responses:
 *       201:
 *         description: Photo created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhotoResponse'
 */
router.post('/album/:albumId', authenticate, validate(createPhotoSchema), photoController.create);
/**
 * @swagger
 * /photos/album/{albumId}/bulk:
 *   post:
 *     summary: Bulk create photos
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: albumId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [photos]
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [url]
 *                   properties:
 *                     url: { type: string }
 *     responses:
 *       201:
 *         description: Photos created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/album/:albumId/bulk', authenticate, validate(bulkCreatePhotosSchema), photoController.bulkCreate);
/**
 * @swagger
 * /photos/{id}:
 *   patch:
 *     summary: Update a photo
 *     tags: [Photos]
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
 *               url: { type: string }
 *     responses:
 *       200:
 *         description: Photo updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhotoResponse'
 */
router.patch('/:id', authenticate, validate(updatePhotoSchema), photoController.update);
/**
 * @swagger
 * /photos/{id}:
 *   delete:
 *     summary: Delete a photo
 *     tags: [Photos]
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
 *         description: Photo deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/:id', authenticate, photoController.delete);

export { router as photoRouter };

