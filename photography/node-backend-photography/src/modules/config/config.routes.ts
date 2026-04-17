import { Router } from 'express';
import { configController } from './config.controller.js';
import { authenticateSuperAdmin } from '../../middleware/superAdmin.middleware.js';
import { validateInternalKey } from '../../middleware/internalKey.middleware.js';

const router = Router();

// Public route - get auth settings for signup page (limited info)

/**
 * @swagger
 * /config/auth/public:
 *   get:
 *     summary: Get public auth configuration
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Public auth config
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get('/auth/public', configController.getPublicAuthConfig);

// Internal route - face analysis config for img-analyse-backend
// Uses internal key authentication instead of super admin

/**
 * @swagger
 * /config/face-analysis:
 *   get:
 *     summary: Get face analysis configuration (Internal)
 *     tags: [Config]
 *     security:
 *       - internalKey: []
 *     responses:
 *       200:
 *         description: Face analysis config
 */
router.get('/face-analysis', validateInternalKey, configController.getFaceAnalysisConfig as unknown as RequestHandler);

// All routes below require super admin auth
router.use(authenticateSuperAdmin);

// Auth config

/**
 * @swagger
 * /config/auth:
 *   get:
 *     summary: Get auth configuration (Admin)
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Auth config
 */
router.get('/auth', configController.getAuthConfig);

/**
 * @swagger
 * /config/auth:
 *   patch:
 *     summary: Update auth configuration (Admin)
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthConfig'
 *     responses:
 *       200:
 *         description: Config updated
 */
router.patch('/auth', configController.updateAuthConfig);

/**
 * @swagger
 * /config/test-face-analysis:
 *   get:
 *     summary: Test face analysis backend connection (Admin)
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection test result
 */
router.get('/test-face-analysis', configController.testFaceAnalysisConnection);

// Enabled providers (for template dropdown)
router.get('/providers', configController.getEnabledProviders);

// Templates

/**
 * @swagger
 * /config/templates:
 *   get:
 *     summary: List email templates
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of templates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TemplateListResponse'
 */
router.get('/templates', configController.getTemplates);

/**
 * @swagger
 * /config/templates:
 *   post:
 *     summary: Create email template
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Template'
 *     responses:
 *       201:
 *         description: Template created
 */
router.post('/templates', configController.createTemplate);

/**
 * @swagger
 * /config/templates/{id}:
 *   patch:
 *     summary: Update email template
 *     tags: [Config]
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
 *             $ref: '#/components/schemas/Template'
 *     responses:
 *       200:
 *         description: Template updated
 */
router.patch('/templates/:id', configController.updateTemplate);

/**
 * @swagger
 * /config/templates/{id}:
 *   delete:
 *     summary: Delete email template
 *     tags: [Config]
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
 *         description: Template deleted
 */
router.delete('/templates/:id', configController.deleteTemplate);

// Get all configs
router.get('/', configController.getAllConfigs);

export default router;

