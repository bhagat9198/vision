/**
 * =============================================================================
 * Organization Routes
 * =============================================================================
 * Routes for organization management.
 * =============================================================================
 */

import { Router } from 'express';
import {
  registerOrg,
  getOrg,
  updateOrgSettings,
  deactivateOrg,
  listOrgs,
} from './org.controller.js';
import { requireMasterKey, requireOrgAuth } from '../../middleware/org-auth.js';

const router = Router();

// =============================================================================
// ROUTES
// =============================================================================

/**
 * @swagger
 * /orgs/register:
 *   post:
 *     summary: Register a new organization
 *     tags: [Organizations]
 *     security:
 *       - MasterKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: "My Photography Studio"
 *     responses:
 *       201:
 *         description: Organization registered successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Invalid master API key
 */
router.post('/register', requireMasterKey, registerOrg);

/**
 * @swagger
 * /orgs:
 *   get:
 *     summary: List all organizations (admin)
 *     tags: [Organizations]
 *     security:
 *       - MasterKeyAuth: []
 *     responses:
 *       200:
 *         description: List of organizations
 */
router.get('/', requireMasterKey, listOrgs);

/**
 * @swagger
 * /orgs/{id}:
 *   get:
 *     summary: Get organization details
 *     tags: [Organizations]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization details
 *       404:
 *         description: Organization not found
 */
router.get('/:id', requireOrgAuth, getOrg);

/**
 * @swagger
 * /orgs/{id}/settings:
 *   patch:
 *     summary: Update organization settings
 *     tags: [Organizations]
 *     security:
 *       - ApiKeyAuth: []
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
 *               comprefaceUrl:
 *                 type: string
 *               comprefaceRecognitionApiKey:
 *                 type: string
 *               minConfidence:
 *                 type: number
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.patch('/:id/settings', requireOrgAuth, updateOrgSettings);

/**
 * @swagger
 * /orgs/{id}:
 *   delete:
 *     summary: Deactivate organization
 *     tags: [Organizations]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization deactivated
 */
router.delete('/:id', requireOrgAuth, deactivateOrg);

export default router;

