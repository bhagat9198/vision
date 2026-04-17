import { Router } from 'express';
import { superAdminController } from './super-admin.controller.js';
import { superAdminDashboardController } from './super-admin-dashboard.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticateSuperAdmin } from '../../middleware/superAdmin.middleware.js';
import { superAdminSetupSchema, superAdminLoginSchema, superAdminChangePasswordSchema } from './super-admin.dto.js';

const router = Router();

// Public routes (no auth required)

/**
 * @swagger
 * /super-admin/check:
 *   get:
 *     summary: Check if super admin exists
 *     tags: [Super Admin]
 *     responses:
 *       200:
 *         description: Check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists: { type: boolean }
 */
router.get('/check', superAdminController.checkExists);

/**
 * @swagger
 * /super-admin/setup:
 *   post:
 *     summary: Setup super admin
 *     tags: [Super Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Super admin created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/setup', validate(superAdminSetupSchema), superAdminController.setup);

/**
 * @swagger
 * /super-admin/login:
 *   post:
 *     summary: Super admin login
 *     tags: [Super Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/login', validate(superAdminLoginSchema), superAdminController.login);

// Protected routes (requires super admin auth)

/**
 * @swagger
 * /super-admin/profile:
 *   get:
 *     summary: Get super admin profile
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.get('/profile', authenticateSuperAdmin, superAdminController.getProfile);

/**
 * @swagger
 * /super-admin/change-password:
 *   patch:
 *     summary: Change super admin password
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password changed
 */
router.patch('/change-password', authenticateSuperAdmin, validate(superAdminChangePasswordSchema), superAdminController.changePassword);

// Dashboard routes

/**
 * @swagger
 * /super-admin/dashboard/stats:
 *   get:
 *     summary: Get dashboard stats
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/dashboard/stats', authenticateSuperAdmin, superAdminDashboardController.getStats);

/**
 * @swagger
 * /super-admin/photographers:
 *   get:
 *     summary: List photographers
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of photographers
 */
router.get('/photographers', authenticateSuperAdmin, superAdminDashboardController.getPhotographers);

/**
 * @swagger
 * /super-admin/photographers/{id}/toggle-status:
 *   patch:
 *     summary: Toggle photographer status
 *     tags: [Super Admin]
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
 *         description: Status updated
 */
router.patch('/photographers/:id/toggle-status', authenticateSuperAdmin, superAdminDashboardController.togglePhotographerStatus);

/**
 * @swagger
 * /super-admin/photographers/{id}:
 *   get:
 *     summary: Get photographer details
 *     tags: [Super Admin]
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
 *         description: Photographer details
 */
router.get('/photographers/:id', authenticateSuperAdmin, superAdminDashboardController.getPhotographer);

/**
 * @swagger
 * /super-admin/events:
 *   get:
 *     summary: List events (admin view)
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of events
 */
router.get('/events', authenticateSuperAdmin, superAdminDashboardController.getEvents);

/**
 * @swagger
 * /super-admin/events/{id}:
 *   get:
 *     summary: Get event details (admin view)
 *     tags: [Super Admin]
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
 */
router.get('/events/:id', authenticateSuperAdmin, superAdminDashboardController.getEvent);

export { router as superAdminRouter };

