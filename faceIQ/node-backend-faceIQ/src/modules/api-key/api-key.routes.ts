/**
 * =============================================================================
 * API Key Routes
 * =============================================================================
 * Routes for API key management.
 * =============================================================================
 */

import { Router } from 'express';
import { createApiKey, listApiKeys, revokeApiKey } from './api-key.controller.js';
import { requireOrgAuth } from '../../middleware/org-auth.js';

const router = Router({ mergeParams: true });

// =============================================================================
// ROUTES
// =============================================================================

/**
 * @swagger
 * /orgs/{orgId}/api-keys:
 *   post:
 *     summary: Create a new API key
 *     tags: [API Keys]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Production Key"
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: API key created
 */
router.post('/', requireOrgAuth, createApiKey);

/**
 * @swagger
 * /orgs/{orgId}/api-keys:
 *   get:
 *     summary: List all API keys for organization
 *     tags: [API Keys]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of API keys
 */
router.get('/', requireOrgAuth, listApiKeys);

/**
 * @swagger
 * /orgs/{orgId}/api-keys/{keyId}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [API Keys]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key revoked
 */
router.delete('/:keyId', requireOrgAuth, revokeApiKey);

export default router;

