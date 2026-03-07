/**
 * =============================================================================
 * Global Settings Routes
 * =============================================================================
 * Routes for managing system-wide default settings.
 * =============================================================================
 */

import { Router } from 'express';
import { getGlobalSettings, updateGlobalSettings } from './global-settings.controller.js';

const router = Router();

/**
 * @swagger
 * /settings/global:
 *   get:
 *     summary: Get global default settings
 *     tags: [Settings]
 *     security:
 *       - AuthToken: []
 *     responses:
 *       200:
 *         description: Global settings retrieved successfully
 */
router.get('/', getGlobalSettings);

/**
 * @swagger
 * /settings/global:
 *   put:
 *     summary: Update global default settings
 *     tags: [Settings]
 *     security:
 *       - AuthToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Global settings updated successfully
 */
router.put('/', updateGlobalSettings);

export default router;
