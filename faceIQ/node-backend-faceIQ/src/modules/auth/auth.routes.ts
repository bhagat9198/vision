import { Router } from 'express';
import { checkSetup, login, setup } from './auth.controller.js';

const router = Router();

router.get('/setup-status', checkSetup);
router.post('/setup', setup);
router.post('/login', login);

export { router as authRoutes };
