import { Router } from 'express';
import { superAdminController } from './super-admin.controller.js';
import { superAdminDashboardController } from './super-admin-dashboard.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticateSuperAdmin } from '../../middleware/superAdmin.middleware.js';
import { superAdminSetupSchema, superAdminLoginSchema, superAdminChangePasswordSchema } from './super-admin.dto.js';

const router = Router();

// Public routes (no auth required)
router.get('/check', superAdminController.checkExists);
router.post('/setup', validate(superAdminSetupSchema), superAdminController.setup);
router.post('/login', validate(superAdminLoginSchema), superAdminController.login);

// Protected routes (requires super admin auth)
router.get('/profile', authenticateSuperAdmin, superAdminController.getProfile);
router.patch('/change-password', authenticateSuperAdmin, validate(superAdminChangePasswordSchema), superAdminController.changePassword);

// Dashboard routes
router.get('/dashboard/stats', authenticateSuperAdmin, superAdminDashboardController.getStats);
router.get('/photographers', authenticateSuperAdmin, superAdminDashboardController.getPhotographers);
router.patch('/photographers/:id/toggle-status', authenticateSuperAdmin, superAdminDashboardController.togglePhotographerStatus);

export { router as superAdminRouter };

