/**
 * =============================================================================
 * Health Routes
 * =============================================================================
 * Health check endpoints for monitoring and orchestration.
 * =============================================================================
 */

import { Router } from 'express';
import { healthController } from '../controllers/index.js';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 timestamp: { type: string, format: date-time }
 */
router.get('/', healthController.ping);

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check with dependency status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: All dependencies healthy
 *       503:
 *         description: One or more dependencies unhealthy
 */
router.get('/detailed', healthController.detailed);

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Kubernetes readiness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready to accept traffic
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', healthController.ready);

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Kubernetes liveness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', healthController.live);

export { router as healthRoutes };

