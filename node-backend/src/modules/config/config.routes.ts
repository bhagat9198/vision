import { Router } from 'express';
import { configController } from './config.controller.js';
import { authenticateSuperAdmin } from '../../middleware/superAdmin.middleware.js';

const router = Router();

// Public route - get auth settings for signup page (limited info)
router.get('/auth/public', configController.getPublicAuthConfig);

// All routes below require super admin auth
router.use(authenticateSuperAdmin);

// Auth config
router.get('/auth', configController.getAuthConfig);
router.patch('/auth', configController.updateAuthConfig);

// Enabled providers (for template dropdown)
router.get('/providers', configController.getEnabledProviders);

// Templates
router.get('/templates', configController.getTemplates);
router.post('/templates', configController.createTemplate);
router.patch('/templates/:id', configController.updateTemplate);
router.delete('/templates/:id', configController.deleteTemplate);

// Get all configs
router.get('/', configController.getAllConfigs);

export default router;

