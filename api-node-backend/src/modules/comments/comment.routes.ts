import { Router } from 'express';
import { commentController } from './comment.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { createCommentSchema } from './comment.dto.js';

const router = Router();

// Public routes

/**
 * @swagger
 * /comments/photo/{photoId}:
 *   post:
 *     summary: Add a comment to a photo
 *     tags: [Comments]
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
 *             required: [content, authorName]
 *             properties:
 *               content: { type: string }
 *               authorName: { type: string }
 *     responses:
 *       201:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/photo/:photoId', validate(createCommentSchema), commentController.create);
/**
 * @swagger
 * /comments/photo/{photoId}:
 *   get:
 *     summary: List comments for a photo
 *     tags: [Comments]
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
router.get('/photo/:photoId', commentController.findByPhotoId);

// Protected routes (only photographer can delete)

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
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
 *         description: Comment deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/:id', authenticate, commentController.delete);

export { router as commentRouter };

